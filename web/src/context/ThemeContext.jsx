import React, { createContext, useContext, useState, useEffect } from 'react';
import { DAYLOOM_THEMES, DEFAULT_THEME_ID, getThemeById } from '../services/themeConfig.js';
import { useAuth } from './AuthContext.jsx';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const authState = useAuth();
  const userSettings = authState?.userSettings;

  const [mode, setMode] = useState(() => localStorage.getItem('dayloom_mode') || 'dark');
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('dayloom_wallpaper') || DEFAULT_THEME_ID);

  // Sync with Firestore user settings on login or settings change
  useEffect(() => {
    if (userSettings) {
      if (userSettings.theme && userSettings.theme !== mode) {
        setMode(userSettings.theme);
      }
      if (userSettings.wallpaperURL && userSettings.wallpaperURL !== wallpaper) {
        setWallpaper(userSettings.wallpaperURL);
      }
    }
  }, [userSettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('dayloom_mode', mode);
  }, [mode]);

  useEffect(() => {
    const selectedTheme = getThemeById(wallpaper);
    document.documentElement.setAttribute('data-wallpaper', selectedTheme.id);
    localStorage.setItem('dayloom_wallpaper', selectedTheme.id);

    // Apply dynamic wallpaper background image and CSS variables
    if (selectedTheme.imageURL) {
      document.documentElement.style.setProperty('--theme-bg-image', `url("${selectedTheme.imageURL}")`);
      document.documentElement.style.setProperty('--theme-accent', selectedTheme.accentColor);
      document.documentElement.style.setProperty('--theme-overlay-opacity', selectedTheme.overlayOpacity.toString());
      document.documentElement.style.setProperty('--theme-blur', selectedTheme.blur);
    } else {
      document.documentElement.style.setProperty('--theme-bg-image', 'none');
      document.documentElement.style.setProperty('--theme-accent', selectedTheme.accentColor);
      document.documentElement.style.setProperty('--theme-overlay-opacity', '1');
      document.documentElement.style.setProperty('--theme-blur', '0px');
    }
  }, [wallpaper]);

  const toggleTheme = () => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newMode) => {
    if (newMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setMode(prefersDark ? 'dark' : 'light');
    } else {
      setMode(newMode);
    }
  };

  const changeWallpaper = (newWallpaperId) => {
    setWallpaper(newWallpaperId);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: mode,
        mode,
        setTheme,
        toggleTheme,
        wallpaper,
        changeWallpaper,
        themes: DAYLOOM_THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
