//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

//
// PDP-10 Web Console - Main entry point
//

import { WIDTH, HEIGHT } from './protocol';
import { Display } from './display';
import { Connection } from './connection';
import {
    KeyboardHandler,
    MOD_LSHIFT,
    MOD_LCTRL,
    MOD_LMETA,
    MOD_LTOP,
} from './keyboard';
import { TextTerminal } from './terminal';
import { TelnetConnection } from './terminal/connection';
import { cheatsheets } from './content/cheatsheets';
import { VirtualKeyboard, type KeyDef } from './virtual-keyboard';
import { knightTVLayout, vt52Layout } from './keyboard-layouts';
import { isMobile } from './utils';

declare global {
    interface Window {
        exportFB?: () => void;
    }
}

type TerminalType = 'tv11' | 'console' | 'term0';
type TermColor = 'green' | 'amber' | 'grey';

const TERM_COLORS: Record<TermColor, string> = {
    green: '#33ff33',
    amber: '#ffb000',
    grey: '#b0b0b0',
};

interface TerminalState {
    connected: boolean;
    initialized: boolean;
}

class App {
    private activeTab: TerminalType = 'tv11';
    private currentColor: TermColor = 'green';
    private keyboardVisible: Record<TerminalType, boolean> = {
        tv11: false,
        console: false,
        term0: false,
    };
    private terminalStates: Record<TerminalType, TerminalState> = {
        tv11: { connected: false, initialized: false },
        console: { connected: false, initialized: false },
        term0: { connected: false, initialized: false },
    };

    // TV11 components
    private display!: Display;
    private tv11Connection!: Connection;
    private keyboard!: KeyboardHandler;
    private tv11VirtualKeyboard?: VirtualKeyboard;

    // Text terminal components
    private consoleTerminal?: TextTerminal;
    private consoleConnection?: TelnetConnection;
    private consoleVirtualKeyboard?: VirtualKeyboard;
    private term0Terminal?: TextTerminal;
    private term0Connection?: TelnetConnection;
    private term0VirtualKeyboard?: VirtualKeyboard;

    async init(): Promise<void> {
        this.setupTabs();
        this.setupCheatSheet();
        this.setupFullscreen();
        this.setupColorSwitcher();
        this.setupConnectButtons();
        this.setupKeyboardToggles();
        this.initTV11();
        this.updateCheatSheet();

        window.exportFB = () => this.exportFramebuffer();
    }

    private setupTabs(): void {
        const tabs = document.querySelectorAll('.tab[data-target]');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-target') as TerminalType;
                this.switchTab(target);
            });
        });
    }

    private switchTab(target: TerminalType): void {
        if (target === this.activeTab) return;

        // Update tab buttons
        document
            .querySelectorAll('.tab')
            .forEach((t) => t.classList.remove('active'));
        document
            .querySelector(`.tab[data-target="${target}"]`)
            ?.classList.add('active');

        // Update panels
        document
            .querySelectorAll('.terminal-panel')
            .forEach((p) => p.classList.remove('active'));
        document.getElementById(`${target}-panel`)?.classList.add('active');

        this.activeTab = target;
        this.updateCheatSheet();
        this.updateStatus();

        // Initialize terminal on first activation (lazy loading)
        if (!this.terminalStates[target].initialized) {
            this.initTerminal(target);
        }

        // Focus the appropriate terminal
        this.focusActiveTerminal();
    }

    private initTerminal(target: TerminalType): void {
        switch (target) {
            case 'tv11':
                // Already initialized in init()
                break;
            case 'console':
                this.initConsoleTerminal();
                break;
            case 'term0':
                this.initTerm0Terminal();
                break;
        }
        this.terminalStates[target].initialized = true;
    }

    private initTV11(): void {
        this.display = new Display('tv11-canvas', 'terminal-area');
        this.tv11Connection = new Connection({
            onConnect: () => {
                this.terminalStates.tv11.connected = true;
                this.updateStatus();
            },
            onDisconnect: () => {
                this.terminalStates.tv11.connected = false;
                this.updateStatus();
            },
            onError: (msg) => console.error(msg),
            onFB: (x, y, w, h, packed) =>
                this.display.unpack(packed, x, y, w, h),
            onWD: (addr, word) => this.display.updateWord(addr, word),
        });

        this.keyboard = new KeyboardHandler((code) =>
            this.tv11Connection.sendKey(code)
        );
        this.keyboard.registerLocalKey('F8', () => {
            if (this.activeTab === 'tv11') this.toggleFullscreen();
        });
        this.keyboard.registerLocalKey('F11', () => {
            if (this.activeTab === 'tv11') this.toggleFullscreen();
        });

        // Initialize virtual keyboard for TV11
        this.tv11VirtualKeyboard = new VirtualKeyboard(
            'tv11-virtual-keyboard',
            knightTVLayout,
            (key, modifiers) => this.handleTV11VirtualKey(key, modifiers)
        );
        this.tv11VirtualKeyboard.render();

        // Load preview
        this.loadTV11Preview();

        // Setup event listeners
        document.addEventListener('keydown', (e) => {
            if (this.activeTab === 'tv11') {
                this.keyboard.handleKeyDown(e);
            }
        });
        document.addEventListener('keyup', (e) => {
            if (this.activeTab === 'tv11') {
                this.keyboard.handleKeyUp(e);
            }
        });

        document.addEventListener('fullscreenchange', () =>
            setTimeout(() => this.updateTV11Scale(), 50)
        );
        window.addEventListener('resize', () => this.updateTV11Scale());

        // Start render loop
        this.renderLoop();
        this.updateTV11Scale();

        this.terminalStates.tv11.initialized = true;
    }

    private handleTV11VirtualKey(key: KeyDef, modifiers: Set<string>): void {
        if (key.code === undefined) return;

        // Build modifier bits
        let code = key.code;
        if (modifiers.has('shift')) code |= MOD_LSHIFT;
        if (modifiers.has('ctrl')) code |= MOD_LCTRL;
        if (modifiers.has('meta')) code |= MOD_LMETA;
        if (modifiers.has('top')) code |= MOD_LTOP;

        this.tv11Connection.sendKey(code);
    }

    private handleVT52VirtualKey(
        key: KeyDef,
        modifiers: Set<string>,
        send: (data: string) => void
    ): void {
        // Handle escape sequences (function keys, arrows, etc.)
        if (key.escape) {
            send(key.escape);
            return;
        }

        // Handle regular characters
        if (key.char) {
            let char = key.char;
            const isLetter = /^[a-z]$/i.test(char);

            // Apply ctrl first (takes priority)
            if (modifiers.has('ctrl') && key.ctrlChar) {
                send(key.ctrlChar);
                return;
            }

            // Apply caps lock (only affects letters)
            const isCapsLock = modifiers.has('capslock');
            if (isCapsLock && isLetter) {
                char = char.toUpperCase();
            }

            // Apply shift
            if (modifiers.has('shift')) {
                if (key.shiftChar) {
                    char = key.shiftChar;
                } else if (isCapsLock && isLetter) {
                    // Shift + Caps Lock = lowercase for letters
                    char = char.toLowerCase();
                }
            }

            send(char);
        }
    }

    private async loadTV11Preview(): Promise<void> {
        try {
            const basePath = import.meta.env.BASE_URL || '/';
            const response = await fetch(`${basePath}preview.bin`);
            const buf = await response.arrayBuffer();
            this.display.unpack(new Uint8Array(buf), 0, 0, WIDTH, HEIGHT);
            this.display.render(true);
        } catch (e) {
            console.debug('Preview not loaded:', e);
            this.display.clear();
            this.display.render(true);
        }
    }

    private initConsoleTerminal(): void {
        this.consoleTerminal = new TextTerminal('console-terminal', {
            onData: (data) => this.consoleConnection?.send(data),
            onBinary: (data) => this.consoleConnection?.send(data),
        });

        this.consoleConnection = new TelnetConnection('console', {
            onConnect: () => {
                this.terminalStates.console.connected = true;
                this.updateStatus();
                this.consoleTerminal?.focus();
            },
            onDisconnect: () => {
                this.terminalStates.console.connected = false;
                this.updateStatus();
            },
            onError: (msg) => console.error(msg),
            onData: (data) => this.consoleTerminal?.write(data),
        });

        // Initialize virtual keyboard for console
        this.consoleVirtualKeyboard = new VirtualKeyboard(
            'console-virtual-keyboard',
            vt52Layout,
            (key, modifiers) =>
                this.handleVT52VirtualKey(key, modifiers, (data) =>
                    this.consoleConnection?.send(data)
                )
        );
        this.consoleVirtualKeyboard.render();

        this.consoleTerminal.open();
        this.consoleTerminal.setPreviewMode(
            true,
            TERM_COLORS[this.currentColor]
        );
        this.fitTerminalToMobile(this.consoleTerminal);
    }

    private initTerm0Terminal(): void {
        this.term0Terminal = new TextTerminal('term0-terminal', {
            onData: (data) => this.term0Connection?.send(data),
            onBinary: (data) => this.term0Connection?.send(data),
        });

        this.term0Connection = new TelnetConnection('term0', {
            onConnect: () => {
                this.terminalStates.term0.connected = true;
                this.updateStatus();
                this.term0Terminal?.focus();
            },
            onDisconnect: () => {
                this.terminalStates.term0.connected = false;
                this.updateStatus();
            },
            onError: (msg) => console.error(msg),
            onData: (data) => this.term0Terminal?.write(data),
        });

        // Initialize virtual keyboard for term0
        this.term0VirtualKeyboard = new VirtualKeyboard(
            'term0-virtual-keyboard',
            vt52Layout,
            (key, modifiers) =>
                this.handleVT52VirtualKey(key, modifiers, (data) =>
                    this.term0Connection?.send(data)
                )
        );
        this.term0VirtualKeyboard.render();

        this.term0Terminal.open();
        this.term0Terminal.setPreviewMode(true, TERM_COLORS[this.currentColor]);
        this.fitTerminalToMobile(this.term0Terminal);
    }

    private fitTerminalToMobile(terminal: TextTerminal): void {
        if (isMobile()) {
            terminal.fitToWidth(window.innerWidth);
        }
    }

    private renderLoop(): void {
        this.display.renderIfNeeded();
        requestAnimationFrame(() => this.renderLoop());
    }

    private focusActiveTerminal(): void {
        switch (this.activeTab) {
            case 'console':
                this.consoleTerminal?.focus();
                break;
            case 'term0':
                this.term0Terminal?.focus();
                break;
        }
    }

    private setupCheatSheet(): void {
        this.updateCheatSheet();
    }

    private updateCheatSheet(): void {
        const container = document.getElementById('cheatsheet-content');
        if (!container) return;

        // Map tab to cheatsheet type
        const cheatType =
            this.activeTab === 'term0' ? 'terminal' : this.activeTab;
        const sheet = cheatsheets[cheatType];
        if (!sheet) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = sheet.sections
            .map((section) => {
                if (section.text) {
                    return `
          <section>
            <h4>${section.title}</h4>
            <pre>${section.text}</pre>
          </section>`;
                }
                return `
        <section>
          <h4>${section.title}</h4>
          <dl>
            ${section.items?.map((item) => `<dt>${item.key}</dt><dd>${item.desc}</dd>`).join('') ?? ''}
          </dl>
        </section>`;
            })
            .join('');
    }

    private setupFullscreen(): void {
        const btn = document.getElementById('fullscreen-btn');
        btn?.addEventListener('click', () => this.toggleFullscreen());
    }

    private toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            const panel = document.getElementById('tv11-panel');
            panel?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    private setupColorSwitcher(): void {
        const buttons = document.querySelectorAll('.color-btn[data-color]');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color') as TermColor;
                this.setTerminalColor(color);
            });
        });
    }

    private setupConnectButtons(): void {
        document
            .querySelectorAll('.terminal-titlebar .connect-btn')
            .forEach((btn) => {
                btn.addEventListener('click', () => this.toggleConnection());
            });
    }

    private setupKeyboardToggles(): void {
        document.querySelectorAll('.keyboard-toggle-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.toggleVirtualKeyboard(this.activeTab);
            });
        });
    }

    private toggleVirtualKeyboard(target: TerminalType): void {
        this.keyboardVisible[target] = !this.keyboardVisible[target];
        const panel = document.getElementById(`${target}-panel`);
        const btn = panel?.querySelector('.keyboard-toggle-btn');

        if (this.keyboardVisible[target]) {
            panel?.classList.add('keyboard-visible');
            btn?.classList.add('active');
        } else {
            panel?.classList.remove('keyboard-visible');
            btn?.classList.remove('active');
        }

        // Update display scale for TV11 when keyboard visibility changes
        if (target === 'tv11') {
            setTimeout(() => this.updateTV11Scale(), 50);
        }
    }

    private updateTV11Scale(): void {
        if (this.keyboardVisible.tv11) {
            // Calculate available height minus keyboard
            const container = document.getElementById('terminal-area');
            const keyboard = document.getElementById('tv11-virtual-keyboard');
            if (container && keyboard) {
                const containerHeight = container.clientHeight;
                const keyboardHeight = keyboard.offsetHeight + 50; // extra padding for gap + titlebar
                this.display.updateScale(containerHeight - keyboardHeight);
                return;
            }
        }
        this.display.updateScale();
    }

    private toggleConnection(): void {
        const state = this.terminalStates[this.activeTab];
        if (state.connected) {
            this.disconnect(this.activeTab);
        } else {
            this.connect(this.activeTab);
        }
    }

    private connect(target: TerminalType): void {
        switch (target) {
            case 'tv11':
                this.display.setPreviewMode(false);
                this.display.clear();
                this.display.render();
                this.tv11Connection.connect();
                break;
            case 'console':
                this.consoleTerminal?.setPreviewMode(
                    false,
                    TERM_COLORS[this.currentColor]
                );
                this.consoleConnection?.connect();
                break;
            case 'term0':
                this.term0Terminal?.setPreviewMode(
                    false,
                    TERM_COLORS[this.currentColor]
                );
                this.term0Connection?.connect();
                break;
        }
    }

    private disconnect(target: TerminalType): void {
        switch (target) {
            case 'tv11':
                this.tv11Connection.disconnect();
                this.display.setPreviewMode(true);
                break;
            case 'console':
                this.consoleConnection?.disconnect();
                this.consoleTerminal?.setPreviewMode(
                    true,
                    TERM_COLORS[this.currentColor]
                );
                break;
            case 'term0':
                this.term0Connection?.disconnect();
                this.term0Terminal?.setPreviewMode(
                    true,
                    TERM_COLORS[this.currentColor]
                );
                break;
        }
    }

    private setTerminalColor(color: TermColor): void {
        this.currentColor = color;

        // Update button states
        document
            .querySelectorAll('.color-btn')
            .forEach((btn) => btn.classList.remove('active'));
        document
            .querySelector(`.color-btn[data-color="${color}"]`)
            ?.classList.add('active');

        // Update TV11 display
        this.display.setColor(TERM_COLORS[color]);

        // Update text terminals (respecting preview mode)
        const consolePreview = !this.terminalStates.console.connected;
        const term0Preview = !this.terminalStates.term0.connected;
        this.consoleTerminal?.setPreviewMode(
            consolePreview,
            TERM_COLORS[color]
        );
        this.term0Terminal?.setPreviewMode(term0Preview, TERM_COLORS[color]);
    }

    private updateStatus(): void {
        const state = this.terminalStates[this.activeTab];
        const connectBtn = document.querySelector(
            `#${this.activeTab}-panel .connect-btn`
        ) as HTMLButtonElement;

        if (connectBtn) {
            if (state.connected) {
                connectBtn.textContent = 'Disconnect';
                connectBtn.classList.add('connected');
            } else {
                connectBtn.textContent = 'Connect';
                connectBtn.classList.remove('connected');
            }
        }
    }

    private exportFramebuffer(): void {
        const packed = this.display.exportFramebuffer();
        const buffer = new ArrayBuffer(packed.length);
        new Uint8Array(buffer).set(packed);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preview.bin';
        a.click();
        URL.revokeObjectURL(url);
        console.log('Exported', packed.length, 'bytes');
    }
}

// Start app
const app = new App();
app.init().catch(console.error);
