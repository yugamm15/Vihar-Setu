import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  UIManager,
  Platform,
} from 'react-native';
import { colors } from '../../core/theme/colors';
import { spacing, borderRadius } from '../../core/theme/spacing';
import { NavigationIcon } from './CustomSvgIcons';
import { t } from '../../core/localization/i18n';

// Check if native AIRMap component is registered in this APK
const isAIRMapAvailable = Boolean(
  UIManager.getViewManagerConfig &&
  (UIManager.getViewManagerConfig('AIRMap') || UIManager.getViewManagerConfig('AIRMapMarker'))
);

let NativeMapView = null;
let NativeMarker = null;
let NativePolyline = null;
let NativeCircle = null;
let NativeUrlTile = null;

if (isAIRMapAvailable) {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    NativeMarker = Maps.Marker;
    NativePolyline = Maps.Polyline;
    NativeCircle = Maps.Circle;
    NativeUrlTile = Maps.UrlTile;
  } catch (e) {
    NativeMapView = null;
  }
}

/**
 * SafeMapView
 * Renders react-native-maps if natively linked, or an elegant, non-redundant
 * visual Vihar Route Preview block with direct Google Maps turn-by-turn navigation.
 */
export const SafeMapView = ({
  sourceCoordinate,
  destinationCoordinate,
  liveCoordinate,
  sourceName = 'Source Upashray',
  destinationName = 'Destination',
  accuracy = 10,
  style,
}) => {
  const mapCenter = liveCoordinate || sourceCoordinate;

  const handleOpenGoogleMaps = () => {
    const sLat = sourceCoordinate?.latitude || 21.1959;
    const sLng = sourceCoordinate?.longitude || 72.7933;
    const dLat = destinationCoordinate?.latitude || 21.1442;
    const dLng = destinationCoordinate?.longitude || 72.7758;

    const url = liveCoordinate
      ? `https://www.google.com/maps/dir/?api=1&origin=${liveCoordinate.latitude},${liveCoordinate.longitude}&destination=${dLat},${dLng}&travelmode=walking`
      : `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${dLat},${dLng}&travelmode=walking`;

    Linking.openURL(url).catch((err) => {
      console.warn('Could not open Google Maps navigation:', err);
    });
  };

  // If native AIRMap is compiled and available, render the full interactive map
  if (isAIRMapAvailable && NativeMapView) {
    return (
      <View style={[styles.mapContainer, style]}>
        <NativeMapView
          style={StyleSheet.absoluteFillObject}
          mapType="none"
          initialRegion={{
            latitude: mapCenter.latitude,
            longitude: mapCenter.longitude,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          showsCompass
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {NativeUrlTile ? (
            <NativeUrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
          ) : null}

          {NativePolyline && sourceCoordinate && destinationCoordinate ? (
            <NativePolyline
              coordinates={[sourceCoordinate, destinationCoordinate]}
              strokeColor={colors.saffron}
              strokeWidth={4}
            />
          ) : null}

          {NativeMarker && sourceCoordinate ? (
            <NativeMarker
              coordinate={sourceCoordinate}
              title={sourceName}
              pinColor={colors.statusSafe}
            />
          ) : null}

          {NativeMarker && destinationCoordinate ? (
            <NativeMarker
              coordinate={destinationCoordinate}
              title={destinationName}
              pinColor={colors.deepMaroon}
            />
          ) : null}

          {liveCoordinate && NativeCircle ? (
            <NativeCircle
              center={liveCoordinate}
              radius={Math.max(accuracy, 10)}
              fillColor="rgba(33, 150, 243, 0.18)"
              strokeColor="rgba(33, 150, 243, 0.7)"
              strokeWidth={1}
            />
          ) : null}

          {liveCoordinate && NativeMarker ? (
            <NativeMarker
              coordinate={liveCoordinate}
              title="Current Sevika Position"
              pinColor="#1976D2"
            />
          ) : null}
        </NativeMapView>
        <Text style={styles.mapAttribution}>© OpenStreetMap</Text>
      </View>
    );
  }

  // Graceful Visual Route Block (Seamlessly fits inside mapCard)
  return (
    <View style={[styles.fallbackFrame, style]}>
      {/* Route Coordinates & Visual Line */}
      <View style={styles.routeVisualization}>
        <View style={styles.routeNodes}>
          <View style={[styles.nodeDot, { backgroundColor: colors.statusSafe }]} />
          <View style={styles.connectingLine} />
          <View style={[styles.nodeDot, { backgroundColor: colors.deepMaroon }]} />
        </View>
        <View style={styles.nodeLabels}>
          <View style={styles.nodeItem}>
            <Text style={styles.nodeRoleLabel}>{t('vihar.start_upashray')}</Text>
            <Text style={styles.nodeTitle} numberOfLines={1}>
              {sourceName}
            </Text>
            <Text style={styles.coordSub}>
              {sourceCoordinate?.latitude?.toFixed(4)}, {sourceCoordinate?.longitude?.toFixed(4)}
            </Text>
          </View>
          <View style={styles.nodeItem}>
            <Text style={[styles.nodeRoleLabel, { color: colors.deepMaroon }]}>{t('vihar.destination')}</Text>
            <Text style={styles.nodeTitle} numberOfLines={1}>
              {destinationName}
            </Text>
            <Text style={styles.coordSub}>
              {destinationCoordinate?.latitude?.toFixed(4)}, {destinationCoordinate?.longitude?.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>

      {/* Live GPS Telemetry Status */}
      <View style={styles.gpsBar}>
        <View style={styles.gpsIndicatorRow}>
          <View
            style={[
              styles.greenPulseDot,
              { backgroundColor: liveCoordinate ? colors.statusSafe : colors.statusWarning },
            ]}
          />
          <Text style={styles.gpsLabel}>
            {liveCoordinate
              ? `${t('vihar.gps_live')} ${liveCoordinate.latitude.toFixed(5)}, ${liveCoordinate.longitude.toFixed(5)}`
              : t('vihar.gps_satellite_searching')}
          </Text>
        </View>
        {liveCoordinate ? (
          <Text style={styles.gpsAccuracy}>±{Math.round(accuracy)}m</Text>
        ) : null}
      </View>

      {/* Turn-by-Turn Google Maps Button */}
      <TouchableOpacity
        style={styles.openMapsBtn}
        activeOpacity={0.85}
        onPress={handleOpenGoogleMaps}
      >
        <NavigationIcon size={16} color={colors.white} />
        <Text style={styles.openMapsBtnText}>{t('vihar.open_turn_by_turn')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#E8E1D5',
    marginVertical: spacing.xs,
  },
  mapAttribution: {
    position: 'absolute',
    right: 4,
    bottom: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#333333',
    fontSize: 9,
    paddingHorizontal: 3,
  },
  fallbackFrame: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  routeVisualization: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#EFE8DA',
  },
  routeNodes: {
    width: 18,
    alignItems: 'center',
    paddingVertical: 5,
  },
  nodeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  connectingLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.saffron,
    marginVertical: 3,
  },
  nodeLabels: {
    flex: 1,
    paddingLeft: spacing.xs,
    justifyContent: 'space-between',
  },
  nodeItem: {
    marginVertical: 2,
  },
  nodeRoleLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.statusSafe,
    letterSpacing: 0.5,
  },
  nodeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  coordSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  gpsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  gpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  gpsLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  gpsAccuracy: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.deepMaroon,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    marginTop: 4,
  },
  openMapsBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
});
