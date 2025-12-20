import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Icons
const pickupIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const dropIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Default center
const DEFAULT_CENTER = { lat: 36.884804, lng: 30.704044 };

function FitBounds({ markers }) {
    const map = useMap();
    useEffect(() => {
        if (markers && markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, map]);
    return null;
}

export default function MapViewer({
    pickupLocation, // { lat, lng }
    dropLocation,   // { lat, lng }
    driverLocation, // { lat, lng }
    showRoute = true
}) {
    const markers = [];
    if (pickupLocation) markers.push({ ...pickupLocation, type: 'pickup' });
    if (dropLocation) markers.push({ ...dropLocation, type: 'drop' });
    if (driverLocation) markers.push({ ...driverLocation, type: 'driver' });

    const routePositions = (pickupLocation && dropLocation)
        ? [pickupLocation, dropLocation]
        : [];

    const center = markers.length > 0 ? markers[0] : DEFAULT_CENTER;

    return (
        <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white relative z-0">
            <MapContainer
                center={center}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {pickupLocation && (
                    <Marker position={pickupLocation} icon={pickupIcon}>
                        <Popup>Alım Noktası</Popup>
                    </Marker>
                )}

                {dropLocation && (
                    <Marker position={dropLocation} icon={dropIcon}>
                        <Popup>Varış Noktası</Popup>
                    </Marker>
                )}

                {driverLocation && (
                    <Marker position={driverLocation} icon={driverIcon}>
                        <Popup>Araç Konumu</Popup>
                    </Marker>
                )}

                {showRoute && routePositions.length > 0 && (
                    <Polyline positions={routePositions} color="blue" dashArray="10, 10" />
                )}

                <FitBounds markers={markers} />
            </MapContainer>
        </div>
    );
}
