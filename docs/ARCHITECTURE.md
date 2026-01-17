# Architecture

## Overview

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

The proxy (`pdp10-proxy`) bridges WebSocket connections from the browser to TCP backends. It supports two modes:

### Raw Mode

Direct byte passthrough for the TV11 protocol. No transformation of data.

### Telnet Mode

Handles telnet IAC (Interpret As Command) sequences:
- Strips IAC commands from data sent to browser
- Auto-negotiates terminal options (ECHO, SGA, binary mode)
- Responds to NAWS (window size) requests with 80x24

## TV11 Protocol

The Knight TV terminal uses a simple binary protocol over TCP. All values are little-endian.

### Message Format

```
┌──────────┬──────────┬─────────────────┐
│ len (u16)│ type (u8)│ payload         │
└──────────┴──────────┴─────────────────┘
```

### Message Types

| Type | Name   | Direction | Description |
|------|--------|-----------|-------------|
| 0    | KEYDN  | C→S       | Key press with modifier bits |
| 1    | GETFB  | C→S       | Request framebuffer region |
| 2    | FB     | S→C       | Framebuffer data (packed 1-bit pixels) |
| 3    | WD     | S→C       | Single word update (16 pixels) |
| 4    | CLOSE  | S→C       | Server closing connection |

### Framebuffer

- Resolution: 576 x 454 pixels
- Format: 1-bit packed, 16 pixels per word, MSB first
- Total size: 32,688 bytes

### Keyboard

Key codes use the Knight keyboard encoding with modifier bits:

| Bit    | Modifier |
|--------|----------|
| 0o100  | Right Shift |
| 0o200  | Left Shift |
| 0o400  | Right Top |
| 0o1000 | Left Top |
| 0o2000 | Right Ctrl |
| 0o4000 | Left Ctrl |
| 0o10000| Right Meta |
| 0o20000| Left Meta |
| 0o40000| Shift Lock |

## Web Client

### Components

| File | Purpose |
|------|---------|
| `main.ts` | App entry, tab/connection management |
| `connection.ts` | TV11 WebSocket client, message framing |
| `display.ts` | Canvas rendering, framebuffer unpacking |
| `keyboard.ts` | Physical keyboard → Knight scancode mapping |
| `protocol.ts` | TV11 message builders/parsers |
| `virtual-keyboard.ts` | On-screen keyboard component |
| `kle-parser.ts` | Keyboard Layout Editor JSON parser |
| `terminal/` | xterm.js wrapper for VTxxx terminals |

### Virtual Keyboards

Keyboard layouts are defined in a hybrid format combining:
- [Keyboard Layout Editor](http://www.keyboard-layout-editor.com/) JSON for visual layout
- Parallel array of key definitions (scancodes, escape sequences)

This allows importing KLE layouts directly while adding the functional mappings separately.
