//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// WebSocket connection management

import {
  MSG_FB,
  MSG_WD,
  MSG_CLOSE,
  HANDSHAKE_SIZE,
  buildGetFB,
  buildKeyDown,
  parseFB,
  parseWD,
  readU16,
} from './protocol';

export interface ConnectionCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (msg: string) => void;
  onFB: (x: number, y: number, w: number, h: number, packed: Uint8Array) => void;
  onWD: (addr: number, word: number) => void;
}

export class Connection {
  private ws: WebSocket | null = null;
  private recvBuf = new Uint8Array(0);
  private gotHandshake = false;
  private callbacks: ConnectionCallbacks;

  constructor(callbacks: ConnectionCallbacks) {
    this.callbacks = callbacks;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.gotHandshake;
  }

  connect(): void {
    this.cleanup();
    this.gotHandshake = false;
    this.recvBuf = new Uint8Array(0);

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = import.meta.env.BASE_URL || '/';
    this.ws = new WebSocket(`${proto}//${location.host}${basePath}ws/tv11`);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onmessage = (e) => {
      this.appendToBuffer(new Uint8Array(e.data));
      this.processBuffer();
    };

    this.ws.onclose = () => {
      this.callbacks.onDisconnect();
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Connection error');
    };
  }

  disconnect(): void {
    this.cleanup();
  }

  sendKey(code: number): void {
    if (this.isConnected && this.ws) {
      this.ws.send(buildKeyDown(code));
    }
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private appendToBuffer(data: Uint8Array): void {
    const newBuf = new Uint8Array(this.recvBuf.length + data.length);
    newBuf.set(this.recvBuf);
    newBuf.set(data, this.recvBuf.length);
    this.recvBuf = newBuf;
  }

  private processBuffer(): void {
    // Handle initial handshake
    if (!this.gotHandshake) {
      if (this.recvBuf.length >= HANDSHAKE_SIZE) {
        this.recvBuf = this.recvBuf.slice(HANDSHAKE_SIZE);
        this.gotHandshake = true;
        this.callbacks.onConnect();
        this.requestFramebuffer();
      }
      return;
    }

    // Process complete messages
    while (this.recvBuf.length >= 2) {
      const len = readU16(this.recvBuf, 0);

      if (this.recvBuf.length < 2 + len) {
        break; // Wait for more data
      }

      const msgData = this.recvBuf.slice(2, 2 + len);
      this.recvBuf = this.recvBuf.slice(2 + len);

      this.handleMessage(msgData[0], msgData.slice(1));
    }
  }

  private handleMessage(type: number, payload: Uint8Array): void {
    switch (type) {
      case MSG_FB: {
        const fb = parseFB(payload);
        this.callbacks.onFB(fb.x, fb.y, fb.w, fb.h, fb.packed);
        break;
      }
      case MSG_WD: {
        const wd = parseWD(payload);
        this.callbacks.onWD(wd.addr, wd.word);
        break;
      }
      case MSG_CLOSE:
        this.cleanup();
        this.callbacks.onDisconnect();
        break;
    }
  }

  private requestFramebuffer(): void {
    if (this.ws) {
      this.ws.send(buildGetFB());
    }
  }
}
