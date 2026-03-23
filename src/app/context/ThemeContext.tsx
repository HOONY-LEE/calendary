import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system' | 'custom';

interface CustomColors {
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  calendarHighlight: string;
  taskCompleted: string;
  taskPending: string;
  cardBg: string;
  border: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors: CustomColors;
  updateCustomColors: (colors: Partial<CustomColors>) => void;
}

const defaultCustomColors: CustomColors = {
  primary: 'oklch(0.489 0.243 264.376)',
  accent: 'oklch(0.696 0.17 162.48)',
  success: 'oklch(0.696 0.17 162.48)',
  warning: 'oklch(0.828 0.189 84.429)',
  danger: '#E30000',
  calendarHighlight: 'oklch(0.489 0.243 264.376)',
  taskCompleted: 'oklch(0.696 0.17 162.48)',
  taskPending: 'oklch(0.828 0.189 84.429)',
  cardBg: '#ffffff',
  border: 'rgba(0, 0, 0, 0.1)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'system';
  });

  const [customColors, setCustomColors] = useState<CustomColors>(() => {
    const stored = localStorage.getItem('customColors');
    return stored ? JSON.parse(stored) : defaultCustomColors;
  });

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (resolvedTheme: 'light' | 'dark' | 'custom') => {
      root.classList.remove('light', 'dark', 'custom');
      root.classList.add(resolvedTheme);
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      localStorage.setItem('theme', 'system');
      return () => mq.removeEventListener('change', handler);
    }

    applyTheme(theme as 'light' | 'dark' | 'custom');
    localStorage.setItem('theme', theme);

    if (theme === 'custom') {
      root.style.setProperty('--custom-primary', customColors.primary);
      root.style.setProperty('--custom-accent', customColors.accent);
      root.style.setProperty('--custom-success', customColors.success);
      root.style.setProperty('--custom-warning', customColors.warning);
      root.style.setProperty('--custom-danger', customColors.danger);
      root.style.setProperty('--custom-calendar-highlight', customColors.calendarHighlight);
      root.style.setProperty('--custom-task-completed', customColors.taskCompleted);
      root.style.setProperty('--custom-task-pending', customColors.taskPending);
      root.style.setProperty('--custom-card-bg', customColors.cardBg);
      root.style.setProperty('--custom-border', customColors.border);
    }
  }, [theme, customColors]);

  const updateCustomColors = (colors: Partial<CustomColors>) => {
    const newColors = { ...customColors, ...colors };
    setCustomColors(newColors);
    localStorage.setItem('customColors', JSON.stringify(newColors));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, updateCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
