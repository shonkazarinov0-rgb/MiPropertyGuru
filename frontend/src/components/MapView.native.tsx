import React from 'react';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
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

    const [mapDims, setMapDims] = React.useState({ width: 390, height });

    const latDelta = Math.max(0.02, (radiusKm / 111) * 2 * 1.3);
    const lngDelta = latDelta * (mapDims.width / mapDims.height);

    const region: Region = {
        latitude: userLoc.lat,
        longitude: userLoc.lng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
    };

    return (
        <View style={[styles.container, { height }]}>
            <MapView
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_DEFAULT}
                region={region}
                onLayout={(e) => setMapDims({
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                })}
                onRegionChangeComplete={() => {}}
                showsUserLocation
                showsMyLocationButton={false}
                scrollEnabled={false}
                zoomEnabled={false}
            >
                <Circle
                    center={{ latitude: userLoc.lat, longitude: userLoc.lng }}
                    radius={radiusMeters}
                    fillColor="rgba(255, 106, 0, 0.10)"
                    strokeColor="rgba(255, 106, 0, 0.6)"
                    strokeWidth={2}
                />

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
});
