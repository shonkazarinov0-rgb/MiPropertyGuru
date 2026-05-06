import React from 'react';
import { View } from 'react-native';

interface Props {
    userLoc: { lat: number; lng: number };
    radiusKm: number;
    contractors?: any[];
    height?: number;
    onMarkerPress?: (id: string) => void;
}

function getLeafletHTML(
    userLoc: { lat: number; lng: number },
    radiusKm: number,
    contractors: any[]
): string {
    const onlineContractors = contractors
        .filter(c => c.isonline && c.currentlocation)
        .slice(0, 20);

    const markers = onlineContractors.map(c => ({
        id: c.id,
        lat: c.currentlocation.lat,
        lng: c.currentlocation.lng,
        name: c.name,
        type: c.contractor_type,
    }));
    const radiusMeters = Math.min(radiusKm, 200) * 1000;


    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
  .leaflet-control-attribution { display: none !important; }
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, scrollWheelZoom: false, dragging: false })
  .setView([${userLoc.lat}, ${userLoc.lng}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // Orange radius circle
  var circle = L.circle([${userLoc.lat}, ${userLoc.lng}], {
    radius: ${radiusMeters},
    fillColor: '#FF6A00',
    fillOpacity: 0.10,
    color: '#FF6A00',
    weight: 2,
    opacity: 0.6
  }).addTo(map);

  // Fit view to circle
setTimeout(function() {
  map.invalidateSize();
  map.fitBounds(circle.getBounds(), { padding: [10, 10] });
}, 100);
  // User dot (orange)
  L.circleMarker([${userLoc.lat}, ${userLoc.lng}], {
    radius: 10,
    fillColor: '#FF6A00',
    color: '#fff',
    weight: 3,
    fillOpacity: 1
  }).addTo(map).bindPopup('<b>You are here</b>');

  // Contractor dots (green)
  var markers = ${JSON.stringify(markers)};
  markers.forEach(function(m) {
    var icon = L.divIcon({
      className: '',
      html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    L.marker([m.lat, m.lng], { icon: icon })
      .addTo(map)
      .bindPopup('<b>' + m.name + '</b><br>' + (m.type || ''));
  });

  // Dynamically update radius when parent posts message
  window.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'updateRadius') {
        circle.setRadius(data.radius);
        map.fitBounds(circle.getBounds(), { padding: [10, 10] });
      }
    } catch(err) {}
  });
</script>
</body></html>`;
}

export default function WebMapView({ userLoc, radiusKm, contractors = [], height = 200, onMarkerPress }: Props) {
    const html = getLeafletHTML(userLoc, radiusKm, contractors);

    return (
        <View style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
            {/* @ts-ignore — srcDoc is valid on web iframe */}
            <iframe
                title="map"
                srcDoc={html}
                width="100%"
                height={height}
                style={{ border: 'none', borderRadius: 12 }}
                sandbox="allow-scripts allow-same-origin"
            />
        </View>
    );
}
