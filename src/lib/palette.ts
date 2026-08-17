import type { ComponentCategory } from '../types';

// Categorical identity colors (from the validated reference palette: blue,
// orange, aqua, yellow — slots 1-4). Used only as accents (dots, badges,
// chart bars, left-border stripes) — never as the color of body text.
export const CATEGORY_COLOR: Record<ComponentCategory, { light: string; dark: string }> = {
  battery: { light: '#2a78d6', dark: '#3987e5' },
  converter: { light: '#eb6834', dark: '#d95926' },
  load: { light: '#1baf7a', dark: '#199e70' },
  other: { light: '#eda100', dark: '#c98500' },
};

// Fixed status palette — never reused for series identity.
export const STATUS_COLOR = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

export function categoryColor(category: ComponentCategory, resolvedTheme: 'light' | 'dark'): string {
  return CATEGORY_COLOR[category][resolvedTheme];
}
