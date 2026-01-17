//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Keyboard layouts for virtual keyboards

import { KeyboardLayout } from './virtual-keyboard';
import { parseHybridLayout, HybridLayout } from './kle-parser';
import knightTvLayout from './knight-tv-layout.json';
import vt52LayoutData from './vt52-layout.json';

// Knight TV (Space Cadet style) keyboard layout
export const knightTVLayout: KeyboardLayout = parseHybridLayout(knightTvLayout as HybridLayout);

// VT52 keyboard layout
export const vt52Layout: KeyboardLayout = parseHybridLayout(vt52LayoutData as HybridLayout);
