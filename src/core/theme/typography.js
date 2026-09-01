import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

export const typography = {
  // Heading Levels
  h1: {
    fontFamily: fontBold,
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '700',
    includeFontPadding: false,
  },
  h2: {
    fontFamily: fontBold,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
    includeFontPadding: false,
  },
  h3: {
    fontFamily: fontBold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    includeFontPadding: false,
  },
  h4: {
    fontFamily: fontBold,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    includeFontPadding: false,
  },

  // Body Copy
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    includeFontPadding: false,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    includeFontPadding: false,
  },
  bodySmall: {
    fontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    includeFontPadding: false,
  },

  // Buttons & Labels
  button: {
    fontFamily: fontBold,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    includeFontPadding: false,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    includeFontPadding: false,
  },
  statusBadge: {
    fontFamily: fontBold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    includeFontPadding: false,
  }
};
