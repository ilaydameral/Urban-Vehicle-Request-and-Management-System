import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, Autocomplete } from "@react-google-maps/api";

const LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: 36.884804, lng: 30.704044 }; // Antalya

export default function RidePlannerMap({
  pickupAddress,
  dropAddress,
  onPickupAddressChange,
  onDropAddressChange,
  onRouteChange,
  onPickupCoordsChange,
  onDropCoordsChange,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [driverCoords, setDriverCoords] = useState(DEFAULT_CENTER);

  // Refs for Autocomplete instances
  const pickupRef = useRef(null);
  const dropRef = useRef(null);

  // Handle Route Calculation
  const calculateRoute = async () => {
    if (!pickupCoords || !dropCoords) return;

    if (!window.google) return;
    if (!pickupCoords || !dropCoords) {
      console.log("🔴 calculateRoute: Missing coords", { pickupCoords, dropCoords });
      return;
    }

    if (!window.google) {
      console.log("🔴 calculateRoute: Google Maps not loaded");
      return;
    }

    console.log("🟢 calculateRoute: Starting route calculation", { pickupCoords, dropCoords });

    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService();

    try {
      const results = await directionsService.route({
        origin: pickupCoords,
        destination: dropCoords,
        // eslint-disable-next-line no-undef
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Now
          trafficModel: "best_guess",
        },
      });

      console.log("✅ Directions result:", results);
      setDirectionsResponse(results);

      if (results.routes.length > 0) {
        const leg = results.routes[0].legs[0];
        const summary = {
          distanceText: leg.distance.text,
          durationText: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value,
        };
        console.log("📊 Route summary:", summary);
        if (onRouteChange) onRouteChange(summary);
      }
    } catch (error) {
      console.error("❌ Google Maps Routing Error:", error);
    }
  };

  // Trigger calculation when coords change
  useEffect(() => {
    if (pickupCoords && dropCoords) {
      calculateRoute();
    } else {
      setDirectionsResponse(null);
      if (onRouteChange) onRouteChange(null);
    }
  }, [pickupCoords, dropCoords]);


  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle Autocomplete interactions
  const onPlaceChanged = (type) => {
    const ref = type === 'pickup' ? pickupRef : dropRef;
    if (ref.current) {
      const place = ref.current.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const coords = { lat, lng };
        const address = place.formatted_address || place.name;

        if (type === 'pickup') {
          setPickupCoords(coords);
          onPickupAddressChange(address);
          if (onPickupCoordsChange) onPickupCoordsChange(coords);
          map?.panTo(coords);
        } else {
          setDropCoords(coords);
          onDropAddressChange(address);
          if (onDropCoordsChange) onDropCoordsChange(coords);
        }
      }
    }
  };

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverCoords(coords);
        setPickupCoords(coords);
        onPickupAddressChange("Mevcut Konum");
        if (onPickupCoordsChange) onPickupCoordsChange(coords);
        map?.panTo(coords);
        map?.setZoom(15);
      },
      () => alert("Konum alınamadı."),
      { enableHighAccuracy: true }
    );
  }

  // Handle Manual Map Clicks
  const handleMapClick = (e) => {
    // Basic logic: if pickup empty, set pickup. Else set drop.
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const coords = { lat, lng };

    if (!pickupCoords) {
      setPickupCoords(coords);
      onPickupAddressChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      if (onPickupCoordsChange) onPickupCoordsChange(coords);
    } else if (!dropCoords) {
      setDropCoords(coords);
      onDropAddressChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      if (onDropCoordsChange) onDropCoordsChange(coords);
    } else {
      // If both full, reset drop and set new drop? Or do nothing? 
      // Let's reset drop to allow changing destination easily
      setDropCoords(coords);
      onDropAddressChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      if (onDropCoordsChange) onDropCoordsChange(coords);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div className="h-80 w-full bg-gray-100 animate-pulse rounded-xl">Loading Map...</div>;

  return (
    <div className="space-y-3">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">
            Nereden (Pickup)
          </label>
          <Autocomplete
            onLoad={(ref) => (pickupRef.current = ref)}
            onPlaceChanged={() => onPlaceChanged('pickup')}
          >
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => onPickupAddressChange(e.target.value)}
              placeholder="Google ile ara..."
              className="input-uber"
            />
          </Autocomplete>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">
            Nereye (Dropoff)
          </label>
          <Autocomplete
            onLoad={(ref) => (dropRef.current = ref)}
            onPlaceChanged={() => onPlaceChanged('drop')}
          >
            <input
              type="text"
              value={dropAddress}
              onChange={(e) => onDropAddressChange(e.target.value)}
              placeholder="Google ile ara..."
              className="input-uber"
            />
          </Autocomplete>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="btn-secondary !py-2"
        >
          📍 Konumumu Kullan
        </button>
        <button
          type="button"
          onClick={() => { setPickupCoords(null); setDropCoords(null); setDirectionsResponse(null); onPickupAddressChange(""); onDropAddressChange(""); }}
          className="text-red-500 hover:text-red-700"
        >
          Temizle
        </button>
        <span className="text-gray-500 italic">
          Haritaya tıklayarak da seçim yapabilirsiniz (Önce Pickup, sonra Dropoff).
        </span>
      </div>

      <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white relative z-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={driverCoords}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {pickupCoords && <Marker position={pickupCoords} label="P" />}
          {dropCoords && <Marker position={dropCoords} label="D" />}

          {directionsResponse && (
            <>
              {console.log("🗺️ Rendering DirectionsRenderer with:", directionsResponse)}
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
            </>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
