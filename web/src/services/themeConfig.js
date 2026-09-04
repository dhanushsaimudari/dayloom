/**
 * Dayloom Theme & Atmosphere Registry
 * Supports 9 image-based themes + 1 "None" neutral theme.
 * Extensible design: Themes 6-9 can be activated by adding their images without restructuring the app.
 */

export const DAYLOOM_THEMES = [
  {
    id: 'theme_1_midnight_horizon',
    name: 'Midnight Horizon',
    category: 'Reflective',
    accentColor: '#6366f1',
    description: 'Deep midnight backdrop with bird and floral accents for peaceful evening journaling.',
    imageURL: '/themes/theme_1_midnight_horizon.png',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_2_cosmic_voyage',
    name: 'Cosmic Voyage',
    category: 'Imaginative',
    accentColor: '#a855f7',
    description: 'Starry galaxy border with astronauts and planets to inspire boundless thoughts.',
    imageURL: '/themes/theme_2_cosmic_voyage.png',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_3_digital_loom',
    name: 'Digital Loom',
    category: 'Futuristic',
    accentColor: '#0ea5e9',
    description: 'Electric blue cybernetic circuits and structured logic pathways.',
    imageURL: '/themes/theme_3_digital_loom.jpg',
    overlayOpacity: 0.50,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_4_celestial_dawn',
    name: 'Celestial Dawn',
    category: 'Serene',
    accentColor: '#38bdf8',
    description: 'Watercolor gradient night sky crowned with a radiant golden guiding star.',
    imageURL: '/themes/theme_4_celestial_dawn.jpg',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_5_vintage_ephemera',
    name: 'Vintage Ephemera',
    category: 'Classical',
    accentColor: '#d97706',
    description: 'Warm antique scrapbook collage with architecture, biplanes, and botanicals.',
    imageURL: '/themes/theme_5_vintage_ephemera.jpg',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_6_ivory_botanical',
    name: 'Ivory Blossom',
    category: 'Botanical',
    accentColor: '#d97706',
    description: 'Delicate watercolor botanicals with warm ivory and soft neutral floral hues.',
    imageURL: '/themes/theme_6_ivory_botanical.png',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_7_luminous_butterfly',
    name: 'Luminous Twilight',
    category: 'Ethereal',
    accentColor: '#c084fc',
    description: 'Radiant golden butterfly ascending through violet twilight stardust and city lights.',
    imageURL: '/themes/theme_7_luminous_butterfly.jpg',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_8_amber_solitude',
    name: 'Amber Serenity',
    category: 'Organic',
    accentColor: '#b45309',
    description: 'Warm speckled watercolor paper texture with golden branch twigs and minimalist aesthetic.',
    imageURL: '/themes/theme_8_amber_solitude.jpg',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  {
    id: 'theme_9_sage_sanctuary',
    name: 'Sage Sanctuary',
    category: 'Nature',
    accentColor: '#059669',
    description: 'Calming sage green watercolor wash with crisp botanical leaf contours.',
    imageURL: '/themes/theme_9_sage_sanctuary.jpg',
    overlayOpacity: 0.45,
    blur: '2px',
    isAvailable: true
  },
  // Theme 10: None (Neutral plain background)
  {
    id: 'none',
    name: 'None (Minimalist)',
    category: 'Minimal',
    accentColor: '#6366f1',
    description: 'Clean, distraction-free neutral plain background with zero background imagery.',
    imageURL: '',
    overlayOpacity: 1.0,
    blur: '0px',
    isAvailable: true
  }
];

export const DEFAULT_THEME_ID = 'theme_5_vintage_ephemera';

export function getThemeById(themeId) {
  return DAYLOOM_THEMES.find(t => t.id === themeId) || DAYLOOM_THEMES[0];
}

export function getAvailableThemes() {
  return DAYLOOM_THEMES.filter(t => t.isAvailable);
}
