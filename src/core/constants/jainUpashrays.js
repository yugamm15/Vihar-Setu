/**
 * Jinaarya Vihar Setu — Surat Jain Upashrays, Derasars & Tirth Presets
 * Pre-configured with GPS coordinates and localities for Vihar planning.
 */
export const JAIN_UPASHRAYS = [
  {
    id: 'upashray_adajan',
    name: 'Shri Mahavir Swami Jain Upashray & Derasar',
    area: 'Adajan',
    address: 'Near Gujarat Gas Circle, Adajan, Surat',
    lat: 21.1959,
    lng: 72.7933,
  },
  {
    id: 'derasar_muglisara',
    name: 'Shri Chintamani Parshwanath Jain Derasar',
    area: 'Begampura',
    address: 'Muglisara Main Road, Surat',
    lat: 21.1983,
    lng: 72.8285,
  },
  {
    id: 'upashray_vesu',
    name: 'Shri Simandhar Swami Jain Derasar & Upashray',
    area: 'Vesu',
    address: 'Near VIP Road Junction, Vesu, Surat',
    lat: 21.1442,
    lng: 72.7758,
  },
  {
    id: 'upashray_ghoddod',
    name: 'Shwetambar Jain Sangh Upashray',
    area: 'Ghod Dod Road',
    address: 'Ghod Dod Road, Near Joggers Park, Surat',
    lat: 21.1738,
    lng: 72.8021,
  },
  {
    id: 'derasar_gopipura',
    name: 'Shri Shantinath Jain Derasar & Upashray',
    area: 'Nanpura',
    address: 'Gopipura, Chauta Bazar, Surat',
    lat: 21.1912,
    lng: 72.8197,
  },
  {
    id: 'upashray_pal',
    name: 'Pal Gam Jain Tirth & Upashray',
    area: 'Pal',
    address: 'Pal Gam Main Road, Adajan-Pal, Surat',
    lat: 21.2065,
    lng: 72.7745,
  },
  {
    id: 'upashray_althan',
    name: 'Althan Shwetambar Jain Sangha Upashray',
    area: 'Althan',
    address: 'Near Althan Canal Road, Surat',
    lat: 21.1578,
    lng: 72.8089,
  },
  {
    id: 'upashray_katargam',
    name: 'Katargam Jain Sangha Upashray',
    area: 'Katargam',
    address: 'Near Gotalawadi, Katargam, Surat',
    lat: 21.2234,
    lng: 72.8312,
  },
  {
    id: 'derasar_athwagate',
    name: 'Athwagate Jain Shwetambar Derasar',
    area: 'Athwagate',
    address: 'Ring Road, Near Athwagate, Surat',
    lat: 21.1824,
    lng: 72.8115,
  },
  {
    id: 'upashray_piplod',
    name: 'Piplod Shwetambar Jain Upashray',
    area: 'Piplod',
    address: 'Dumas Road, Piplod, Surat',
    lat: 21.1611,
    lng: 72.7684,
  },
  {
    id: 'upashray_citylight',
    name: 'City Light Jain Upashray & Aradhana Bhavan',
    area: 'City Light',
    address: 'City Light Town, Surat',
    lat: 21.1667,
    lng: 72.7915,
  },
];

/**
 * Common Early Morning Vihar Departure Time Presets
 */
export const VIHAR_TIME_PRESETS = [
  '04:30 AM',
  '05:00 AM',
  '05:15 AM',
  '05:30 AM',
  '05:45 AM',
  '06:00 AM',
  '06:30 AM',
  '07:00 AM',
];

/**
 * Calculates estimated walking distance (haversine) and walking duration at 4.2 km/h
 */
export const calculateViharRouteEstimate = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Walking road factor ~ 1.25x straight-line distance
  const distanceKm = Math.max(0.8, Number((R * c * 1.25).toFixed(1)));
  
  // Walking pace ~ 4.2 km/h (Sadhviji gentle pace)
  const durationMinutes = Math.round((distanceKm / 4.2) * 60);
  
  return {
    distanceKm,
    durationMinutes,
    formattedDuration:
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : `${durationMinutes} mins`,
  };
};
