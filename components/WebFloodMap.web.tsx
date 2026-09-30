import { useMemo } from 'react';

export interface WebMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  color: string;   // hex
  title: string;
  status: string;
}

interface Props {
  center: { latitude: number; longitude: number };
  markers: WebMapMarker[];
  showRain: boolean;
  owmKey: string;
}

/**
 * Interactive web map using Leaflet + OpenStreetMap base tiles and an
 * OpenWeather precipitation overlay. Rendered inside an iframe so Leaflet's
 * DOM/CSS is fully isolated from react-native-web. No npm dependency required
 * (Leaflet is loaded from its CDN inside the iframe).
 */
export default function WebFloodMap({ center, markers, showRain, owmKey }: Props) {
  const html = useMemo(() => buildHtml(center, markers, showRain, owmKey), [center, markers, showRain, owmKey]);

  return (
    <iframe
      title="Flood map"
      srcDoc={html}
      style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
    />
  );
}

function buildHtml(
  center: { latitude: number; longitude: number },
  markers: WebMapMarker[],
  showRain: boolean,
  owmKey: string,
) {
  const markerJson = JSON.stringify(markers);
  const rainLayer = showRain && owmKey
    ? `L.tileLayer('https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmKey}', { opacity: 0.55, maxZoom: 19 }).addTo(map);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .sos-pin { width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.25); }
    .leaflet-popup-content { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
    .sos-title { font-weight: 700; font-size: 13px; }
    .sos-status { font-weight: 700; font-size: 12px; }
    .sos-coords { color: #6b7280; font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${center.latitude}, ${center.longitude}], 13);

    // OpenStreetMap base layer (free, no key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // OpenWeather precipitation overlay (optional)
    ${rainLayer}

    var markers = ${markerJson};
    markers.forEach(function (m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="sos-pin" style="background:' + m.color + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([m.latitude, m.longitude], { icon: icon })
        .addTo(map)
        .bindPopup(
          '<div class="sos-title">🚨 ' + m.title + '</div>' +
          '<div class="sos-status" style="color:' + m.color + '">Status: ' + m.status + '</div>' +
          '<div class="sos-coords">' + m.latitude.toFixed(5) + ', ' + m.longitude.toFixed(5) + '</div>'
        );
    });
  </script>
</body>
</html>`;
}
