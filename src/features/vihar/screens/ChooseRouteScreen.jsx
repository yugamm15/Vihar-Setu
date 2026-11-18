import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { borderRadius, spacing, shadows } from '../../../core/theme/spacing';
import { t } from '../../../core/localization/i18n';
import { olaMapsService } from '../services/olaMapsService';
import { AiOrchestrator } from '../../ai/AiOrchestrator';
import { BriefingCard } from '../components/BriefingCard';
import { JAIN_UPASHRAYS } from '../../../core/constants/jainUpashrays';

// Default map center (Surat central)
const DEFAULT_CENTER = {
  latitude: 21.1959,
  longitude: 72.8302,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const ChooseRouteScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  // GPS State
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Origin & Destination State
  const [origin, setOrigin] = useState(null); // { name, latitude, longitude }
  const [destination, setDestination] = useState(null);
  const [activePicker, setActivePicker] = useState(null); // 'origin' | 'destination' | null
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Pin Drop Mode
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [pinDropTarget, setPinDropTarget] = useState('destination');
  const [centerCoords, setCenterCoords] = useState(DEFAULT_CENTER);

  // Routes & Advice State
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [briefing, setBriefing] = useState(null);

  // 1. Check & Request Permissions on Mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    setIsLocating(true);
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission Required',
            message:
              'Jinaarya Vihar Setu requires your precise location to verify the Vihar starting point and ensure safety.',
            buttonPositive: 'Grant Permission',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionGranted(true);
          getFreshLocation();
        } else {
          setIsLocating(false);
          Alert.alert(
            'Permission Denied',
            'GPS location is required to verify the starting point of Vihar seva.'
          );
        }
      } catch (err) {
        console.warn(err);
        setIsLocating(false);
      }
    } else {
      setPermissionGranted(true);
      getFreshLocation();
    }
  };

  const getFreshLocation = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const userLoc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          fixTime: new Date(pos.timestamp),
          isMock: Boolean(pos.mocked),
        };
        setCurrentPosition(userLoc);
        setIsLocating(false);

        // Auto-center map on user
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: userLoc.latitude,
            longitude: userLoc.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }

        // Default origin to current location if not set
        if (!origin) {
          olaMapsService.reverseGeocode(userLoc.latitude, userLoc.longitude).then((res) => {
            setOrigin({
              name: res.name || 'My Current Location',
              address: res.address,
              latitude: userLoc.latitude,
              longitude: userLoc.longitude,
              isCurrentLocation: true,
            });
          });
        }
      },
      (err) => {
        console.warn('[ChooseRouteScreen] GPS Error:', err);
        setIsLocating(false);
        // Fallback to Surat Central
        if (!origin) {
          const defaultUpashray = JAIN_UPASHRAYS[0];
          setOrigin({
            name: defaultUpashray.name,
            address: defaultUpashray.area,
            latitude: defaultUpashray.lat,
            longitude: defaultUpashray.lng,
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // 2. Search Places Handler
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data } = await olaMapsService.searchPlaces(
      text,
      currentPosition?.latitude,
      currentPosition?.longitude
    );
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const selectPlace = (place) => {
    const selected = {
      name: place.name,
      address: place.description,
      latitude: place.latitude,
      longitude: place.longitude,
    };

    if (activePicker === 'origin') {
      setOrigin(selected);
    } else {
      setDestination(selected);
    }

    setActivePicker(null);
    setSearchQuery('');
    setSearchResults([]);

    // Pan map to selected place
    if (mapRef.current && place.latitude && place.longitude) {
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  // 3. Fetch Walking Route when Origin & Destination are set
  useEffect(() => {
    if (origin && destination) {
      fetchRoute();
    }
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  const fetchRoute = async () => {
    if (!origin || !destination) return;
    setIsRouting(true);

    const { data, error } = await olaMapsService.getWalkingRoute(origin, destination);
    if (data && data.length > 0) {
      setRoutes(data);
      setSelectedRouteIndex(0);

      // Fit map to route bounds
      const selected = data[0];
      if (mapRef.current && selected.coordinates.length > 0) {
        mapRef.current.fitToCoordinates(selected.coordinates, {
          edgePadding: { top: 120, right: 40, bottom: 280, left: 40 },
          animated: true,
        });
      }

      // Fetch Weather for route midpoint
      const midIdx = Math.floor(selected.coordinates.length / 2);
      const midPoint = selected.coordinates[midIdx] || origin;
      olaMapsService.getWeatherSummary(midPoint.latitude, midPoint.longitude).then((weather) => {
        setWeatherData(weather);

        // Generate AI Vihar Briefing
        const briefingOutput = AiOrchestrator.generateBriefing({
          navContext: {
            routeProgressMeters: 0,
            totalDistanceMeters: selected.distanceMeters,
            currentSpeedKmph: 4.5,
            sunsetTime: weather.sunset,
          },
          weatherData: weather,
          safetyContext: {
            batteryPercentage: 95,
            networkStatus: 'ONLINE',
            gpsAccuracyMeters: currentPosition?.accuracy || 5,
          },
        });
        setBriefing(briefingOutput);
      });
    }

    setIsRouting(false);
  };

  const handleUseMyLocation = () => {
    if (currentPosition) {
      setOrigin({
        name: 'My Current Location',
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        isCurrentLocation: true,
      });
      setActivePicker(null);
    } else {
      getFreshLocation();
    }
  };

  const handleConfirmPinDrop = () => {
    const selected = {
      name: `Pinned Location (${centerCoords.latitude.toFixed(4)}, ${centerCoords.longitude.toFixed(4)})`,
      latitude: centerCoords.latitude,
      longitude: centerCoords.longitude,
    };
    if (pinDropTarget === 'origin') {
      setOrigin(selected);
    } else {
      setDestination(selected);
    }
    setIsPinDropMode(false);
  };

  const handleNextToDetails = () => {
    if (!origin || !destination) {
      Alert.alert('Incomplete Route', 'Please select both Starting Point and Destination.');
      return;
    }
    const activeRoute = routes[selectedRouteIndex] || routes[0];
    navigation.navigate('ViharDetails', {
      origin,
      destination,
      route: activeRoute,
      weatherData,
      currentPosition,
    });
  };

  const currentRoute = routes[selectedRouteIndex] || null;

  return (
    <View style={styles.container}>
      {/* Full-Screen Interactive Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_CENTER}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onRegionChangeComplete={(region) => {
          setCenterCoords({
            latitude: region.latitude,
            longitude: region.longitude,
          });
        }}
      >
        {/* Origin Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
            title="Start Point"
            pinColor={colors.statusSafe}
          />
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
            title="Destination"
            pinColor={colors.deepMaroon}
          />
        )}

        {/* Walking Route Polylines */}
        {routes.map((r, idx) => (
          <Polyline
            key={r.id || idx}
            coordinates={r.coordinates}
            strokeColor={idx === selectedRouteIndex ? colors.saffron : '#BCAAA4'}
            strokeWidth={idx === selectedRouteIndex ? 5 : 3}
            tappable
            onPress={() => setSelectedRouteIndex(idx)}
          />
        ))}
      </MapView>

      {/* Crosshair for Pin Drop Mode */}
      {isPinDropMode && (
        <View pointerEvents="none" style={styles.crosshairContainer}>
          <Text style={styles.crosshairPin}>📍</Text>
        </View>
      )}

      {/* Top Floating Controls */}
      <View style={styles.topContainer}>
        {/* Finding GPS Banner */}
        {isLocating && (
          <View style={[styles.locatingBanner, shadows.subtle]}>
            <ActivityIndicator size="small" color={colors.saffron} />
            <Text style={styles.locatingText}>Finding your precise location...</Text>
          </View>
        )}

        {/* Origin & Destination Card */}
        {!isPinDropMode && (
          <View style={[styles.routeCard, shadows.elevated]}>
            {/* Origin Row */}
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => {
                setActivePicker('origin');
                setSearchQuery('');
              }}
            >
              <View style={[styles.dot, { backgroundColor: colors.statusSafe }]} />
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>START POINT</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {origin ? origin.name : 'Select starting upashray or place...'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Destination Row */}
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => {
                setActivePicker('destination');
                setSearchQuery('');
              }}
            >
              <View style={[styles.dot, { backgroundColor: colors.deepMaroon }]} />
              <View style={styles.locationTextCol}>
                <Text style={styles.locationLabel}>DESTINATION</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {destination ? destination.name : 'Choose destination upashray...'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pin Drop Mode Banner */}
        {isPinDropMode && (
          <View style={[styles.pinDropBanner, shadows.elevated]}>
            <Text style={styles.pinDropTitle}>Drag map to position pin</Text>
            <View style={styles.pinDropBtnRow}>
              <TouchableOpacity
                style={styles.pinDropCancelBtn}
                onPress={() => setIsPinDropMode(false)}
              >
                <Text style={styles.pinDropCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pinDropConfirmBtn}
                onPress={handleConfirmPinDrop}
              >
                <Text style={styles.pinDropConfirmText}>Confirm Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Floating My-Location Button */}
      <TouchableOpacity
        style={[styles.myLocationBtn, shadows.card]}
        onPress={getFreshLocation}
        activeOpacity={0.8}
      >
        <Text style={styles.myLocationIcon}>🎯</Text>
      </TouchableOpacity>

      {/* Place Search Modal / Sheet */}
      {activePicker && (
        <View style={styles.searchSheet}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activePicker === 'origin' ? 'starting place' : 'destination'}...`}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            <TouchableOpacity onPress={() => setActivePicker(null)} style={styles.searchCloseBtn}>
              <Text style={styles.searchCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Shortcut: Use Current Location */}
          {activePicker === 'origin' && (
            <TouchableOpacity style={styles.shortcutItem} onPress={handleUseMyLocation}>
              <Text style={styles.shortcutIcon}>📍</Text>
              <Text style={styles.shortcutText}>Use my current location</Text>
            </TouchableOpacity>
          )}

          {/* Shortcut: Drop a pin on map */}
          <TouchableOpacity
            style={styles.shortcutItem}
            onPress={() => {
              setPinDropTarget(activePicker);
              setIsPinDropMode(true);
              setActivePicker(null);
            }}
          >
            <Text style={styles.shortcutIcon}>📌</Text>
            <Text style={styles.shortcutText}>Drop a pin on map</Text>
          </TouchableOpacity>

          {/* Results List */}
          <ScrollView style={styles.resultsList}>
            {isSearching && <ActivityIndicator color={colors.saffron} style={{ margin: 16 }} />}
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultItem}
                onPress={() => selectPlace(item)}
              >
                <Text style={styles.resultIcon}>{item.isUpashray ? '🏛️' : '📍'}</Text>
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom Route Preview Sheet */}
      {!activePicker && !isPinDropMode && currentRoute && (
        <View style={[styles.bottomSheet, shadows.elevated]}>
          {/* Route Stats Summary */}
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.routeDistance}>{currentRoute.distanceKm} km</Text>
              <Text style={styles.routeDuration}>
                ~{currentRoute.durationMinutes} mins · ETA {currentRoute.etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Alternatives Picker */}
            {routes.length > 1 && (
              <View style={styles.routesTabs}>
                {routes.map((r, idx) => (
                  <TouchableOpacity
                    key={r.id || idx}
                    onPress={() => setSelectedRouteIndex(idx)}
                    style={[
                      styles.routeTab,
                      selectedRouteIndex === idx && styles.routeTabActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.routeTabText,
                        selectedRouteIndex === idx && styles.routeTabTextActive,
                      ]}
                    >
                      {r.isBest ? 'Best' : `Alt ${idx}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Mandatory Safety Note */}
          <View style={styles.highwayWarningBox}>
            <Text style={styles.highwayWarningText}>
              ⚠️ Route follows roads and may include highways. Check the road before starting.
            </Text>
          </View>

          {/* Advisory Briefing Card */}
          {briefing && <BriefingCard briefing={briefing} />}

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNextToDetails}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next: Vihar Details ➔</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  locatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
    alignSelf: 'center',
    gap: 8,
  },
  locatingText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  locationTextCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  locationValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.xs,
    marginLeft: 18,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    bottom: 260,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    zIndex: 10,
  },
  myLocationIcon: {
    fontSize: 22,
  },
  crosshairContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -15,
    marginTop: -30,
    zIndex: 5,
  },
  crosshairPin: {
    fontSize: 32,
  },
  pinDropBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  pinDropTitle: {
    ...typography.h4,
    color: colors.deepMaroon,
    marginBottom: spacing.sm,
  },
  pinDropBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pinDropCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  pinDropCancelText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pinDropConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron,
  },
  pinDropConfirmText: {
    ...typography.caption,
    color: colors.warmIvory,
    fontWeight: '800',
  },
  searchSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  searchCloseBtn: {
    paddingLeft: spacing.md,
  },
  searchCloseText: {
    ...typography.caption,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: '#FFFDF7',
  },
  shortcutIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  shortcutText: {
    ...typography.bodyMedium,
    color: colors.deepMaroon,
    fontWeight: '700',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  resultTextCol: {
    flex: 1,
  },
  resultName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.md,
    maxHeight: 280,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  routeDistance: {
    ...typography.h3,
    color: colors.deepMaroon,
  },
  routeDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  routesTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  routeTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  routeTabActive: {
    backgroundColor: colors.deepMaroon,
  },
  routeTabText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  routeTabTextActive: {
    color: colors.warmIvory,
    fontWeight: '800',
  },
  highwayWarningBox: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.statusWarning,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginVertical: spacing.xs,
  },
  highwayWarningText: {
    fontSize: 10,
    color: '#8D6E63',
    lineHeight: 14,
  },
  nextBtn: {
    backgroundColor: colors.saffron,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  nextBtnText: {
    ...typography.button,
    color: colors.warmIvory,
    fontWeight: '800',
  },
});
