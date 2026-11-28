import type { CSSProperties } from 'react';
import type { IMenuTheme } from '../types';
import { readablePalette } from './theme.util';

/** The menu's theme as CSS variables on `.menu-app` — used by the real menu and the admin preview alike. */
export const themeStyle = (theme: IMenuTheme): CSSProperties => {
  const palette = readablePalette(theme.backgroundColor, theme.primaryColor, theme.secondaryColor);
  return {
    '--primary': theme.primaryColor,
    '--secondary': theme.secondaryColor,
    '--bg': theme.backgroundColor,
    '--ink': palette.ink,
    '--ink-2': palette.ink2,
    '--ink-3': palette.ink3,
    '--surface': palette.surface,
    '--line': palette.line,
    '--tint': palette.tint,
    '--bar': palette.bar,
    '--on-primary': palette.onPrimary,
    '--primary-text': palette.primaryText,
    '--accent': palette.accent,
    colorScheme: palette.dark ? 'dark' : 'light',
    '--bg-image': theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none',
    fontFamily: theme.fontFamily,
  } as CSSProperties;
};
