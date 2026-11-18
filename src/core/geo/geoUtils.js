/**
 * JINAARYA VIHAR SETU — Core Geodesic & Polyline Utilities
 * Zero external budget • Pure mathematical geodesy & polyline geometry
 */

/**
 * Earth radius in meters (WGS 84 mean spherical radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate great-circle distance between two coordinates using the Haversine formula
 * @param {number} lat1 Latitude 1
 * @param {number} lon1 Longitude 1
 * @param {number} lat2 Latitude 2
 * @param {number} lon2 Longitude 2
 * @returns {number} Distance in meters
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

/**
 * Calculate initial compass bearing from point 1 to point 2 in degrees [0, 360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Decode an encoded polyline string (Google / Ola Maps format)
 * Returns array of [longitude, latitude] for GeoJSON coordinates
 * @param {string} encoded Encoded polyline string
 * @returns {Array<[number, number]>} Array of [lng, lat] coordinate pairs
 */
export const decodePolyline = (encoded) => {
  if (!encoded || typeof encoded !== 'string') return [];

  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Convert to floating point degrees [lng, lat] for GeoJSON format
    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
};

/**
 * Decode polyline directly to array of { latitude, longitude }
 */
export const decodePolylineLatLng = (encoded) => {
  return decodePolyline(encoded).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
};

/**
 * Calculate perpendicular distance from point P to line segment AB in meters
 */
const perpendicularDistanceToSegment = (pLat, pLon, aLat, aLon, bLat, bLon) => {
  const lineDist = calculateDistanceMeters(aLat, aLon, bLat, bLon);
  if (lineDist === 0) return calculateDistanceMeters(pLat, pLon, aLat, aLon);

  const x = (bLon - aLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const y = bLat - aLat;
  const px = (pLon - aLon) * Math.cos(((aLat + pLat) / 2) * (Math.PI / 180));
  const py = pLat - aLat;

  const t = Math.max(0, Math.min(1, (px * x + py * y) / (x * x + y * y)));
  const projLat = aLat + t * (bLat - aLat);
  const projLon = aLon + t * (bLon - aLon);

  return {
    distance: calculateDistanceMeters(pLat, pLon, projLat, projLon),
    projLat,
    projLon,
    segmentProgressRatio: t,
  };
};

/**
 * Find minimum distance from a coordinate point to a polyline
 * @param {{ latitude: number, longitude: number }} point Point object
 * @param {Array<[number, number]>} polylinePoints Array of [lng, lat] coordinates
 * @returns {number} Minimum distance in meters
 */
export const distanceToPolyline = (point, polylinePoints) => {
  if (!point || !polylinePoints || polylinePoints.length < 2) return 0;

  let minDistance = Infinity;

  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const [aLon, aLat] = polylinePoints[i];
    const [bLon, bLat] = polylinePoints[i + 1];

    const { distance } = perpendicularDistanceToSegment(
      point.latitude,
      point.longitude,
      aLat,
      aLon,
      bLat,
      bLon
    );

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return Math.round(minDistance);
};

/**
 * Calculate progress distance along a polyline up to point P's closest projection
 * @param {{ latitude: number, longitude: number }} point Point object
 * @param {Array<[number, number]>} polylinePoints Array of [lng, lat] coordinates
 * @returns {{ progressMeters: number, totalMeters: number, remainingMeters: number }}
 */
export const progressAlongRoute = (point, polylinePoints) => {
  if (!polylinePoints || polylinePoints.length < 2) {
    return { progressMeters: 0, totalMeters: 0, remainingMeters: 0 };
  }

  let totalRouteMeters = 0;
  let closestSegmentIndex = 0;
  let minPerpDistance = Infinity;
  let closestProjection = null;

  // 1. Calculate segment lengths and find closest segment
  const segmentLengths = [];
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const [aLon, aLat] = polylinePoints[i];
    const [bLon, bLat] = polylinePoints[i + 1];
    const segLen = calculateDistanceMeters(aLat, aLon, bLat, bLon);
    segmentLengths.push(segLen);
    totalRouteMeters += segLen;

    if (point) {
      const perp = perpendicularDistanceToSegment(
        point.latitude,
        point.longitude,
        aLat,
        aLon,
        bLat,
        bLon
      );
      if (perp.distance < minPerpDistance) {
        minPerpDistance = perp.distance;
        closestSegmentIndex = i;
        closestProjection = perp;
      }
    }
  }

  if (!point || !closestProjection) {
    return { progressMeters: 0, totalMeters: Math.round(totalRouteMeters), remainingMeters: Math.round(totalRouteMeters) };
  }

  // 2. Sum up distances of previous segments
  let progressMeters = 0;
  for (let i = 0; i < closestSegmentIndex; i++) {
    progressMeters += segmentLengths[i];
  }

  // 3. Add fractional progress on closest segment
  progressMeters += segmentLengths[closestSegmentIndex] * closestProjection.segmentProgressRatio;

  const roundedProgress = Math.round(progressMeters);
  const roundedTotal = Math.round(totalRouteMeters);
  const remainingMeters = Math.max(0, roundedTotal - roundedProgress);

  return {
    progressMeters: roundedProgress,
    totalMeters: roundedTotal,
    remainingMeters,
  };
};

/**
 * Format meter distance into clean human-readable text
 * @param {number} meters Distance in meters
 * @returns {string} e.g. "4.2 km" or "650 m"
 */
export const formatDistance = (meters) => {
  if (meters == null || isNaN(meters)) return '0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format minutes into clean human-readable ETA duration
 * @param {number} minutes Duration in minutes
 * @returns {string} e.g. "1h 15m" or "35m"
 */
export const formatDuration = (minutes) => {
  if (minutes == null || isNaN(minutes) || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};
