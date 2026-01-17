# PDP-10 Web Console

This is a little web based console for quick access to an emulated PDP-10
system. I mainly intend to use it on my
[PiDP-10](https://obsolescence.wixsite.com/obsolescence/pidp10) PDP-10 replica
for quick operations, like accessing the ITS console for bootup and shutdown
operations.

**The code is heavily LLM generated, use with caution!**

## Quick Start

### Proxy

Multi-target WebSocket to TCP proxy.

```sh
cd proxy
cargo build --release
./target/release/pdp10-proxy -p 11133 \
  -t tv11:raw:192.168.0.10:11100 \
  -t console:telnet:192.168.0.10:1025 \
  -t term0:telnet:192.168.0.10:10018
```

Target format: `-t NAME:TYPE:HOST:PORT`
- `NAME`: URL path identifier (`/ws/NAME`)
- `TYPE`: `raw` (direct passthrough) or `telnet` (IAC handling, 80x24 NAWS)
- `HOST:PORT`: Backend address

### Web Client

```sh
cd web
npm install
npm run dev      # dev server on :5173
npm run build    # production build
```

Dev server proxies `/ws/*` to localhost:11133.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Terminal Emulators

### Knight TV

The Knight TV terminal is directly based on the *tvcon* client,
part of the [tv11](https://github.com/aap/pdp11) emulator project.

To use the terminal emulator client, the tv11 emulator needs to be running
and connected to the simh emulator, and listening to incoming tvcon
connections on port 11100.

In the PiDP-10 replica setup, tv11 is normally started as part of the simh
boot process as seen
[here](https://github.com/obsolescence/pidp10/blob/master/systems/its/boot.pidp#L25).

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │             │    │    tv11     │    │    simh     │
│(Web Client) │◄──►│ pdp10-proxy │◄──►│ (Knight TV) │◄──►│  (PDP-10    │
│             │ WS │             │TCP │             │TCP │  emulator)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Generic VTxxx Terminal

The web console also provides generic vt100ish terminal emulators for
connecting to the console or serial ports of the simh emulator.

This terminal doesn't attempt to implement any sort of authentic period
correct experience, it's just a simple terminal implementation utilizing
[xterm.js](https://xtermjs.org/).

The ports we are connecting to are normally configured like this in the
PiDP-10 simh configuration:

```
; console terminal
set cons -u telnet=1025
; additional terminals
at -u mty line=9,10018 speed=9600
at -u mty line=8,10017 speed=9600
```

## Deployment using nginx

Build the web client:

```sh
cd web
npm run build
cp -r dist /opt/pdp10-web   # or wherever you prefer
```

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name _;

    root /opt/pdp10-web;    # path to your dist folder
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket proxy to pdp10-proxy
    location /ws {
        proxy_pass http://localhost:11133;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

For subpath deployment (e.g., `/pdp10/`), build with:

```sh
BASE_PATH=/pdp10/ npm run build
```

## Thanks

* [PDP-10 Simh](https://github.com/rcornwell/sims) - Richard Cornwell's PDP-10 emulator
* [its](https://github.com/PDP-10/its) - ITS reconstruction project
* [PiDP-10](https://obsolescence.dev/pdp10.html) - PiDP-10
* [tv11](https://github.com/aap/pdp11) - the web implementation of the knight tv terminal is based on tvcon
