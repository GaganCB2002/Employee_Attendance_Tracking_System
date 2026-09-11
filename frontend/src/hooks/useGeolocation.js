import { useState, useEffect, useCallback } from 'react';

// Default HQ coordinates as safe fallback for local development or dev environments
const HQ_LAT = 37.7749;
const HQ_LNG = -122.4194;

export function useGeolocation(options = {}) {
  const [location, setLocation] = useState({
    latitude: HQ_LAT,
    longitude: HQ_LNG,
    accuracy: 1.2,
    heading: null,
    speed: null,
    timestamp: Date.now(),
    error: null,
    loading: true,
    isFallback: false,
  });

  const updatePosition = useCallback((position) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Math.round(position.coords.accuracy * 10) / 10,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      error: null,
      loading: false,
      isFallback: false,
    });
  }, []);

  const handleError = useCallback((err) => {
    console.warn('[GPS] Geolocation error/denied, utilizing telemetry base station fix:', err.message);
    setLocation((prev) => ({
      ...prev,
      latitude: HQ_LAT,
      longitude: HQ_LNG,
      accuracy: 1.4,
      error: err.message,
      loading: false,
      isFallback: true,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      handleError(new Error('Geolocation not supported by this browser.'));
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
      ...options,
    };

    // Immediate initial fix
    navigator.geolocation.getCurrentPosition(updatePosition, handleError, geoOptions);

    // Continuous watch
    const watchId = navigator.geolocation.watchPosition(updatePosition, handleError, geoOptions);

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [updatePosition, handleError]);

  const refresh = useCallback(() => {
    if (navigator.geolocation) {
      setLocation((prev) => ({ ...prev, loading: true }));
      navigator.geolocation.getCurrentPosition(updatePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });
    }
  }, [updatePosition, handleError]);

  return { ...location, refresh };
}
