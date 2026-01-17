//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Knight keyboard handler - maps physical PC keyboard to Knight scancodes

import knightLayout from './knight-tv-layout.json';

// Modifier bits (match Knight hardware)
export const MOD_RSHIFT = 0o100;
export const MOD_LSHIFT = 0o200;
export const MOD_RTOP = 0o400;
export const MOD_LTOP = 0o1000;
export const MOD_RCTRL = 0o2000;
export const MOD_LCTRL = 0o4000;
export const MOD_RMETA = 0o10000;
export const MOD_LMETA = 0o20000;
export const MOD_SLOCK = 0o40000;

// Build character-to-scancode map from layout
// Maps ASCII characters to (scancode | implicit_modifiers)
const SYMBOL_MAP: Record<string, number> = {};

for (const key of knightLayout.keys) {
    if (key.code !== undefined) {
        // Unshifted character
        if (key.char) {
            SYMBOL_MAP[key.char] = key.code;
        }
        // Shifted character (includes shift modifier)
        if (key.shiftChar) {
            SYMBOL_MAP[key.shiftChar] = key.code | MOD_LSHIFT;
        }
    }
}

// Special keys - maps PC keyboard codes to Knight scancodes
// This is a configuration choice for how PC function keys map to Knight functions
const SCANCODE_MAP: Record<string, number> = {
    F12: 0, // BREAK
    F2: 1, // ESC
    F1: 16, // CALL (login)
    F4: 17, // CLEAR
    Tab: 18,
    Escape: 19, // ALT MODE
    Delete: 38, // RUBOUT
    Backspace: 38, // RUBOUT
    Enter: 50,
    F3: 52, // BACK/NEXT
};

// Modifier key codes to modifier bits
const MODIFIER_MAP: Record<string, number> = {
    ShiftLeft: MOD_LSHIFT,
    ShiftRight: MOD_RSHIFT,
    ControlLeft: MOD_LCTRL,
    ControlRight: MOD_RCTRL,
    AltLeft: MOD_LMETA,
    AltRight: MOD_RMETA,
    MetaLeft: MOD_LTOP,
    MetaRight: MOD_RTOP,
};

export type KeyCallback = (code: number) => void;
export type LocalAction = () => void;

export class KeyboardHandler {
    private modifiers = 0;
    private localKeys: Record<string, LocalAction> = {};
    private onKey: KeyCallback;

    constructor(onKey: KeyCallback) {
        this.onKey = onKey;
    }

    registerLocalKey(key: string, action: LocalAction): void {
        this.localKeys[key] = action;
    }

    handleKeyDown(e: KeyboardEvent): void {
        // Check local-only keys first
        const localAction = this.localKeys[e.key] || this.localKeys[e.code];
        if (localAction) {
            e.preventDefault();
            localAction();
            return;
        }

        e.preventDefault();

        // Track modifier state
        const mod = MODIFIER_MAP[e.code];
        if (mod) {
            this.modifiers |= mod;
            return;
        }

        const code = this.mapKey(e);
        if (code !== null) {
            this.onKey(code);
        }
    }

    handleKeyUp(e: KeyboardEvent): void {
        const mod = MODIFIER_MAP[e.code];
        if (mod) {
            this.modifiers &= ~mod;
        }
    }

    private mapKey(e: KeyboardEvent): number | null {
        // Special keys by code or key name
        const special = SCANCODE_MAP[e.code] ?? SCANCODE_MAP[e.key];
        if (special !== undefined) {
            return special | this.modifiers;
        }

        // Control characters
        if (e.ctrlKey && e.key.length === 1) {
            const ch = e.key.toLowerCase();
            if (ch >= 'a' && ch <= 'z') {
                const baseCode = SYMBOL_MAP[ch];
                if (baseCode !== undefined) {
                    return (
                        (baseCode & 0o77) |
                        MOD_LCTRL |
                        (this.modifiers & ~(MOD_LSHIFT | MOD_RSHIFT))
                    );
                }
            }
        }

        // Regular characters
        if (e.key.length === 1) {
            const code = SYMBOL_MAP[e.key];
            if (code !== undefined) {
                return code | (this.modifiers & ~(MOD_LSHIFT | MOD_RSHIFT));
            }
        }

        return null;
    }
}
