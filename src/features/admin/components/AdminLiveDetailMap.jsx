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
  Polyline,
  Line,
  G,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, shadows, spacing } from '../../../core/theme/spacing';
import {
  latLngToWorldPixel,
  worldPixelToLatLng,
} from './AdminLiveMap';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_COLORS = {
  SAFE: '#2E7D5B',
  WARNING: '#D99A24',
  EMERGENCY: '#B83232',
  OFFLINE: '#757575',
  ON_HOLD: '#641C2D',
};

const getTileUrl = (mapType, z, x, y) => {
  if (mapType === 'satellite') {
    return `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
  }
  if (mapType === 'carto') {
    const sub = ['a', 'b', 'c', 'd'][Math.abs((x + y) % 4)];
    return `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  }
  return `https://mt1.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}`;
};

export const AdminLiveDetailMap = ({
  plannedCoords = [], // [[lng, lat], ...]
  trackCoords = [], // [{ latitude, longitude, speed_kmh, heading, accuracy_meters, recorded_at }, ...]
  liveState = null, // { lat, lng, speed, heading, accuracy, status, hold_active }
  sourceName = 'Origin Upashray',
  destName = 'Destination Upashray',
  currentHold = null,
  handoverPoint = null,
  height = 360,
  style = {},
}) => {
  const [viewDims, setViewDims] = useState({ width: SCREEN_WIDTH, height });
  const [zoom, setZoom] = useState(15);
  const [panDelta, setPanDelta] = useState({ x: 0, y: 0 });
  const [mapType, setMapType] = useState('google'); // 'google' | 'satellite' | 'carto'

  // Default initial center from liveState or plannedCoords
  const initialCenter = useMemo(() => {
    if (liveState?.lat && liveState?.lng) {
      return { lat: Number(liveState.lat), lng: Number(liveState.lng) };
    }
    if (plannedCoords && plannedCoords.length > 0) {
      const [lng, lat] = plannedCoords[0];
      return { lat, lng };
    }
    return { lat: 21.1850, lng: 72.8020 };
  }, [liveState, plannedCoords]);

  const [center, setCenter] = useState(initialCenter);

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

  // Pulse animation for live puck
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Keep centered if liveState updates and user isn't actively panning
  useEffect(() => {
    if (liveState?.lat && liveState?.lng && panDelta.x === 0 && panDelta.y === 0) {
      setCenter({ lat: Number(liveState.lat), lng: Number(liveState.lng) });
    }
  }, [liveState?.lat, liveState?.lng]);

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

  // Center on Sevak action
  const handleRecenter = () => {
    if (liveState?.lat && liveState?.lng) {
      setCenter({ lat: Number(liveState.lat), lng: Number(liveState.lng) });
      setZoom(15);
      setPanDelta({ x: 0, y: 0 });
    }
  };

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

  const cycleMapType = () => {
    setMapType((prev) => {
      if (prev === 'google') return 'satellite';
      if (prev === 'satellite') return 'carto';
      return 'google';
    });
  };

  // Compute visible tiles
  const { tiles, minScreenPx } = useMemo(() => {
    const W = viewDims.width || SCREEN_WIDTH;
    const H = viewDims.height || height;

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
  }, [center, zoom, panDelta, viewDims, height, mapType]);

  // Planned route string for SVG Polyline
  const routePolylinePoints = useMemo(() => {
    if (!plannedCoords || plannedCoords.length < 2) return '';
    return plannedCoords
      .map(([lng, lat]) => {
        const px = latLngToWorldPixel(lat, lng, zoom);
        return `${px.x - minScreenPx.x},${px.y - minScreenPx.y}`;
      })
      .join(' ');
  }, [plannedCoords, zoom, minScreenPx]);

  // Projected GPS track points
  const projectedTrack = useMemo(() => {
    if (!trackCoords || trackCoords.length === 0) return [];
    return trackCoords.map((pt) => {
      const lat = Number(pt.latitude);
      const lng = Number(pt.longitude);
      const px = latLngToWorldPixel(lat, lng, zoom);
      return {
        x: px.x - minScreenPx.x,
        y: px.y - minScreenPx.y,
      };
    });
  }, [trackCoords, zoom, minScreenPx]);

  // Projected live puck
  const livePuck = useMemo(() => {
    if (!liveState?.lat || !liveState?.lng) return null;
    const lat = Number(liveState.lat);
    const lng = Number(liveState.lng);
    const px = latLngToWorldPixel(lat, lng, zoom);
    return {
      x: px.x - minScreenPx.x,
      y: px.y - minScreenPx.y,
      heading: Number(liveState.heading) || 0,
      accuracy: Number(liveState.accuracy) || 10,
      status: liveState.status || 'SAFE',
    };
  }, [liveState, zoom, minScreenPx]);

  // Projected Source & Destination
  const sourcePoint = useMemo(() => {
    if (!plannedCoords || plannedCoords.length === 0) return null;
    const [lng, lat] = plannedCoords[0];
    const px = latLngToWorldPixel(lat, lng, zoom);
    return { x: px.x - minScreenPx.x, y: px.y - minScreenPx.y };
  }, [plannedCoords, zoom, minScreenPx]);

  const destPoint = useMemo(() => {
    if (!plannedCoords || plannedCoords.length < 2) return null;
    const [lng, lat] = plannedCoords[plannedCoords.length - 1];
    const px = latLngToWorldPixel(lat, lng, zoom);
    return { x: px.x - minScreenPx.x, y: px.y - minScreenPx.y };
  }, [plannedCoords, zoom, minScreenPx]);

  const statusColor = STATUS_COLORS[liveState?.status] || STATUS_COLORS.SAFE;
  const mapTypeLabel =
    mapType === 'google' ? 'Google Roads' : mapType === 'satellite' ? 'Satellite' : 'Voyager';

  return (
    <View
      style={[styles.container, { height }, style]}
      onLayout={(e) => {
        const { width, height: h } = e.nativeEvent.layout;
        if (width > 0 && h > 0) {
          setViewDims({ width, height: h });
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

      {/* 2. Interactive SVG Overlay for Route, Breadcrumbs, Pins & Live Puck */}
      <View style={styles.overlayLayer} pointerEvents="box-none">
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewDims.width || SCREEN_WIDTH} ${viewDims.height || height}`}
          pointerEvents="box-none"
        >
          {/* Planned Route Line (Gold Outer Glow) */}
          {routePolylinePoints ? (
            <Polyline
              points={routePolylinePoints}
              stroke="rgba(217, 138, 43, 0.45)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}

          {/* Planned Route Line (Deep Maroon Core) */}
          {routePolylinePoints ? (
            <Polyline
              points={routePolylinePoints}
              stroke={colors.deepMaroon}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}

          {/* GPS Track Breadcrumbs */}
          {projectedTrack.map((pt, idx) => (
            <Circle
              key={`track-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill={colors.saffron}
              opacity={0.8}
            />
          ))}

          {/* Source Pin */}
          {sourcePoint && (
            <G>
              <Circle cx={sourcePoint.x} cy={sourcePoint.y} r={10} fill="#2E7D5B" stroke="#FFFFFF" strokeWidth={2.5} />
            </G>
          )}

          {/* Destination Pin */}
          {destPoint && (
            <G>
              <Circle cx={destPoint.x} cy={destPoint.y} r={10} fill={colors.deepMaroon} stroke="#FFFFFF" strokeWidth={2.5} />
            </G>
          )}

          {/* Live Sevak Puck */}
          {livePuck && (
            <G>
              {/* GPS Accuracy Circle */}
              <Circle
                cx={livePuck.x}
                cy={livePuck.y}
                r={Math.max(22, Math.min(50, livePuck.accuracy * 1.5))}
                fill={statusColor}
                opacity={0.18}
              />

              {/* Heading Pointer Arrow */}
              {(() => {
                const headingRad = ((livePuck.heading - 90) * Math.PI) / 180;
                const arrowX = livePuck.x + Math.cos(headingRad) * 26;
                const arrowY = livePuck.y + Math.sin(headingRad) * 26;
                return (
                  <Line
                    x1={livePuck.x}
                    y1={livePuck.y}
                    x2={arrowX}
                    y2={arrowY}
                    stroke={statusColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                );
              })()}

              {/* Live Location Marker Body */}
              <Circle
                cx={livePuck.x}
                cy={livePuck.y}
                r={16}
                fill={statusColor}
                stroke="#FFFFFF"
                strokeWidth={3}
              />

              {/* Center Dot */}
              <Circle
                cx={livePuck.x}
                cy={livePuck.y}
                r={5}
                fill="#FFFFFF"
              />
            </G>
          )}
        </Svg>
      </View>

      {/* 3. Native Overlays for Pins & Live Badge (Zero SVG text overlapping) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {sourcePoint && (
          <View
            style={[
              styles.nativeDetailBadge,
              {
                left: sourcePoint.x - 50,
                top: sourcePoint.y - 28,
                borderColor: '#2E7D5B',
              },
              shadows.sm,
            ]}
            pointerEvents="none"
          >
            <View style={[styles.calloutStatusDot, { backgroundColor: '#2E7D5B' }]} />
            <Text style={[styles.detailBadgeText, { color: '#2E7D5B' }]} numberOfLines={1}>
              START: {sourceName.split(' ')[0]}
            </Text>
          </View>
        )}

        {destPoint && (
          <View
            style={[
              styles.nativeDetailBadge,
              {
                left: destPoint.x - 50,
                top: destPoint.y + 14,
                borderColor: colors.deepMaroon,
              },
              shadows.sm,
            ]}
            pointerEvents="none"
          >
            <View style={[styles.calloutStatusDot, { backgroundColor: colors.deepMaroon }]} />
            <Text style={[styles.detailBadgeText, { color: colors.deepMaroon }]} numberOfLines={1}>
              END: {destName.split(' ')[0]}
            </Text>
          </View>
        )}

        {livePuck && (
          <View
            style={[
              styles.nativeCalloutBadge,
              {
                left: livePuck.x - 60,
                top: livePuck.y + 22,
                borderColor: statusColor,
                borderWidth: 1.5,
              },
              shadows.sm,
            ]}
            pointerEvents="none"
          >
            <View style={[styles.calloutStatusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.calloutNameText}>LIVE</Text>
            <View style={[styles.calloutTagPill, { backgroundColor: livePuck.status === 'SAFE' ? '#E8F5E9' : '#FFF9E6' }]}>
              <Text style={[styles.calloutTagText, { color: statusColor }]}>{livePuck.status}</Text>
            </View>
          </View>
        )}
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
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Text style={styles.ctrlBtnText}>📍 Center</Text>
        </TouchableOpacity>
      </View>

      {/* Zoom In / Zoom Out Controls */}
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

      {/* Attribution Footer */}
      <View style={styles.attributionPill}>
        <Text style={styles.attributionText}>
          {mapType === 'carto' ? '© OpenStreetMap • CARTO' : '© Google Maps • Live Radar'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
    bottom: 24,
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
  nativeDetailBadge: {
    position: 'absolute',
    width: 100,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 5,
    borderWidth: 1,
    zIndex: 15,
  },
  detailBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  nativeCalloutBadge: {
    position: 'absolute',
    minWidth: 124,
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 8,
    zIndex: 15,
  },
  calloutStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  calloutNameText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.deepMaroon,
    marginRight: 6,
  },
  calloutTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  calloutTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
