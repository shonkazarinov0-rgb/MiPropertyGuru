import React from 'react';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

interface Props {
    userLoc: { lat: number; lng: number };
    radiusKm: number;
    contractors: any[];
    height?: number;
    onMarkerPress?: (id: string) => void;
}

export default function NativeMapView({
                                          userLoc, radiusKm, contractors, height = 200, onMarkerPress
                                      }: Props) {
    const radiusMeters = Math.min(radiusKm, 200) * 1000;

    // Auto-fit delta based on radius
    const delta = Math.max(0.001, (radiusKm / 111) * 2.2);

    return (
        <MapView
            style={[styles.map, { height }]}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
                latitude: userLoc.lat,
                longitude: userLoc.lng,
                latitudeDelta: delta,
                longitudeDelta: delta,
            }}
            showsUserLocation
            showsMyLocationButton={false}
            scrollEnabled={false}
            zoomEnabled={false}
        >
            {/* Search radius circle */}
            <Circle
                center={{ latitude: userLoc.lat, longitude: userLoc.lng }}
                radius={radiusMeters}
                fillColor="rgba(255, 106, 0, 0.10)"
                strokeColor="rgba(255, 106, 0, 0.6)"
                strokeWidth={2}
            />

            {/* Online contractor markers */}
            {contractors
                .filter(c => c.isonline && c.currentlocation)
                .slice(0, 20)
                .map(c => (
                    <Marker
                        key={c.id}
                        coordinate={{
                            latitude: c.currentlocation.lat,
                            longitude: c.currentlocation.lng,
                        }}
                        onPress={() => onMarkerPress?.(c.id)}
                        pinColor="#22C55E"
                        title={c.name}
                        description={c.contractor_type}
                    />
                ))}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { width: '100%', borderRadius: 12 },
});
