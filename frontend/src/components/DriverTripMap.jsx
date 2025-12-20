import { useEffect, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";

const LIBRARIES = ["places"];

export default function DriverTripMap({ trip, onTripComplete }) {
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [map, setMap] = useState(null);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [progress, setProgress] = useState(0); // 0 to 100
    const [timeRemaining, setTimeRemaining] = useState(0);
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

    // Calculate route
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

                    // Extract path points for animation
                    const route = result.routes[0];
                    const path = route.overview_path.map((point) => ({
                        lat: point.lat(),
                        lng: point.lng(),
                    }));
                    setRoutePath(path);

                    // Set initial position to pickup
                    setCurrentPosition(pickupCoords);

                    // Calculate estimated time (in seconds)
                    const duration = route.legs[0].duration_in_traffic
                        ? route.legs[0].duration_in_traffic.value
                        : route.legs[0].duration.value;

                    // For testing: use 2 minutes instead of actual duration
                    const testDuration = 120; // 2 minutes in seconds
                    setTimeRemaining(testDuration);
                } else {
                    console.error("❌ Directions request failed:", status);
                }
            }
        );
    }, [isLoaded, pickupCoords.lat, dropCoords.lat]);

    // GPS Simulation - move driver along route
    useEffect(() => {
        if (routePath.length === 0 || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    // Trip completed!
                    if (onTripComplete) {
                        console.log("⏰ Trip time completed, auto-completing...");
                        onTripComplete(trip._id);
                    }
                    return 0;
                }
                return newTime;
            });

            // Update progress (0 to 100)
            setProgress((prev) => {
                const increment = 100 / (timeRemaining || 1);
                const newProgress = Math.min(prev + increment, 100);

                // Update current position based on progress
                const pathIndex = Math.floor((newProgress / 100) * (routePath.length - 1));
                if (routePath[pathIndex]) {
                    setCurrentPosition(routePath[pathIndex]);
                }

                return newProgress;
            });
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, [routePath.length, timeRemaining, onTripComplete, trip._id, routePath]);

    // Format time remaining
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loadError) {
        return <div>Error loading Google Maps</div>;
    }

    if (!isLoaded) {
        return <div>Loading map...</div>;
    }

    if (!pickupCoords.lat || !dropCoords.lat) {
        return <div>Invalid trip coordinates</div>;
    }

    return (
        <div style={{ width: "100%", height: "100%" }}>
            {/* Trip Info Bar */}
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
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                        🚗 Trip in Progress
                    </div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        Progress: {Math.round(progress)}%
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                        {formatTime(timeRemaining)}
                    </div>
                    <div style={{ fontSize: "11px" }}>Time Remaining</div>
                </div>
            </div>

            {/* Progress Bar */}
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

            {/* Map */}
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
                    {/* Route */}
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

                    {/* Pickup Marker */}
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

                    {/* Drop Marker */}
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

                    {/* Current Position (Driver) */}
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
                                rotation: 0, // Could calculate bearing for realistic rotation
                            }}
                        />
                    )}
                </GoogleMap>
            </div>

            {/* Trip Details */}
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
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                            🟢 Pickup
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                            {trip.request?.pickupAddress || "N/A"}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                            🔴 Drop-off
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                            {trip.request?.dropAddress || "N/A"}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                            👤 Passenger
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                            {trip.request?.passenger?.name || "N/A"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
