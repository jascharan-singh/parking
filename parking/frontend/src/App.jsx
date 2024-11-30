import { useEffect, useState, useRef } from 'react';
import './App.css';

// Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Load Google Maps Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initializeMap);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', initializeMap);
      document.head.removeChild(script);
    };
  }, []);

  const initializeMap = () => {
    if (currentLocation && mapRef.current && !mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { 
          lat: currentLocation.latitude, 
          lng: currentLocation.longitude 
        },
        zoom: 15,
      });

      const marker = new window.google.maps.Marker({
        position: { 
          lat: currentLocation.latitude, 
          lng: currentLocation.longitude 
        },
        map: map,
        title: 'Your Location'
      });

      mapInstance.current = map;
      markerRef.current = marker;
    }
  };

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          setCurrentLocation(location);
          setLoading(false);

          // Send location to backend
          fetch('http://localhost:3000/send-location', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(location)
          })
            .then(response => response.text())
            .then(data => console.log(data))
            .catch(err => {
              console.error('Error:', err);
              setError('Failed to send location to server');
            });
        },
        (error) => {
          console.error('Error obtaining location:', error);
          setError('Failed to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  }, []);

  // Update map when location changes
  useEffect(() => {
    if (currentLocation && mapInstance.current && markerRef.current) {
      const newPosition = { 
        lat: currentLocation.latitude, 
        lng: currentLocation.longitude 
      };
      
      mapInstance.current.setCenter(newPosition);
      markerRef.current.setPosition(newPosition);
    } else if (currentLocation) {
      initializeMap();
    }
  }, [currentLocation]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading your location...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="title">Your Current Location</h1>
      {currentLocation && (
        <div className="coordinates-container">
          <p className="coordinate">
            Latitude: {currentLocation.latitude.toFixed(6)}
          </p>
          <p className="coordinate">
            Longitude: {currentLocation.longitude.toFixed(6)}
          </p>
        </div>
      )}
      <div className="map-container">
        <div ref={mapRef} className="map"></div>
      </div>
    </div>
  );
}

export default App;