import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Driver Icon
const driverIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Default center if no driver location provided (Antalya)
const DEFAULT_CENTER = { lat: 36.884804, lng: 30.704044 };

export default function DriverMap({ driverLocation }) {
    // driverLocation should be { lat: number, lng: number }
    const center = driverLocation || DEFAULT_CENTER;

    return (
        <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white relative z-0">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {driverLocation && (
                    <Marker position={driverLocation} icon={driverIcon}>
                        <Popup>Araç Konumu</Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
