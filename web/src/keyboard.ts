//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Knight keyboard mapping (from tvcon.c)

// Modifier bits
export const MOD_RSHIFT = 0o100;
export const MOD_LSHIFT = 0o200;
export const MOD_RTOP = 0o400;
export const MOD_LTOP = 0o1000;
export const MOD_RCTRL = 0o2000;
export const MOD_LCTRL = 0o4000;
export const MOD_RMETA = 0o10000;
export const MOD_LMETA = 0o20000;
export const MOD_SLOCK = 0o40000;

// ASCII to Knight keyboard codes
const SYMBOL_MAP: Record<string, number> = {
  ' ': 0o77,
  '!': 0o02 | MOD_LSHIFT,
  '"': 0o03 | MOD_LSHIFT,
  '#': 0o04 | MOD_LSHIFT,
  '$': 0o05 | MOD_LSHIFT,
  '%': 0o06 | MOD_LSHIFT,
  '&': 0o07 | MOD_LSHIFT,
  "'": 0o10 | MOD_LSHIFT,
  '(': 0o11 | MOD_LSHIFT,
  ')': 0o12 | MOD_LSHIFT,
  '*': 0o61 | MOD_LSHIFT,
  '+': 0o60 | MOD_LSHIFT,
  ',': 0o74,
  '-': 0o14,
  '.': 0o75,
  '/': 0o76,
  '0': 0o13,
  '1': 0o02,
  '2': 0o03,
  '3': 0o04,
  '4': 0o05,
  '5': 0o06,
  '6': 0o07,
  '7': 0o10,
  '8': 0o11,
  '9': 0o12,
  ':': 0o61,
  ';': 0o60,
  '<': 0o74 | MOD_LSHIFT,
  '=': 0o14 | MOD_LSHIFT,
  '>': 0o75 | MOD_LSHIFT,
  '?': 0o76 | MOD_LSHIFT,
  '@': 0o15,
  A: 0o47 | MOD_LSHIFT,
  B: 0o71 | MOD_LSHIFT,
  C: 0o67 | MOD_LSHIFT,
  D: 0o51 | MOD_LSHIFT,
  E: 0o26 | MOD_LSHIFT,
  F: 0o52 | MOD_LSHIFT,
  G: 0o53 | MOD_LSHIFT,
  H: 0o54 | MOD_LSHIFT,
  I: 0o33 | MOD_LSHIFT,
  J: 0o55 | MOD_LSHIFT,
  K: 0o56 | MOD_LSHIFT,
  L: 0o57 | MOD_LSHIFT,
  M: 0o73 | MOD_LSHIFT,
  N: 0o72 | MOD_LSHIFT,
  O: 0o34 | MOD_LSHIFT,
  P: 0o35 | MOD_LSHIFT,
  Q: 0o24 | MOD_LSHIFT,
  R: 0o27 | MOD_LSHIFT,
  S: 0o50 | MOD_LSHIFT,
  T: 0o30 | MOD_LSHIFT,
  U: 0o32 | MOD_LSHIFT,
  V: 0o70 | MOD_LSHIFT,
  W: 0o25 | MOD_LSHIFT,
  X: 0o66 | MOD_LSHIFT,
  Y: 0o31 | MOD_LSHIFT,
  Z: 0o65 | MOD_LSHIFT,
  '[': 0o36,
  '\\': 0o40,
  ']': 0o37,
  '^': 0o16,
  _: 0o13 | MOD_LSHIFT,
  '`': 0o15 | MOD_LSHIFT,
  a: 0o47,
  b: 0o71,
  c: 0o67,
  d: 0o51,
  e: 0o26,
  f: 0o52,
  g: 0o53,
  h: 0o54,
  i: 0o33,
  j: 0o55,
  k: 0o56,
  l: 0o57,
  m: 0o73,
  n: 0o72,
  o: 0o34,
  p: 0o35,
  q: 0o24,
  r: 0o27,
  s: 0o50,
  t: 0o30,
  u: 0o32,
  v: 0o70,
  w: 0o25,
  x: 0o66,
  y: 0o31,
  z: 0o65,
  '{': 0o36 | MOD_LSHIFT,
  '|': 0o40 | MOD_LSHIFT,
  '}': 0o37 | MOD_LSHIFT,
  '~': 0o16 | MOD_LSHIFT,
};

// Special keys by key name or code
const SCANCODE_MAP: Record<string, number> = {
  F12: 0o00, // BREAK
  F2: 0o01, // ESC
  F1: 0o20, // CALL (login)
  F4: 0o21, // CLEAR
  Tab: 0o22,
  Escape: 0o23, // ALT MODE
  Delete: 0o46, // RUBOUT
  Backspace: 0o46, // RUBOUT
  Enter: 0o62,
  F3: 0o64, // NEXT/BACK
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
          return (baseCode & 0o77) | MOD_LCTRL | (this.modifiers & ~(MOD_LSHIFT | MOD_RSHIFT));
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
