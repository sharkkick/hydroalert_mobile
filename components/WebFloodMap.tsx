// Native stub — the web Leaflet map is only used on web.
// On native, map.tsx renders react-native-maps directly, so this is never shown.
export interface WebMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  color: string;
  title: string;
  status: string;
}

export default function WebFloodMap(_props: any): null {
  return null;
}
