import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { colors } from '../../core/theme/colors';

export const JainEmblemIcon = ({ size = 64, color = colors.gold, secondaryColor = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Outer Sacred Halo */}
    <Circle cx="50" cy="50" r="46" stroke={color} strokeWidth="3" strokeDasharray="3 3" />
    <Circle cx="50" cy="50" r="42" stroke={color} strokeWidth="2" />
    
    {/* Inner Lotus Aura */}
    <Circle cx="50" cy="50" r="36" fill={secondaryColor} opacity={0.12} />
    
    {/* Abhaya Mudra Sacred Palm Outline */}
    <Path
      d="M36 68 C36 74 64 74 64 68 L64 48 C64 45 61 45 61 48 L61 38 C61 35 58 35 58 38 L58 33 C58 30 55 30 55 33 L55 37 C55 34 52 34 52 37 L52 50 C48 50 44 48 42 44 C40 40 36 42 36 48 Z"
      fill={color}
    />
    
    {/* Dharma Chakra / Wheel in Palm */}
    <Circle cx="50" cy="54" r="7" stroke={secondaryColor} strokeWidth="1.8" fill="#FFFDF7" />
    <Circle cx="50" cy="54" r="2.5" fill={secondaryColor} />
    
    {/* Three Jewels (Ratnatraya Dots) */}
    <Circle cx="44" cy="24" r="2.2" fill={color} />
    <Circle cx="50" cy="20" r="2.2" fill={color} />
    <Circle cx="56" cy="24" r="2.2" fill={color} />

    {/* Crescent Moon (Siddhashila) */}
    <Path
      d="M40 14 Q50 20 60 14 Q50 17 40 14 Z"
      fill={color}
    />
    <Circle cx="50" cy="12" r="1.5" fill={color} />
  </Svg>
);

export const HomeIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <Path d="M9 22V12h6v10" />
  </Svg>
);

export const NavigationIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="m3 11 19-9-9 19-2-8-8-2z" />
  </Svg>
);

export const HistoryIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="M12 6v6l4 2" />
  </Svg>
);

export const UserIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

export const MenuIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="1.5" />
    <Circle cx="19" cy="12" r="1.5" />
    <Circle cx="5" cy="12" r="1.5" />
  </Svg>
);

export const ShieldIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

export const AlertTriangleIcon = ({ size = 24, color = colors.statusWarning }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Path d="M12 9v4" />
    <Path d="M12 17h.01" />
  </Svg>
);

export const PhoneIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

export const MapPinIcon = ({ size = 24, color = colors.saffron }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

export const ArrowLeftIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

export const CheckCircleIcon = ({ size = 24, color = colors.statusSafe }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

export const LogoutIcon = ({ size = 24, color = colors.deepMaroon }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Path d="m16 17 5-5-5-5" />
    <Path d="M21 12H9" />
  </Svg>
);
