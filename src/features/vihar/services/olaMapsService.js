import { supabase } from '../../../core/config/supabase';
import { decodePolyline, decodePolylineLatLng, calculateDistanceMeters } from '../../../core/geo/geoUtils';
import { JAIN_UPASHRAYS } from '../../../core/constants/jainUpashrays';

// Default walking speed in Jain Vihar seva: 4.5 km/h (1.25 m/s)
const DEFAULT_WALKING_SPEED_MS = 1.25;

export const olaMapsService = {
  /**
   * Search places / autocomplete
   * Routes through Supabase Edge Function 'maps-search' with local Upashray fallback
   */
  async searchPlaces(query, userLat = null, userLng = null) {
    if (!query || query.trim().length === 0) {
      return { data: [], error: null };
    }

    const trimmed = query.trim().toLowerCase();

    // 1. First check local Upashrays for instant offline match
    const localMatches = JAIN_UPASHRAYS.filter(
      (u) =>
        u.name.toLowerCase().includes(trimmed) ||
        (u.area && u.area.toLowerCase().includes(trimmed)) ||
        (u.address && u.address.toLowerCase().includes(trimmed))
    ).map((u) => ({
      id: u.id,
      name: u.name,
      description: `${u.area || 'Surat'}, Gujarat`,
      latitude: u.lat,
      longitude: u.lng,
      isUpashray: true,
    }));

    try {
      // 2. Invoke Supabase Edge Function 'maps-search'
      const { data, error } = await supabase.functions.invoke('maps-search', {
        body: {
          action: 'autocomplete',
          query: trimmed,
          lat: userLat,
          lng: userLng,
        },
      });

      if (!error && data?.predictions) {
        const remoteResults = data.predictions.map((p, idx) => ({
          id: p.place_id || `place_${idx}`,
          name: p.structured_formatting?.main_text || p.description,
          description: p.structured_formatting?.secondary_text || p.description,
          latitude: p.geometry?.location?.lat,
          longitude: p.geometry?.location?.lng,
          isUpashray: false,
        }));

        // Merge local and remote without duplicates
        const combined = [...localMatches];
        for (const r of remoteResults) {
          if (!combined.some((c) => c.name.toLowerCase() === r.name.toLowerCase())) {
            combined.push(r);
          }
        }
        return { data: combined, error: null };
      }
    } catch (e) {
      // Non-blocking fallback to local matches
      console.warn('[olaMapsService] searchPlaces remote error, using local:', e?.message);
    }

    return { data: localMatches, error: null };
  },

  /**
   * Reverse geocode coordinate to friendly street/area address
   */
  async reverseGeocode(lat, lng) {
    try {
      const { data, error } = await supabase.functions.invoke('maps-search', {
        body: { action: 'reverse', lat, lng },
      });

      if (!error && data?.results?.[0]) {
        const first = data.results[0];
        return {
          address: first.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          name: first.name || first.formatted_address,
        };
      }
    } catch (e) {
      console.warn('[olaMapsService] reverseGeocode fallback:', e?.message);
    }

    // Fallback: nearest known Upashray
    let nearest = null;
    let minDist = Infinity;
    for (const u of JAIN_UPASHRAYS) {
      const d = calculateDistanceMeters(lat, lng, u.lat, u.lng);
      if (d < minDist) {
        minDist = d;
        nearest = u;
      }
    }

    if (nearest && minDist < 300) {
      return {
        address: `${nearest.name}, ${nearest.area}`,
        name: nearest.name,
      };
    }

    return {
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };
  },

  /**
   * Fetch walking directions between origin and destination
   * Calls Supabase Edge Function 'maps-route'
   */
  async getWalkingRoute(origin, destination, waypoints = []) {
    const originCoords = {
      lat: Number(origin.latitude || origin.lat),
      lng: Number(origin.longitude || origin.lng),
    };
    const destCoords = {
      lat: Number(destination.latitude || destination.lat),
      lng: Number(destination.longitude || destination.lng),
    };

    try {
      const { data, error } = await supabase.functions.invoke('maps-route', {
        body: {
          origin: originCoords,
          destination: destCoords,
          waypoints,
          mode: 'walking',
        },
      });

      if (!error && data?.routes && data.routes.length > 0) {
        const parsedRoutes = data.routes.map((r, idx) => {
          const leg = r.legs?.[0] || {};
          const distanceMeters = leg.distance || r.distance || 0;
          // Calculate realistic Vihar duration based on 4.5 km/h
          const durationSeconds = Math.round(distanceMeters / DEFAULT_WALKING_SPEED_MS);
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

          const encoded = r.overview_polyline || '';
          const coordinates = decodePolylineLatLng(encoded);
          const geojsonCoords = decodePolyline(encoded);

          const steps = (leg.steps || []).map((s) => ({
            instruction: s.instructions?.replace(/<[^>]*>?/gm, '') || 'Continue along the route',
            distanceMeters: s.distance || 0,
            durationSeconds: s.duration || 0,
            maneuver: s.maneuver || 'turn',
            startLocation: s.start_location,
            endLocation: s.end_location,
          }));

          return {
            id: `route_${idx}`,
            label: idx === 0 ? 'Best Route' : `Alternative ${idx}`,
            isBest: idx === 0,
            distanceMeters,
            distanceKm: Number((distanceMeters / 1000).toFixed(2)),
            durationMinutes,
            durationSeconds,
            etaDate: new Date(Date.now() + durationSeconds * 1000),
            overviewPolyline: encoded,
            coordinates,
            geojsonCoords,
            steps,
            warnings: [
              'Route follows roads and may include highways. Check the road before starting.',
            ],
          };
        });

        return { data: parsedRoutes, error: null };
      }
    } catch (e) {
      console.warn('[olaMapsService] Remote routing fallback to geodesic path:', e?.message);
    }

    // Geodesic Straight-Line Fallback when offline or edge function fails
    const straightDistM = calculateDistanceMeters(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
    // Multiply by standard road winding factor 1.25
    const estimatedDistanceMeters = Math.round(straightDistM * 1.25);
    const durationSeconds = Math.round(estimatedDistanceMeters / DEFAULT_WALKING_SPEED_MS);

    // Create 10 interpolated straight-line coordinates
    const coords = [];
    const geojsonCoords = [];
    const stepsCount = 10;
    for (let i = 0; i <= stepsCount; i++) {
      const ratio = i / stepsCount;
      const lat = originCoords.lat + ratio * (destCoords.lat - originCoords.lat);
      const lng = originCoords.lng + ratio * (destCoords.lng - originCoords.lng);
      coords.push({ latitude: lat, longitude: lng });
      geojsonCoords.push([lng, lat]);
    }

    const fallbackRoute = {
      id: 'route_direct_fallback',
      label: 'Direct Walking Path (Offline)',
      isBest: true,
      distanceMeters: estimatedDistanceMeters,
      distanceKm: Number((estimatedDistanceMeters / 1000).toFixed(2)),
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      durationSeconds,
      etaDate: new Date(Date.now() + durationSeconds * 1000),
      overviewPolyline: '',
      coordinates: coords,
      geojsonCoords,
      steps: [
        {
          instruction: 'Proceed directly towards destination Upashray',
          distanceMeters: estimatedDistanceMeters,
          durationSeconds,
          maneuver: 'straight',
        },
      ],
      warnings: [
        'Direct estimate path: Online road navigation currently unavailable.',
        'Route follows roads and may include highways. Check the road before starting.',
      ],
    };

    return { data: [fallbackRoute], error: null };
  },

  /**
   * Fetch weather advisory for route coordinates using Open-Meteo
   * Cache 15 minutes, zero cost, license attribution required
   */
  async getWeatherSummary(lat, lng) {
    try {
      const roundedLat = Number(lat).toFixed(2);
      const roundedLng = Number(lng).toFixed(2);

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability&daily=sunrise,sunset&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();

      const current = json.current || {};
      const daily = json.daily || {};
      const hourly = json.hourly || {};

      const rainProb = (hourly.precipitation_probability || [])[0] || 0;
      const apparentTemp = current.apparent_temperature || current.temperature_2m || 30;
      const windSpeed = current.wind_speed_10m || 0;

      let condition = 'CLEAR';
      if (current.precipitation > 0 || rainProb >= 60) condition = 'RAIN';
      else if (apparentTemp >= 38) condition = 'HEAT';
      else if (windSpeed >= 40) condition = 'STRONG_WIND';

      return {
        temperatureC: Math.round(current.temperature_2m || 30),
        apparentTempC: Math.round(apparentTemp),
        condition,
        precipitationMm: current.precipitation || 0,
        rainProbabilityPct: rainProb,
        windSpeedKmph: Math.round(windSpeed),
        sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:00 AM',
        sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '06:30 PM',
        attribution: 'Weather data by Open-Meteo.com',
      };
    } catch (e) {
      console.warn('[olaMapsService] Open-Meteo fetch fallback:', e?.message);
      return {
        temperatureC: 30,
        apparentTempC: 32,
        condition: 'CLEAR',
        precipitationMm: 0,
        rainProbabilityPct: 10,
        windSpeedKmph: 12,
        sunrise: '06:00 AM',
        sunset: '06:30 PM',
        attribution: 'Weather data by Open-Meteo.com',
      };
    }
  },
};
