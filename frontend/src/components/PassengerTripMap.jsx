import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";

const LIBRARIES = ["places"];

export default function PassengerTripMap({ trip }) {
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [map, setMap] = useState(null);
    const [driverPosition, setDriverPosition] = useState(null);
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [routePath, setRoutePath] = useState([]);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
    });

    const pickupCoords = {
        lat: trip.request?.pickupLat || 0,
        lng: trip.request?.pickupLng || 0,
    };

    const dropCoords = {
        lat: trip.request?.dropLat || 0,
        lng: trip.request?.dropLng || 0,
    };

    const onLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Calculate route and get real duration
    useEffect(() => {
        if (!isLoaded || !window.google) return;
        if (!pickupCoords.lat || !dropCoords.lat) return;

        const directionsService = new google.maps.DirectionsService();

        directionsService.route(
            {
                origin: pickupCoords,
                destination: dropCoords,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: "bestguess",
                },
            },
            (result, status) => {
                if (status === "OK") {
                    console.log("✅ Passenger: Route calculated");
                    setDirectionsResponse(result);

                    const route = result.routes[0];
                    const path = route.overview_path.map((point) => ({
                        lat: point.lat(),
                        lng: point.lng(),
                    }));
                    setRoutePath(path);
                    setDriverPosition(pickupCoords);

                    // Get real duration from Google Maps
                    const realDuration = route.legs[0].duration_in_traffic
                        ? route.legs[0].duration_in_traffic.value
                        : route.legs[0].duration.value;

                    // For testing: use 1/20 of real duration (so 20 min trip = 1 min test)
                    const testDuration = Math.max(30, Math.floor(realDuration / 20));
                    setTotalDuration(testDuration);

                    console.log(`🕐 Real duration: ${realDuration}s (${Math.floor(realDuration / 60)} min)`);
                    console.log(`🕐 Test duration: ${testDuration}s (${Math.floor(testDuration / 60)} min)`);
                } else {
                    console.error("❌ Passenger: Directions request failed:", status);
                }
            }
        );
    }, [isLoaded, pickupCoords.lat, dropCoords.lat]);

    // Real-time progress based on trip startTime (synchronized with driver!)
    useEffect(() => {
        if (routePath.length === 0 || !trip.startTime || totalDuration === 0) return;

        const updateProgress = () => {
            const startTime = new Date(trip.startTime).getTime();
            const now = Date.now();
            const elapsed = (now - startTime) / 1000; // seconds

            const calculatedProgress = Math.min((elapsed / totalDuration) * 100, 100);
            setProgress(calculatedProgress);
            setElapsedTime(Math.floor(elapsed));

            // Update driver position
            const pathIndex = Math.floor((calculatedProgress / 100) * (routePath.length - 1));
            if (routePath[pathIndex]) {
                setDriverPosition(routePath[pathIndex]);
            }
        };

        updateProgress();
        const interval = setInterval(updateProgress, 1000);
        return () => clearInterval(interval);
    }, [routePath.length, trip.startTime, routePath, totalDuration]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loadError) return <div>Error loading Google Maps</div>;
    if (!isLoaded) return <div>Loading map...</div>;
    if (!pickupCoords.lat || !dropCoords.lat) return <div>Invalid trip coordinates</div>;

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <div
                style={{
                    padding: "16px",
                    backgroundColor: "#0066ff",
                    color: "white",
                    borderRadius: "8px 8px 0 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                        🚗 Your Ride is {trip.tripStatus === "ACCEPTED" ? "Arriving" : "In Progress"}
                    </div>
                    <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>
                        {trip.tripStatus === "ACCEPTED" && "Driver is on the way to pick you up"}
                        {trip.tripStatus === "ON_GOING" && "On the way to destination"}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "24px", fontWeight: "bold" }}>{formatTime(elapsedTime)}</div>
                    <div style={{ fontSize: "11px", opacity: 0.9 }}>Elapsed Time</div>
                </div>
            </div>

            <div style={{ width: "100%", height: "6px", backgroundColor: "#e0e0e0" }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#28a745",
                        transition: "width 1s linear",
                    }}
                />
            </div>

            <div style={{ width: "100%", height: "450px" }}>
                <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={driverPosition || pickupCoords}
                    zoom={14}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                    }}
                >
                    {directionsResponse && (
                        <DirectionsRenderer
                            directions={directionsResponse}
                            options={{
                                suppressMarkers: true,
                                polylineOptions: {
                                    strokeColor: "#0066ff",
                                    strokeOpacity: 0.7,
                                    strokeWeight: 5,
                                },
                            }}
                        />
                    )}

                    <Marker
                        position={pickupCoords}
                        label={{ text: "P", color: "white", fontWeight: "bold" }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 12,
                            fillColor: "#28a745",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 3,
                        }}
                    />

                    <Marker
                        position={dropCoords}
                        label={{ text: "D", color: "white", fontWeight: "bold" }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 12,
                            fillColor: "#dc2626",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 3,
                        }}
                    />

                    {driverPosition && (
                        <Marker
                            position={driverPosition}
                            icon={{
                                url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='18' fill='%230066ff' stroke='white' stroke-width='3'/%3E%3Ctext x='20' y='27' font-size='20' text-anchor='middle' fill='white' font-weight='bold'%3E🚗%3C/text%3E%3C/svg%3E",
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 20),
                            }}
                            zIndex={1000}
                        />
                    )}
                </GoogleMap>
            </div>

            <div
                style={{
                    padding: "16px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "0 0 8px 8px",
                    borderTop: "1px solid #ddd",
                }}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>👤 Driver</div>
                        <div style={{ fontSize: "15px", fontWeight: "600" }}>{trip.driver?.user?.name || "Driver"}</div>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>🚗 Vehicle</div>
                        <div style={{ fontSize: "15px", fontWeight: "600" }}>
                            {trip.vehicle?.brand || ""} {trip.vehicle?.model || ""}
                            {trip.vehicle?.plateNumber && (
                                <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                    {trip.vehicle.plateNumber}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>🟢 Pickup</div>
                        <div style={{ fontSize: "13px" }}>{trip.request?.pickupAddress || "N/A"}</div>
                    </div>

                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>🔴 Drop-off</div>
                        <div style={{ fontSize: "13px" }}>{trip.request?.dropAddress || "N/A"}</div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: "16px",
                        padding: "12px",
                        backgroundColor: "white",
                        borderRadius: "6px",
                        border: "1px solid #e0e0e0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div>
                        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Trip Progress</div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0066ff" }}>
                            {Math.round(progress)}%
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Total Duration</div>
                        <div style={{ fontSize: "15px", fontWeight: "600" }}>
                            {formatTime(totalDuration)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
