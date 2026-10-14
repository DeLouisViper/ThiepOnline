import { createContext, useContext } from 'react';
import { THEMES, DEFAULT_THEME, type ThemeDef } from '../lib/themes';

export const ThemeCtx = createContext<ThemeDef>(THEMES[DEFAULT_THEME]);
export const useTheme = () => useContext(ThemeCtx);
