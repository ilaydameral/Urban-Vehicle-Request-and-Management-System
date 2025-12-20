const loadedLibraries = new Set();
let googleMapsPromise = null;

/**
 * Dynamically load the Google Maps JavaScript API.
 * @param {string} apiKey - Google Maps API key
 * @param {string[]} libraries - Libraries to load (e.g., ["places"])
 * @returns {Promise<typeof google.maps>}
 */
export function loadGoogleMaps(apiKey, libraries = []) {
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is missing"));
  }

  const normalizedLibraries = libraries
    .filter(Boolean)
    .map((lib) => lib.toLowerCase());
  normalizedLibraries.forEach((lib) => loadedLibraries.add(lib));

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }

      const existingScript = document.querySelector(
        'script[src^="https://maps.googleapis.com/maps/api/js"]'
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google.maps));
        existingScript.addEventListener("error", () =>
          reject(new Error("Google Maps failed to load"))
        );
        return;
      }

      const script = document.createElement("script");
      const libs = Array.from(loadedLibraries);
      const params = new URLSearchParams({ key: apiKey, callback: "__initGoogleMaps" });
      if (libs.length > 0) params.set("libraries", libs.join(","));

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.async = true;
      script.defer = true;

      window.__initGoogleMaps = () => {
        resolve(window.google.maps);
        delete window.__initGoogleMaps;
      };

      script.onerror = () => reject(new Error("Google Maps failed to load"));

      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}
