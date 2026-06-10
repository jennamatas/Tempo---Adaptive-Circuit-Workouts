// Tempo design tokens (dark-first)
export const colors = {
  background: '#0B0F17',
  surface: '#151B26',
  surface2: '#1E2632',
  border: '#2A3441',
  foreground: '#F4F7FB',
  mutedForeground: '#9AA7B8',
  subtleForeground: '#64748B',

  primary: '#C5F82A',
  primaryHover: '#B5E81A',
  primaryForeground: '#0B0F17',

  coral: '#FF6B4A',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  phaseFoundation: '#3B82F6',
  phaseBuild: '#C5F82A',
  phasePeak: '#FF6B4A',
};

export const phaseColor: Record<string, string> = {
  foundation: colors.phaseFoundation,
  build: colors.phaseBuild,
  peak: colors.phasePeak,
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const fonts = {
  display: 'System',
  body: 'System',
};

// Breakpoint at which the app switches to its desktop layout (left sidebar nav,
// multi-column content). Matches the bottom-tab → sidebar switch in NavBar.
export const desktopBreakpoint = 768;

// Centers screen content within a comfortable column on wide viewports while
// staying full-width on phones. Spread into a ScrollView's contentContainerStyle.
// - centeredContent: single-column reading width (lists, forms-in-app)
// - centeredWide:    wider column for multi-column screens (dashboard, library)
// - centeredForm:    narrow column for auth forms
export const screenMaxWidth = 760;
export const centeredContent = {
  width: '100%',
  maxWidth: screenMaxWidth,
  alignSelf: 'center',
} as const;
export const centeredWide = {
  width: '100%',
  maxWidth: 1040,
  alignSelf: 'center',
} as const;
export const centeredForm = {
  width: '100%',
  maxWidth: 480,
  alignSelf: 'center',
} as const;
