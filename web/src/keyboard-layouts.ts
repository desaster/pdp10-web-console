//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Keyboard layouts for virtual keyboards

import { KeyboardLayout } from './virtual-keyboard';
import { parseHybridLayout, HybridLayout } from './kle-parser';
import lk201Layout from './lk201-layout.json';
import knightTvLayout from './knight-tv-layout.json';

// Knight TV (Space Cadet style) keyboard layout
export const knightTVLayout: KeyboardLayout = parseHybridLayout(knightTvLayout as HybridLayout);

// LK201-style DEC keyboard layout (used with VT220)
export const vt220Layout: KeyboardLayout = parseHybridLayout(lk201Layout as HybridLayout);

// Shifted character mappings for VT220
export const vt220ShiftMap: Record<string, string> = {
  '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
  '6': '^', '7': '&', '8': '*', '9': '(', '0': ')', '-': '_',
  '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"',
  ',': '<', '.': '>', '/': '?',
  'q': 'Q', 'w': 'W', 'e': 'E', 'r': 'R', 't': 'T', 'y': 'Y',
  'u': 'U', 'i': 'I', 'o': 'O', 'p': 'P', 'a': 'A', 's': 'S',
  'd': 'D', 'f': 'F', 'g': 'G', 'h': 'H', 'j': 'J', 'k': 'K',
  'l': 'L', 'z': 'Z', 'x': 'X', 'c': 'C', 'v': 'V', 'b': 'B',
  'n': 'N', 'm': 'M',
};

// Control character mappings
export const ctrlMap: Record<string, string> = {
  'a': '\x01', 'b': '\x02', 'c': '\x03', 'd': '\x04', 'e': '\x05',
  'f': '\x06', 'g': '\x07', 'h': '\x08', 'i': '\x09', 'j': '\x0a',
  'k': '\x0b', 'l': '\x0c', 'm': '\x0d', 'n': '\x0e', 'o': '\x0f',
  'p': '\x10', 'q': '\x11', 'r': '\x12', 's': '\x13', 't': '\x14',
  'u': '\x15', 'v': '\x16', 'w': '\x17', 'x': '\x18', 'y': '\x19',
  'z': '\x1a', '[': '\x1b', '\\': '\x1c', ']': '\x1d', '^': '\x1e',
  '_': '\x1f',
};
