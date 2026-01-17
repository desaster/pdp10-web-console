//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Virtual keyboard component for KLE layouts

export type LegendAlignment = 'top-bottom' | 'center';

export interface KeyDef {
  id: string;           // unique key identifier
  label: string;        // display label
  labelShift?: string;  // label when shifted
  width?: number;       // width in units (default 1)
  height?: number;      // height in units (default 1)
  code?: number;        // Knight TV scancode (for tv11)
  char?: string;        // character to send (for text terminals)
  escape?: string;      // escape sequence (for text terminals)
  modifier?: string;    // modifier type: 'shift', 'ctrl', 'meta', 'top'
  sticky?: boolean;     // modifier stays active until next key
}

// Extended KeyDef with KLE positioning and styling
export interface KLEKeyDef extends KeyDef {
  x: number;              // x position in units
  y: number;              // y position in units
  isIsoEnter?: boolean;   // L-shaped ISO enter key
  w2?: number;            // secondary width (ISO enter)
  h2?: number;            // secondary height
  x2?: number;            // secondary x offset
  color?: string;         // key background color
  textColor?: string;     // key text color
  legendAlign?: LegendAlignment;
}

export interface KeyboardLayout {
  id: string;
  name: string;
  kleKeys?: KLEKeyDef[];
  kleWidth?: number;
  kleHeight?: number;
}

export type KeyPressCallback = (key: KeyDef, modifiers: Set<string>) => void;

export class VirtualKeyboard {
  private container: HTMLElement;
  private layout: KeyboardLayout;
  private activeModifiers = new Set<string>();
  private onKeyPress: KeyPressCallback;
  private keyElements = new Map<string, HTMLElement>();

  constructor(containerId: string, layout: KeyboardLayout, onKeyPress: KeyPressCallback) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container '${containerId}' not found`);
    }
    this.container = container;
    this.layout = layout;
    this.onKeyPress = onKeyPress;
  }

  render(): void {
    this.container.innerHTML = '';
    this.container.className = `virtual-keyboard vk-${this.layout.id}`;
    this.keyElements.clear();

    const keys = this.layout.kleKeys;
    if (!keys) return;

    const width = this.layout.kleWidth || 1;
    const height = this.layout.kleHeight || 1;

    this.container.classList.add('vk-kle');
    this.container.style.setProperty('--kle-width', width.toString());
    this.container.style.setProperty('--kle-height', height.toString());

    for (const key of keys) {
      const keyEl = this.createKeyElement(key);
      keyEl.style.setProperty('--key-x', key.x.toString());
      keyEl.style.setProperty('--key-y', key.y.toString());
      this.keyElements.set(key.id, keyEl);
      this.container.appendChild(keyEl);
    }
  }

  private createKeyElement(key: KLEKeyDef): HTMLElement {
    const keyEl = document.createElement('button');
    keyEl.className = 'vk-key';
    keyEl.dataset.keyId = key.id;

    if (key.width) {
      keyEl.style.setProperty('--key-width', key.width.toString());
    }
    if (key.height) {
      keyEl.style.setProperty('--key-height', key.height.toString());
      keyEl.classList.add('vk-tall');
    }

    // ISO Enter (L-shaped key)
    if (key.isIsoEnter) {
      keyEl.classList.add('vk-iso-enter');
      if (key.w2 !== undefined) keyEl.style.setProperty('--key-w2', key.w2.toString());
      if (key.h2 !== undefined) keyEl.style.setProperty('--key-h2', key.h2.toString());
      if (key.x2 !== undefined) keyEl.style.setProperty('--key-x2', key.x2.toString());
    }

    // KLE colors
    if (key.color) {
      keyEl.style.setProperty('--key-color', key.color);
    }
    if (key.textColor) {
      keyEl.style.setProperty('--key-text-color', key.textColor);
    }

    // Modifier styling
    if (key.modifier) {
      keyEl.classList.add('vk-modifier');
      keyEl.classList.add(`vk-mod-${key.modifier}`);
    }

    // Create label elements based on legend alignment
    if (key.legendAlign === 'center') {
      keyEl.classList.add('vk-center-legend');
      const label = document.createElement('span');
      label.className = 'vk-label';
      label.innerHTML = key.label.replace(/\n/g, '<br>');
      keyEl.appendChild(label);
    } else {
      if (key.labelShift) {
        const shiftLabel = document.createElement('span');
        shiftLabel.className = 'vk-label-shift';
        shiftLabel.innerHTML = key.labelShift;
        keyEl.appendChild(shiftLabel);
      }
      const mainLabel = document.createElement('span');
      mainLabel.className = 'vk-label';
      mainLabel.innerHTML = key.label;
      keyEl.appendChild(mainLabel);
    }

    // Event handlers
    keyEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.handleKeyDown(key);
    });
    keyEl.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.handleKeyUp(key);
    });
    keyEl.addEventListener('mouseleave', () => {
      if (!key.modifier || !key.sticky) {
        keyEl.classList.remove('vk-pressed');
      }
    });

    // Touch support
    keyEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleKeyDown(key);
    });
    keyEl.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleKeyUp(key);
    });

    return keyEl;
  }

  private handleKeyDown(key: KeyDef): void {
    const keyEl = this.keyElements.get(key.id);
    if (keyEl) {
      keyEl.classList.add('vk-pressed');
    }

    if (key.modifier) {
      if (key.sticky) {
        if (this.activeModifiers.has(key.modifier)) {
          this.activeModifiers.delete(key.modifier);
          keyEl?.classList.remove('vk-active');
        } else {
          this.activeModifiers.add(key.modifier);
          keyEl?.classList.add('vk-active');
        }
      } else {
        this.activeModifiers.add(key.modifier);
        keyEl?.classList.add('vk-active');
      }
      this.updateModifierVisuals();
    }
  }

  private handleKeyUp(key: KeyDef): void {
    const keyEl = this.keyElements.get(key.id);

    if (key.modifier) {
      if (!key.sticky) {
        this.activeModifiers.delete(key.modifier);
        keyEl?.classList.remove('vk-active');
        keyEl?.classList.remove('vk-pressed');
        this.updateModifierVisuals();
      } else {
        keyEl?.classList.remove('vk-pressed');
      }
    } else {
      keyEl?.classList.remove('vk-pressed');
      this.onKeyPress(key, new Set(this.activeModifiers));

      // Clear non-sticky modifiers after key press
      for (const mod of this.activeModifiers) {
        const modKey = this.layout.kleKeys?.find(k => k.modifier === mod);
        if (modKey && !modKey.sticky) {
          this.activeModifiers.delete(mod);
          const modEl = this.keyElements.get(modKey.id);
          modEl?.classList.remove('vk-active');
        }
      }
      this.updateModifierVisuals();
    }
  }

  private updateModifierVisuals(): void {
    this.container.classList.toggle('vk-shifted', this.activeModifiers.has('shift'));
    this.container.classList.toggle('vk-ctrl', this.activeModifiers.has('ctrl'));
    this.container.classList.toggle('vk-meta', this.activeModifiers.has('meta'));
    this.container.classList.toggle('vk-top', this.activeModifiers.has('top'));
  }

  setLayout(layout: KeyboardLayout): void {
    this.layout = layout;
    this.activeModifiers.clear();
    this.render();
  }

  clearModifiers(): void {
    this.activeModifiers.clear();
    for (const [, el] of this.keyElements) {
      el.classList.remove('vk-active', 'vk-pressed');
    }
    this.updateModifierVisuals();
  }
}
