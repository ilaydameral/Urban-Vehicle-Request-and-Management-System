import { useEffect, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";

const LIBRARIES = ["places"];

export default function DriverTripMap({ trip, onTripComplete, onPositionUpdate }) {
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [map, setMap] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [routePath, setRoutePath] = useState([]);
    const autoCompletedRef = useRef(false);

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
                    console.log("✅ Route calculated:", result);
                    setDirectionsResponse(result);

                    const route = result.routes[0];
                    const path = route.overview_path.map((point) => ({
                        lat: point.lat(),
                        lng: point.lng(),
                    }));
                    setRoutePath(path);
                    setCurrentPosition(pickupCoords);

                    const realDuration = route.legs[0].duration_in_traffic
                        ? route.legs[0].duration_in_traffic.value
                        : route.legs[0].duration.value;

                    const testDuration = Math.max(30, Math.floor(realDuration / 20));
                    setTotalDuration(testDuration);

                    console.log(`🕐 Real duration: ${realDuration}s (${Math.floor(realDuration / 60)} min)`);
                    console.log(`🕐 Test duration: ${testDuration}s (${Math.floor(testDuration / 60)} min)`);
                } else {
                    console.error("❌ Directions request failed:", status);
                }
            }
        );
    }, [isLoaded, pickupCoords.lat, dropCoords.lat]);

    // Real-time progress based on trip startTime
    useEffect(() => {
        if (routePath.length === 0 || !trip.startTime || totalDuration === 0) return;

        // ✅ Stop animation if trip is completed
        if (trip.tripStatus === "COMPLETED" || trip.tripStatus === "CANCELLED") {
            setProgress(100);
            console.log("🛑 Trip completed, stopping animation");
            return;
        }

        const updateProgress = () => {
            const startTime = new Date(trip.startTime).getTime();
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;

            const calculatedProgress = Math.min((elapsed / totalDuration) * 100, 100);
            setProgress(calculatedProgress);
            setElapsedTime(Math.floor(elapsed));

            const pathIndex = Math.floor((calculatedProgress / 100) * (routePath.length - 1));
            if (routePath[pathIndex]) {
                setCurrentPosition(routePath[pathIndex]);
                // Notify parent of position update
                if (onPositionUpdate) {
                    onPositionUpdate(routePath[pathIndex]);
                }
            }

            if (elapsed >= totalDuration && onTripComplete && !autoCompletedRef.current) {
                console.log("⏰ Trip time completed, auto-completing...");
                autoCompletedRef.current = true;
                setTimeout(() => {
                    onTripComplete(trip._id, currentPosition);
                }, 100);
            }
        };

        updateProgress();
        const interval = setInterval(updateProgress, 1000);
        return () => clearInterval(interval);
    }, [routePath.length, trip.startTime, trip._id, trip.tripStatus, onTripComplete, routePath, totalDuration]);

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
                    padding: "12px 16px",
                    backgroundColor: "#0066ff",
                    color: "white",
                    borderRadius: "8px 8px 0 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>🚗 Trip in Progress</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>Progress: {Math.round(progress)}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>{formatTime(elapsedTime)}</div>
                    <div style={{ fontSize: "11px" }}>Elapsed Time</div>
                </div>
            </div>

            <div style={{ width: "100%", height: "4px", backgroundColor: "#e0e0e0" }}>
                <div
                    style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: "#28a745",
                        transition: "width 1s linear",
                    }}
                />
            </div>

            <div style={{ width: "100%", height: "500px" }}>
                <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={currentPosition || pickupCoords}
                    zoom={13}
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
                                    strokeOpacity: 0.8,
                                    strokeWeight: 6,
                                },
                            }}
                        />
                    )}

                    <Marker
                        position={pickupCoords}
                        label="P"
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: "#28a745",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                        }}
                    />

                    <Marker
                        position={dropCoords}
                        label="D"
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: "#dc2626",
                            fillOpacity: 1,
                            strokeColor: "white",
                            strokeWeight: 2,
                        }}
                    />

                    {currentPosition && (
                        <Marker
                            position={currentPosition}
                            icon={{
                                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                scale: 6,
                                fillColor: "#0066ff",
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 2,
                            }}
                        />
                    )}
                </GoogleMap>
            </div>

            <div
                style={{
                    padding: "12px 16px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "0 0 8px 8px",
                    borderTop: "1px solid #ddd",
                }}
            >
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>🟢 Pickup</div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>{trip.request?.pickupAddress || "N/A"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>🔴 Drop-off</div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>{trip.request?.dropAddress || "N/A"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>👤 Passenger</div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>{trip.request?.passenger?.name || "N/A"}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>⏱️ Total Duration</div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>{formatTime(totalDuration)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
