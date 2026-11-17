import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  G,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Status styling definitions
const STATUS_CONFIG = {
  SAFE: {
    color: '#2E7D5B',
    bg: '#E8F5E9',
    label: 'SAFE',
    symbol: '✓',
  },
  WARNING: {
    color: '#D99A24',
    bg: '#FFF8E1',
    label: 'WARNING',
    symbol: '!',
  },
  EMERGENCY: {
    color: '#B83232',
    bg: '#FFEBEE',
    label: 'EMERGENCY',
    symbol: '⚡',
  },
  OFFLINE: {
    color: '#757575',
    bg: '#EEEEEE',
    label: 'OFFLINE',
    symbol: '?',
  },
  ON_HOLD: {
    color: '#641C2D',
    bg: '#FFF9E6',
    label: 'ON HOLD',
    symbol: '⏸',
  },
};

// Web Mercator coordinate projections (standard Slippy Map formula)
export const latLngToWorldPixel = (lat, lng, zoom) => {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * scale;
  return { x, y };
};

export const worldPixelToLatLng = (x, y, zoom) => {
  const scale = 256 * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
};

const getTileUrl = (mapType, z, x, y) => {
  if (mapType === 'satellite') {
    return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
  }
  if (mapType === 'carto') {
    const sub = ['a', 'b', 'c', 'd'][Math.abs((x + y) % 4)];
    return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  }
  // Default: Google Maps Streets
  return `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
};

// Surat City Center default
const DEFAULT_CENTER = { lat: 21.1850, lng: 72.8050 };

export const AdminLiveMap = ({
  vihars = [],
  selectedViharId = null,
  onSelectVihar = () => {},
  style = {},
}) => {
  const [viewDims, setViewDims] = useState({ width: SCREEN_WIDTH, height: 420 });
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(14);
  const [panDelta, setPanDelta] = useState({ x: 0, y: 0 });
  const [mapType, setMapType] = useState('google'); // 'google' | 'satellite' | 'carto'

  const centerRef = useRef(center);
  centerRef.current = center;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panDeltaRef = useRef(panDelta);
  panDeltaRef.current = panDelta;

  // Two-finger pinch-to-zoom tracking refs
  const initialPinchDist = useRef(null);
  const lastCentroid = useRef(null);
  const isPinchGesture = useRef(false);

  // Pulse animation for emergency SOS markers
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Center on selected Vihar when selectedViharId changes
  useEffect(() => {
    if (!selectedViharId || !vihars || vihars.length === 0) return;
    const target = vihars.find((v) => v.vihar_id === selectedViharId);
    if (target && target.lat && target.lng) {
      setCenter({ lat: Number(target.lat), lng: Number(target.lng) });
      setPanDelta({ x: 0, y: 0 });
    }
  }, [selectedViharId]);

  // Pan and Two-Finger Pinch-to-Zoom gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) return true;
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches && touches.length >= 2) {
          isPinchGesture.current = true;
          const touch1 = touches[0];
          const touch2 = touches[1];
          const dx = touch1.pageX - touch2.pageX;
          const dy = touch1.pageY - touch2.pageY;
          const dist = Math.hypot(dx, dy);

          // 1. Two-finger Pinch Zoom (Spread -> Zoom In, Pinch -> Zoom Out)
          if (initialPinchDist.current == null) {
            initialPinchDist.current = dist;
          } else {
            const ratio = dist / initialPinchDist.current;
            if (ratio > 1.20 && zoomRef.current < 18) {
              const nextZ = Math.min(18, zoomRef.current + 1);
              zoomRef.current = nextZ;
              setZoom(nextZ);
              initialPinchDist.current = dist;
            } else if (ratio < 0.83 && zoomRef.current > 11) {
              const nextZ = Math.max(11, zoomRef.current - 1);
              zoomRef.current = nextZ;
              setZoom(nextZ);
              initialPinchDist.current = dist;
            }
          }

          // 2. Two-finger Centroid Pan tracking
          const cX = (touch1.pageX + touch2.pageX) / 2;
          const cY = (touch1.pageY + touch2.pageY) / 2;
          if (lastCentroid.current) {
            const deltaX = cX - lastCentroid.current.x;
            const deltaY = cY - lastCentroid.current.y;
            setPanDelta((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
          }
          lastCentroid.current = { x: cX, y: cY };
        } else if (touches && touches.length === 1 && !isPinchGesture.current) {
          // Single-finger Pan Drag
          lastCentroid.current = null;
          initialPinchDist.current = null;
          setPanDelta({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        const curCenter = centerRef.current;
        const curZoom = zoomRef.current;
        const curPan = panDeltaRef.current;
        const centerPx = latLngToWorldPixel(curCenter.lat, curCenter.lng, curZoom);
        const newCenterPx = {
          x: centerPx.x - curPan.x,
          y: centerPx.y - curPan.y,
        };
        const newCenter = worldPixelToLatLng(newCenterPx.x, newCenterPx.y, curZoom);
        setCenter(newCenter);
        setPanDelta({ x: 0, y: 0 });

        initialPinchDist.current = null;
        lastCentroid.current = null;
        isPinchGesture.current = false;
      },
      onPanResponderTerminate: () => {
        initialPinchDist.current = null;
        lastCentroid.current = null;
        isPinchGesture.current = false;
        setPanDelta({ x: 0, y: 0 });
      },
    })
  ).current;

  // Zoom controls
  const handleZoomIn = () => {
    if (zoom < 17) {
      setZoom((z) => z + 1);
      setPanDelta({ x: 0, y: 0 });
    }
  };

  const handleZoomOut = () => {
    if (zoom > 12) {
      setZoom((z) => z - 1);
      setPanDelta({ x: 0, y: 0 });
    }
  };

  const handleFitAll = () => {
    if (!vihars || vihars.length === 0) {
      setCenter(DEFAULT_CENTER);
      setZoom(14);
      setPanDelta({ x: 0, y: 0 });
      return;
    }

    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;

    vihars.forEach((v) => {
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });

    const cLat = (minLat + maxLat) / 2 || DEFAULT_CENTER.lat;
    const cLng = (minLng + maxLng) / 2 || DEFAULT_CENTER.lng;
    setCenter({ lat: cLat, lng: cLng });
    setZoom(14);
    setPanDelta({ x: 0, y: 0 });
  };

  const handleSuratCenter = () => {
    setCenter(DEFAULT_CENTER);
    setZoom(14);
    setPanDelta({ x: 0, y: 0 });
  };

  const cycleMapType = () => {
    setMapType((prev) => {
      if (prev === 'google') return 'satellite';
      if (prev === 'satellite') return 'carto';
      return 'google';
    });
  };

  // Calculate visible tiles
  const { tiles, minScreenPx } = useMemo(() => {
    const W = viewDims.width || SCREEN_WIDTH;
    const H = viewDims.height || 420;

    const centerPx = latLngToWorldPixel(center.lat, center.lng, zoom);
    const effectiveCenterPx = {
      x: centerPx.x - panDelta.x,
      y: centerPx.y - panDelta.y,
    };

    const minPx = {
      x: effectiveCenterPx.x - W / 2,
      y: effectiveCenterPx.y - H / 2,
    };
    const maxPx = {
      x: effectiveCenterPx.x + W / 2,
      y: effectiveCenterPx.y + H / 2,
    };

    const minTileX = Math.floor(minPx.x / 256);
    const maxTileX = Math.floor(maxPx.x / 256);
    const minTileY = Math.floor(minPx.y / 256);
    const maxTileY = Math.floor(maxPx.y / 256);
    const maxTilesDim = Math.pow(2, zoom);

    const tileList = [];
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const wrappedTx = ((tx % maxTilesDim) + maxTilesDim) % maxTilesDim;
        if (ty >= 0 && ty < maxTilesDim) {
          tileList.push({
            key: `${mapType}-${zoom}-${tx}-${ty}`,
            url: getTileUrl(mapType, zoom, wrappedTx, ty),
            left: tx * 256 - minPx.x,
            top: ty * 256 - minPx.y,
          });
        }
      }
    }

    return { tiles: tileList, minScreenPx: minPx };
  }, [center, zoom, panDelta, viewDims, mapType]);

  // Projected markers
  const projectedMarkers = useMemo(() => {
    if (!vihars || vihars.length === 0) return [];
    return vihars
      .map((v) => {
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        const mPx = latLngToWorldPixel(lat, lng, zoom);
        const screenX = mPx.x - minScreenPx.x;
        const screenY = mPx.y - minScreenPx.y;

        return {
          ...v,
          screenX,
          screenY,
        };
      })
      .filter(Boolean);
  }, [vihars, zoom, minScreenPx]);

  const mapTypeLabel =
    mapType === 'google' ? 'Google Roads' : mapType === 'satellite' ? 'Satellite' : 'Voyager';

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setViewDims({ width, height });
        }
      }}
      {...panResponder.panHandlers}
    >
      {/* 1. Real Raster Tiles Map Layer */}
      <View style={styles.tileCanvas}>
        {tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.url }}
            style={{
              position: 'absolute',
              left: t.left,
              top: t.top,
              width: 256,
              height: 256,
            }}
            resizeMode="cover"
          />
        ))}
      </View>

      {/* 2. Interactive SVG Overlay for Markers, Heading & Glow */}
      <View style={styles.overlayLayer} pointerEvents="box-none">
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewDims.width || SCREEN_WIDTH} ${viewDims.height || 420}`}
          pointerEvents="box-none"
        >
          {/* Halo around selected marker */}
          {projectedMarkers.map((m) => {
            const isSelected = m.vihar_id === selectedViharId;
            if (!isSelected) return null;
            return (
              <G key={`halo-${m.vihar_id}`}>
                <Circle cx={m.screenX} cy={m.screenY} r="38" fill={colors.saffron} opacity={0.22} />
                <Circle
                  cx={m.screenX}
                  cy={m.screenY}
                  r="28"
                  stroke={colors.saffron}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
              </G>
            );
          })}

          {/* Render Active Vihar Markers */}
          {projectedMarkers.map((m) => {
            const statusKey = m.displayStatus || m.status || 'SAFE';
            const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.SAFE;
            const isSelected = m.vihar_id === selectedViharId;
            const radius = isSelected ? 20 : 16;
            const isEmergency = statusKey === 'EMERGENCY';

            // Heading pointer
            const headingRad = (((Number(m.heading) || 0) - 90) * Math.PI) / 180;
            const arrowX = m.screenX + Math.cos(headingRad) * (radius + 8);
            const arrowY = m.screenY + Math.sin(headingRad) * (radius + 8);

            return (
              <G
                key={m.vihar_id}
                onPress={() => onSelectVihar(m.vihar_id)}
              >
                {/* Emergency pulsing halo */}
                {isEmergency && (
                  <Circle
                    cx={m.screenX}
                    cy={m.screenY}
                    r={radius + 12}
                    fill="#FFCDD2"
                    opacity={0.7}
                  />
                )}

                {/* Heading Arrow Pointer */}
                <Line
                  x1={m.screenX}
                  y1={m.screenY}
                  x2={arrowX}
                  y2={arrowY}
                  stroke={config.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Marker Outer Circle */}
                <Circle
                  cx={m.screenX}
                  cy={m.screenY}
                  r={radius}
                  fill={config.color}
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />

                {/* Center Symbol / Sevak Initial */}
                <SvgText
                  x={m.screenX}
                  y={m.screenY + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={isSelected ? '13' : '11'}
                  fontWeight="bold"
                >
                  {isEmergency ? '⚡' : (m.sevak_name || 'V').trim().charAt(0).toUpperCase()}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* 3. Native Overlays for Marker Callouts (Zero SVG text overlapping) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {projectedMarkers.map((m) => {
          const statusKey = m.displayStatus || m.status || 'SAFE';
          const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.SAFE;
          const isSelected = m.vihar_id === selectedViharId;
          const radius = isSelected ? 20 : 16;
          const firstName = (m.sevak_name || 'Sevak').trim().split(' ')[0];
          const badgeWidth = 120;
          const badgeLeft = m.screenX - badgeWidth / 2;
          const badgeTop = m.screenY + radius + 5;

          return (
            <TouchableOpacity
              key={`callout-badge-${m.vihar_id}`}
              activeOpacity={0.85}
              onPress={() => onSelectVihar(m.vihar_id)}
              style={[
                styles.nativeCalloutBadge,
                {
                  left: badgeLeft,
                  top: badgeTop,
                  borderColor: isSelected ? colors.saffronDark : colors.cardBorder,
                  borderWidth: isSelected ? 1.5 : 1,
                },
                shadows.sm,
              ]}
            >
              <View style={[styles.calloutStatusDot, { backgroundColor: config.color }]} />
              <Text style={styles.calloutNameText} numberOfLines={1}>
                {firstName}
              </Text>
              <View style={[styles.calloutTagPill, { backgroundColor: config.bg }]}>
                <Text style={[styles.calloutTagText, { color: config.color }]}>
                  {statusKey}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Floating Control Buttons */}
      <View style={styles.topRightControls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, shadows.card]}
          onPress={cycleMapType}
          activeOpacity={0.8}
        >
          <Text style={styles.ctrlBtnText}>🗺️ {mapTypeLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, shadows.card]}
          onPress={handleFitAll}
          activeOpacity={0.8}
        >
          <Text style={styles.ctrlBtnText}>🎯 Fit All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, shadows.card]}
          onPress={handleSuratCenter}
          activeOpacity={0.8}
        >
          <Text style={styles.ctrlBtnText}>📍 Surat</Text>
        </TouchableOpacity>
      </View>

      {/* Zoom In / Zoom Out Floating Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={[styles.zoomBtn, shadows.card]}
          onPress={handleZoomIn}
          activeOpacity={0.8}
        >
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomBtn, shadows.card]}
          onPress={handleZoomOut}
          activeOpacity={0.8}
        >
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Map Attribution Pill */}
      <View style={styles.attributionPill}>
        <Text style={styles.attributionText}>
          {mapType === 'carto'
            ? '© OpenStreetMap • CARTO Voyager'
            : '© Google Maps • Real Road Network'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#EAE6DF',
    overflow: 'hidden',
  },
  tileCanvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EAE6DF',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  topRightControls: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 25,
    gap: spacing.xs,
  },
  ctrlBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ctrlBtnText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.deepMaroon,
    fontSize: 11,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 30,
    right: spacing.md,
    zIndex: 25,
    gap: 6,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  zoomBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.deepMaroon,
    lineHeight: 22,
  },
  attributionPill: {
    position: 'absolute',
    left: spacing.sm,
    bottom: 6,
    zIndex: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  nativeCalloutBadge: {
    position: 'absolute',
    width: 120,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    zIndex: 15,
  },
  calloutStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  calloutNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.deepMaroon,
    marginRight: 4,
    maxWidth: 52,
  },
  calloutTagPill: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  calloutTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
