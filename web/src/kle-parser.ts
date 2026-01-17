//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Parser for Keyboard Layout Editor (KLE) JSON format
// See: http://www.keyboard-layout-editor.com/

import { KeyboardLayout, KLEKeyDef, LegendAlignment } from './virtual-keyboard';

// KLE key properties that can appear before a key
interface KLEKeyProps {
  x?: number;   // x offset from previous key
  y?: number;   // y offset (moves to new row position)
  w?: number;   // width in units
  h?: number;   // height in units
  x2?: number;  // secondary x offset (for stepped/ISO keys)
  y2?: number;  // secondary y offset
  w2?: number;  // secondary width (for ISO enter etc)
  h2?: number;  // secondary height
  a?: number;   // label alignment
  f?: number;   // font size
  c?: string;   // key color
  t?: string;   // text color
  d?: boolean;  // decal (non-functional key)
}

// Key definition in our hybrid format
export interface HybridKeyDef {
  id: string;
  code?: number;      // Knight TV scancode
  escape?: string;    // escape sequence (text terminals)
  char?: string;      // character to send (text terminals)
  shiftChar?: string; // character when shift is active
  ctrlChar?: string;  // character when ctrl is active
  altEscape?: string; // escape sequence in alternate keypad mode
  modifier?: string;
  sticky?: boolean;
}

// Our hybrid layout format: KLE + key definitions
export interface HybridLayout {
  id: string;
  name: string;
  kle: (string | Record<string, unknown>)[][];
  keys: HybridKeyDef[];
}

// Parse hybrid layout format (KLE + parallel key definitions)
export function parseHybridLayout(layout: HybridLayout): KeyboardLayout {
  const keys: KLEKeyDef[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxX = 0;
  let maxY = 0;
  let keyIndex = 0;

  let props: KLEKeyProps = {};
  // Sticky properties - persist until changed
  let currentColor: string | undefined;
  let currentTextColor: string | undefined;
  let currentAlign: number | undefined;

  for (const row of layout.kle) {
    currentX = 0;

    for (const item of row) {
      if (typeof item === 'object') {
        props = { ...props, ...(item as KLEKeyProps) };

        if (props.x) {
          currentX += props.x;
          props.x = undefined;
        }
        if (props.y) {
          currentY += props.y;
          props.y = undefined;
        }
        // Sticky properties
        if (props.c) {
          currentColor = props.c;
          props.c = undefined;
        }
        if (props.t) {
          currentTextColor = props.t;
          props.t = undefined;
        }
        if (props.a !== undefined) {
          currentAlign = props.a;
          props.a = undefined;
        }
      } else {
        // Key label string
        const rawLabel = item as string;
        const isCenterAlign = currentAlign === 7;

        let mainLabel: string;
        let shiftLabel: string | undefined;
        let legendAlign: LegendAlignment;

        if (isCenterAlign) {
          // Center alignment: single legend, <br> is just a line break
          mainLabel = rawLabel.replace(/<br>/g, '\n');
          shiftLabel = undefined;
          legendAlign = 'center';
        } else {
          // Top/bottom alignment: split into separate legends
          const labels = rawLabel.split(/<br>|\n/);
          // [0]=top (shift), [1]=bottom (main)
          mainLabel = labels[1] ?? labels[0] ?? '';
          shiftLabel = labels[1] ? labels[0] : undefined;
          legendAlign = 'top-bottom';
        }

        const w = props.w || 1;
        const h = props.h || 1;

        // Get key definition from parallel array
        const keyDef: KLEKeyDef = {
          id: layout.keys[keyIndex]?.id || `key-${keyIndex}`,
          label: mainLabel,
          labelShift: shiftLabel,
          x: currentX,
          y: currentY,
          width: w,
          height: h,
          color: currentColor,
          textColor: currentTextColor,
          legendAlign,
        };

        // Detect ISO Enter
        if (props.w2 !== undefined && props.h2 !== undefined) {
          keyDef.isIsoEnter = true;
          keyDef.w2 = props.w2;
          keyDef.h2 = props.h2;
          keyDef.x2 = props.x2;
        }

        // Apply key definition from parallel array
        const keyInfo = layout.keys[keyIndex];
        if (keyInfo) {
          if (keyInfo.code !== undefined) keyDef.code = keyInfo.code;
          if (keyInfo.escape) keyDef.escape = keyInfo.escape;
          if (keyInfo.char) keyDef.char = keyInfo.char;
          if (keyInfo.shiftChar) keyDef.shiftChar = keyInfo.shiftChar;
          if (keyInfo.ctrlChar) keyDef.ctrlChar = keyInfo.ctrlChar;
          if (keyInfo.altEscape) keyDef.altEscape = keyInfo.altEscape;
          if (keyInfo.modifier) {
            keyDef.modifier = keyInfo.modifier;
            keyDef.sticky = keyInfo.sticky ?? true;
          }
        }

        keys.push(keyDef);
        keyIndex++;

        maxX = Math.max(maxX, currentX + w);
        maxY = Math.max(maxY, currentY + h);
        currentX += w;
        props = {};
      }
    }

    currentY += 1;
  }

  return {
    id: layout.id,
    name: layout.name,
    kleKeys: keys,
    kleWidth: maxX,
    kleHeight: maxY,
  };
}
