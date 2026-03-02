import { describe, expect, it } from 'vitest';
import {
  reorderSurfaceItemOrder,
  resolveSurfaceItemOrder,
  sanitizeSurfaceItemOrder,
} from './surfaceItemOrder';

describe('surfaceItemOrder', () => {
  it('filters stale persisted ids and appends new defaults in order', () => {
    expect(resolveSurfaceItemOrder(['home', 'about', 'contact'], ['contact', 'stale', 'home'])).toEqual([
      'contact',
      'home',
      'about',
    ]);
  });

  it('deduplicates default and persisted ids', () => {
    expect(resolveSurfaceItemOrder(['home', 'home', 'about'], ['about', 'about', 'home'])).toEqual([
      'about',
      'home',
    ]);
  });

  it('reorders an item by inserting it at the target index', () => {
    expect(reorderSurfaceItemOrder(['home', 'about', 'contact'], 'contact', 1)).toEqual([
      'home',
      'contact',
      'about',
    ]);
  });

  it('clamps reorders that target past the end of the list', () => {
    expect(reorderSurfaceItemOrder(['home', 'about', 'contact'], 'home', 99)).toEqual([
      'about',
      'contact',
      'home',
    ]);
  });

  it('sanitizes arbitrary persisted maps into string id arrays', () => {
    expect(sanitizeSurfaceItemOrder({
      desktop: ['home', 'about', 'about', 123],
      'folder:home': ['contact'],
      empty: [],
      nope: 'bad',
    })).toEqual({
      desktop: ['home', 'about'],
      'folder:home': ['contact'],
    });
  });
});
