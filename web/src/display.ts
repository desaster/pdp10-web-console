//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Canvas display and framebuffer management

import { WIDTH, HEIGHT } from './protocol';

const BIT_MASK = 0x8000;

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0x33, 0xff, 0x33];
}

export class Display {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixels: Uint8Array;
  private container: HTMLElement;
  private needsRender = false;
  private isPreview = true;
  private color: [number, number, number] = hexToRgb('#33ff33');

  constructor(canvasId: string, containerId: string) {
    const canvas = document.getElementById(canvasId);
    const container = document.getElementById(containerId);

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element '${canvasId}' not found`);
    }
    if (!container) {
      throw new Error(`Container element '${containerId}' not found`);
    }

    this.canvas = canvas;
    this.container = container;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.imageData = this.ctx.createImageData(WIDTH, HEIGHT);
    this.pixels = new Uint8Array(WIDTH * HEIGHT);
  }

  clear(): void {
    this.pixels.fill(0);
    this.needsRender = true;
  }

  // Unpack 1-bit packed pixels into framebuffer
  unpack(packed: Uint8Array, x: number, y: number, w: number, h: number): void {
    let srcIdx = 0;
    for (let row = 0; row < h; row++) {
      const dstRowStart = (y + row) * WIDTH + x;
      let word = 0;

      for (let col = 0; col < w; col++) {
        if (col % 16 === 0) {
          word = packed[srcIdx] | (packed[srcIdx + 1] << 8);
          srcIdx += 2;
        }

        const px = dstRowStart + col;
        if (px >= 0 && px < this.pixels.length) {
          this.pixels[px] = (word & BIT_MASK) ? 255 : 0;
        }
        word = (word << 1) & 0xffff;
      }
    }
    this.needsRender = true;
  }

  // Update single 16-pixel word
  updateWord(addr: number, word: number): void {
    const base = addr * 16;
    let w = word;
    for (let j = 0; j < 16; j++) {
      if (base + j < this.pixels.length) {
        this.pixels[base + j] = (w & BIT_MASK) ? 255 : 0;
      }
      w = (w << 1) & 0xffff;
    }
    this.needsRender = true;
  }

  // Render framebuffer to canvas
  render(forceGrey = false): void {
    const useGrey = forceGrey || this.isPreview;
    const color: [number, number, number] = useGrey ? [0x88, 0x88, 0x88] : this.color;
    const data = this.imageData.data;

    for (let i = 0; i < this.pixels.length; i++) {
      const v = this.pixels[i];
      const j = i * 4;
      data[j] = v ? color[0] : 0;
      data[j + 1] = v ? color[1] : 0;
      data[j + 2] = v ? color[2] : 0;
      data[j + 3] = 255;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
    this.needsRender = false;
  }

  // Render if dirty
  renderIfNeeded(): void {
    if (this.needsRender) {
      this.render();
    }
  }

  // Update canvas scale to fit container
  updateScale(maxHeight?: number): void {
    // Use fullscreen element if available, otherwise use container
    const fsElement = document.fullscreenElement as HTMLElement | null;
    const sizeSource = fsElement || this.container;
    const availWidth = sizeSource.clientWidth;
    // Subtract ~35px for the titlebar when not in fullscreen
    const titlebarOffset = fsElement ? 0 : 35;
    let availHeight = sizeSource.clientHeight - titlebarOffset;

    // If maxHeight specified (e.g., when keyboard is visible), use that
    if (maxHeight !== undefined && maxHeight > 0) {
      availHeight = Math.min(availHeight, maxHeight);
    }

    const scaleX = availWidth / WIDTH;
    const scaleY = availHeight / HEIGHT;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    this.canvas.style.width = Math.floor(WIDTH * scale) + 'px';
    this.canvas.style.height = Math.floor(HEIGHT * scale) + 'px';
  }

  setPreviewMode(preview: boolean): void {
    this.isPreview = preview;
    this.canvas.classList.toggle('preview', preview);
    this.needsRender = true;
  }

  setColor(hex: string): void {
    this.color = hexToRgb(hex);
    this.needsRender = true;
  }

  // Export current framebuffer as packed binary
  exportFramebuffer(): Uint8Array {
    const packed = new Uint8Array((WIDTH * HEIGHT) / 8);
    let dstIdx = 0;

    for (let row = 0; row < HEIGHT; row++) {
      for (let col = 0; col < WIDTH; col += 16) {
        let word = 0;
        for (let bit = 0; bit < 16; bit++) {
          const px = row * WIDTH + col + bit;
          if (this.pixels[px]) {
            word |= BIT_MASK >> bit;
          }
        }
        packed[dstIdx++] = word & 0xff;
        packed[dstIdx++] = (word >> 8) & 0xff;
      }
    }

    return packed;
  }
}
