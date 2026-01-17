//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// xterm.js wrapper for text terminals

import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export interface TerminalCallbacks {
    onData: (data: string) => void;
    onBinary: (data: Uint8Array) => void;
}

export class TextTerminal {
    private terminal: Terminal;
    private fitAddon: FitAddon;
    private container: HTMLElement;
    private callbacks: TerminalCallbacks;

    constructor(containerId: string, callbacks: TerminalCallbacks) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        this.container = container;
        this.callbacks = callbacks;

        // Create terminal with fixed 80x24 size
        this.terminal = new Terminal({
            cols: 80,
            rows: 24,
            cursorBlink: true,
            cursorStyle: 'block',
            fontFamily: 'monospace',
            fontSize: 16,
            theme: {
                background: '#000000',
                foreground: '#55ff71',
                cursor: '#55ff71',
                cursorAccent: '#000000',
            },
        });

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new WebLinksAddon());

        // Forward user input
        this.terminal.onData((data) => {
            this.callbacks.onData(data);
        });

        this.terminal.onBinary((data) => {
            const bytes = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                bytes[i] = data.charCodeAt(i);
            }
            this.callbacks.onBinary(bytes);
        });
    }

    open(): void {
        this.terminal.open(this.container);
        // Don't fit - keep fixed 80x24
    }

    write(data: string | Uint8Array): void {
        this.terminal.write(data);
    }

    clear(): void {
        this.terminal.clear();
    }

    focus(): void {
        this.terminal.focus();
    }

    blur(): void {
        this.terminal.blur();
    }

    dispose(): void {
        this.terminal.dispose();
    }

    get element(): HTMLElement {
        return this.container;
    }

    setColor(color: string): void {
        this.terminal.options.theme = {
            background: '#000000',
            foreground: color,
            cursor: color,
            cursorAccent: '#000000',
        };
    }

    setPreviewMode(preview: boolean, activeColor: string): void {
        const color = preview ? '#888888' : activeColor;
        this.setColor(color);
    }

    setFontSize(size: number): void {
        this.terminal.options.fontSize = size;
        this.terminal.refresh(0, this.terminal.rows - 1);
    }

    // Calculate font size to fit 80 columns in given width
    fitToWidth(width: number): void {
        // Monospace char width is approximately 0.6 × font size
        const charWidthRatio = 0.6;
        const targetCols = 80;
        const fontSize = Math.floor(width / (targetCols * charWidthRatio));
        this.setFontSize(Math.max(8, Math.min(fontSize, 16))); // Clamp between 8-16
    }
}
