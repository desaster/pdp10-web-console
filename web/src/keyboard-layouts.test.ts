import { describe, it, expect } from 'vitest';
import { HybridLayout } from './kle-parser';
import lk201Layout from './lk201-layout.json';
import knightTvLayout from './knight-tv-layout.json';

// Count keys in KLE array (strings only, not property objects)
function countKleKeys(kle: (string | Record<string, unknown>)[][]): number {
  let count = 0;
  for (const row of kle) {
    for (const item of row) {
      if (typeof item === 'string') {
        count++;
      }
    }
  }
  return count;
}

describe('keyboard layouts', () => {
  const layouts: [string, HybridLayout][] = [
    ['lk201', lk201Layout as HybridLayout],
    ['knight-tv', knightTvLayout as HybridLayout],
  ];

  describe.each(layouts)('%s layout', (name, layout) => {
    it('has matching KLE and keys array lengths', () => {
      const kleCount = countKleKeys(layout.kle);
      const keysCount = layout.keys.length;
      expect(keysCount).toBe(kleCount);
    });

    it('has unique key IDs', () => {
      const ids = layout.keys.map(k => k.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('has no empty key IDs', () => {
      for (const key of layout.keys) {
        expect(key.id).toBeTruthy();
      }
    });

    it('modifiers have sticky property', () => {
      for (const key of layout.keys) {
        if (key.modifier) {
          expect(key.sticky).toBeDefined();
        }
      }
    });
  });
});
