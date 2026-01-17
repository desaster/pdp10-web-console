//
// © 2026 Upi Tamminen. MIT License.
//
// Note: This file was generated with LLM assistance.  Use with caution.

// Mobile breakpoint - single source of truth
export const MOBILE_BREAKPOINT = 768;

export function isMobile(): boolean {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

// Get element height safely
export function getElementHeight(selector: string): number {
    const el = document.querySelector(selector);
    return el ? el.getBoundingClientRect().height : 0;
}
