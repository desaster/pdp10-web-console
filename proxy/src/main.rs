mod target;
mod telnet;

use anyhow::{anyhow, Result};
use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tokio_tungstenite::{
    accept_hdr_async,
    tungstenite::{
        handshake::server::{Request, Response},
        Message,
    },
};

use target::{Target, TargetRegistry, TargetType};
use telnet::TelnetHandler;

#[derive(Parser)]
#[command(name = "pdp10-proxy")]
#[command(about = "WebSocket to TCP proxy for PDP-10 simulation access")]
struct Args {
    /// WebSocket listen port
    #[arg(short, long, default_value = "8080")]
    port: u16,

    /// Target definition: NAME:TYPE:HOST:PORT
    /// TYPE is 'raw' (direct passthrough) or 'telnet' (with IAC handling)
    /// Example: -t tv11:raw:localhost:11100 -t console:telnet:localhost:1025
    #[arg(short, long = "target", value_name = "TARGET")]
    targets: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Build target registry
    let mut registry = TargetRegistry::new();
    for target_str in &args.targets {
        let target = Target::parse(target_str)?;
        println!("  {} ({:?}) -> {}", target.name, target.target_type, target.address);
        registry.add(target);
    }

    if registry.is_empty() {
        eprintln!("Warning: No targets configured. Use -t NAME:TYPE:HOST:PORT to add targets.");
    }

    let registry = Arc::new(registry);
    let addr = format!("0.0.0.0:{}", args.port);
    let listener = TcpListener::bind(&addr).await?;
    println!("Listening on {}", addr);

    while let Ok((stream, peer)) = listener.accept().await {
        let registry = registry.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, registry).await {
                eprintln!("{}: error: {}", peer, e);
            }
        });
    }

    Ok(())
}

async fn handle_connection(stream: TcpStream, registry: Arc<TargetRegistry>) -> Result<()> {
    let peer = stream.peer_addr()?;

    // Extract path during WebSocket handshake
    let mut requested_path = String::new();
    let callback = |req: &Request, resp: Response| {
        requested_path = req.uri().path().to_string();
        Ok(resp)
    };

    let ws = accept_hdr_async(stream, callback).await?;

    // Parse path: /ws/{target_name}
    let target_name = requested_path
        .strip_prefix("/ws/")
        .ok_or_else(|| anyhow!("Invalid path '{}', expected /ws/{{target}}", requested_path))?;

    let target = registry
        .get(target_name)
        .ok_or_else(|| anyhow!("Unknown target '{}'", target_name))?;

    println!("{}: connected to {} ({})", peer, target.name, target.address);

    // Connect to backend
    let tcp = TcpStream::connect(&target.address).await?;

    match target.target_type {
        TargetType::Raw => handle_raw(ws, tcp, peer).await,
        TargetType::Telnet => handle_telnet(ws, tcp, peer).await,
    }?;

    println!("{}: disconnected", peer);
    Ok(())
}

/// Raw passthrough - no protocol handling
async fn handle_raw(
    ws: tokio_tungstenite::WebSocketStream<TcpStream>,
    tcp: TcpStream,
    _peer: std::net::SocketAddr,
) -> Result<()> {
    let (mut ws_tx, mut ws_rx) = ws.split();
    let (mut tcp_rx, mut tcp_tx) = tcp.into_split();

    let ws_to_tcp = async {
        while let Some(msg) = ws_rx.next().await {
            match msg? {
                Message::Binary(data) => tcp_tx.write_all(&data).await?,
                Message::Close(_) => break,
                _ => {}
            }
        }
        Ok::<_, anyhow::Error>(())
    };

    let tcp_to_ws = async {
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            let n = tcp_rx.read(&mut buf).await?;
            if n == 0 {
                break;
            }
            ws_tx.send(Message::Binary(buf[..n].to_vec())).await?;
        }
        Ok::<_, anyhow::Error>(())
    };

    tokio::select! {
        r = ws_to_tcp => r?,
        r = tcp_to_ws => r?,
    }
    Ok(())
}

/// Telnet connection with IAC handling
async fn handle_telnet(
    ws: tokio_tungstenite::WebSocketStream<TcpStream>,
    tcp: TcpStream,
    _peer: std::net::SocketAddr,
) -> Result<()> {
    let (mut ws_tx, mut ws_rx) = ws.split();
    let (mut tcp_rx, tcp_tx) = tcp.into_split();
    let tcp_tx = Arc::new(Mutex::new(tcp_tx));

    // WebSocket to TCP: pass through (client doesn't send IAC)
    let tcp_tx_clone = tcp_tx.clone();
    let ws_to_tcp = async move {
        while let Some(msg) = ws_rx.next().await {
            match msg? {
                Message::Binary(data) => {
                    tcp_tx_clone.lock().await.write_all(&data).await?;
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
        Ok::<_, anyhow::Error>(())
    };

    // TCP to WebSocket: process telnet IAC sequences
    let tcp_to_ws = async move {
        let mut handler = TelnetHandler::new();
        let mut buf = vec![0u8; 64 * 1024];

        loop {
            let n = tcp_rx.read(&mut buf).await?;
            if n == 0 {
                break;
            }

            let (clean_data, responses) = handler.process(&buf[..n]);

            // Send any telnet responses back to server
            if !responses.is_empty() {
                tcp_tx.lock().await.write_all(&responses).await?;
            }

            // Forward clean data to browser
            if !clean_data.is_empty() {
                ws_tx.send(Message::Binary(clean_data)).await?;
            }
        }
        Ok::<_, anyhow::Error>(())
    };

    tokio::select! {
        r = ws_to_tcp => r?,
        r = tcp_to_ws => r?,
    }
    Ok(())
}
