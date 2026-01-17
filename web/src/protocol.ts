// TV11 protocol constants and helpers

export const WIDTH = 576;
export const HEIGHT = 454;

// Message types
export const MSG_KEYDN = 0;
export const MSG_GETFB = 1;
export const MSG_FB = 2;
export const MSG_WD = 3;
export const MSG_CLOSE = 4;

// Initial handshake size (getdpykbd)
export const HANDSHAKE_SIZE = 2;

// Read 16-bit little-endian value from buffer
export function readU16(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

// Write 16-bit little-endian value to buffer
export function writeU16(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

// Build MSG_GETFB request for full screen
export function buildGetFB(): Uint8Array {
  const buf = new Uint8Array(11);
  writeU16(buf, 0, 9); // length: type(1) + x,y,w,h(8)
  buf[2] = MSG_GETFB;
  writeU16(buf, 3, 0);      // x
  writeU16(buf, 5, 0);      // y
  writeU16(buf, 7, WIDTH);  // w
  writeU16(buf, 9, HEIGHT); // h
  return buf;
}

// Build MSG_KEYDN message
export function buildKeyDown(code: number): Uint8Array {
  const buf = new Uint8Array(5);
  writeU16(buf, 0, 3); // length: type(1) + keycode(2)
  buf[2] = MSG_KEYDN;
  writeU16(buf, 3, code);
  return buf;
}

// Parse MSG_FB payload, returns { x, y, w, h, packed }
export function parseFB(payload: Uint8Array): { x: number; y: number; w: number; h: number; packed: Uint8Array } {
  return {
    x: readU16(payload, 0) * 16,  // x is in word units
    y: readU16(payload, 2),
    w: readU16(payload, 4) * 16,  // w is in word units
    h: readU16(payload, 6),
    packed: payload.slice(8),
  };
}

// Parse MSG_WD payload, returns { addr, word }
export function parseWD(payload: Uint8Array): { addr: number; word: number } {
  return {
    addr: readU16(payload, 0),
    word: readU16(payload, 2),
  };
}
