# PDP-10 Web Console

Web-based access to PDP-10 simulation (ITS) - Knight TV display and telnet terminals.

## Architecture

```
[Browser]
    |
    +-- /ws/tv11    <--WS--> [pdp10-proxy] <--TCP--> [tv11:11100]
    +-- /ws/console <--WS--> [pdp10-proxy] <--TCP--> [telnet:1025]
    +-- /ws/term0   <--WS--> [pdp10-proxy] <--TCP--> [telnet:10018]
```

- **proxy/**: Rust WebSocket-to-TCP proxy with telnet IAC handling
- **web/**: TypeScript + Vite client

## Proxy

Multi-target WebSocket to TCP proxy.

```sh
cd proxy
cargo build --release
./target/release/pdp10-proxy -p 8080 \
  -t tv11:raw:pidp10.lan:11100 \
  -t console:telnet:pidp10.lan:1025 \
  -t term0:telnet:pidp10.lan:10018
```

Target format: `-t NAME:TYPE:HOST:PORT`
- `NAME`: URL path identifier (`/ws/NAME`)
- `TYPE`: `raw` (direct passthrough) or `telnet` (IAC handling, 80x24 NAWS)
- `HOST:PORT`: Backend address

## Web Client

```sh
cd web
npm install
npm run dev      # dev server on :5173
npm run build    # production build
```

Dev server proxies `/ws/*` to localhost:8080.

## Knight TV Controls

| Key | Function |
|-----|----------|
| F1 | CALL (login) |
| F2 | ESC |
| F3 | NEXT/BACK |
| F4 | CLEAR |
| F8/F11 | Toggle fullscreen |
| F12 | BREAK |
| Escape | ALT MODE |
| Backspace | RUBOUT |

## Preview Image

The connect screen shows a grey preview of the terminal. To update it:

1. Connect to the terminal
2. Open browser console (F12)
3. Run `exportFB()`
4. Move downloaded `preview.bin` to `web/public/`


## Thanks

* [tv11](https://github.com/aap/pdp11) - the web implementation of the knight tv terminal is based on tvcon
