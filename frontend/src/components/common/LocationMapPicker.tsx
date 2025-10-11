/**
 * Reusable Location Map Picker Component
 * 
 * Features:
 * - Interactive map with pin/marker
 * - Auto-detect current location
 * - Search location
 * - Manual coordinate input
 * - Works with OpenStreetMap (free, open source)
 * 
 * @package POSMID - Phase 1 MVP
 * @author Zencoder
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Search, X } from 'lucide-react';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationMapPickerProps {
  value?: LocationCoordinates | null;
  onChange: (location: LocationCoordinates | null) => void;
  height?: string;
  showSearch?: boolean;
  showManualInput?: boolean;
  showCurrentLocation?: boolean;
  disabled?: boolean;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  value,
  onChange,
  height = '400px',
  showSearch = true,
  showManualInput = true,
  showCurrentLocation = true,
  disabled = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [manualLat, setManualLat] = useState(value?.lat?.toString() || '');
  const [manualLng, setManualLng] = useState(value?.lng?.toString() || '');
  const [detectedAddress, setDetectedAddress] = useState(value?.address || '');

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = value 
      ? [value.lat, value.lng]
      : [-6.2088, 106.8456]; // Jakarta as default

    const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);

    // Use OpenStreetMap tiles (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add marker if value exists
    if (value) {
      addMarker(value.lat, value.lng);
    }

    // Click event to add/move marker
    if (!disabled) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        addMarker(lat, lng);
        reverseGeocode(lat, lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update marker when value changes externally (without triggering onChange)
  useEffect(() => {
    if (!value || !mapRef.current) return;

    // Check if value actually changed to prevent infinite loops
    const currentLat = parseFloat(manualLat);
    const currentLng = parseFloat(manualLng);
    
    if (
      !isNaN(currentLat) && 
      !isNaN(currentLng) && 
      Math.abs(currentLat - value.lat) < 0.0000001 && 
      Math.abs(currentLng - value.lng) < 0.0000001
    ) {
      return; // Value hasn't changed, skip update
    }

    // Update marker without calling onChange (external update)
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    const marker = L.marker([value.lat, value.lng], {
      draggable: !disabled,
    }).addTo(mapRef.current);

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      reverseGeocode(position.lat, position.lng);
    });

    markerRef.current = marker;
    mapRef.current.setView([value.lat, value.lng], 13);
    setManualLat(value.lat.toString());
    setManualLng(value.lng.toString());
    setDetectedAddress(value.address || '');
  }, [value, disabled, manualLat, manualLng]);

  const addMarker = (lat: number, lng: number, address?: string) => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Add new marker
    const marker = L.marker([lat, lng], {
      draggable: !disabled,
    }).addTo(mapRef.current);

    // Draggable marker event
    marker.on('dragend', (e) => {
      const position = e.target.getLatLng();
      reverseGeocode(position.lat, position.lng);
    });

    markerRef.current = marker;

    // Update state
    const formattedLat = parseFloat(lat.toFixed(8));
    const formattedLng = parseFloat(lng.toFixed(8));
    const finalAddress = address !== undefined ? address : detectedAddress;

    setManualLat(formattedLat.toString());
    setManualLng(formattedLng.toString());

    // Call onChange with user interaction
    onChange({
      lat: formattedLat,
      lng: formattedLng,
      address: finalAddress,
    });
  };

  // Reverse geocoding using Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const formattedLat = parseFloat(lat.toFixed(8));
        const formattedLng = parseFloat(lng.toFixed(8));
        
        setDetectedAddress(data.display_name);
        setManualLat(formattedLat.toString());
        setManualLng(formattedLng.toString());
        
        onChange({
          lat: formattedLat,
          lng: formattedLng,
          address: data.display_name,
        });
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  // Search location using Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setDetectedAddress(display_name);
        addMarker(latitude, longitude, display_name);
        mapRef.current?.setView([latitude, longitude], 15);
        setSearchQuery('');
      } else {
        alert('Lokasi tidak ditemukan. Coba kata kunci lain.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Pencarian gagal. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  // Get current location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        addMarker(latitude, longitude);
        mapRef.current?.setView([latitude, longitude], 15);
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Gagal mendapatkan lokasi. Pastikan Anda mengizinkan akses lokasi.');
      }
    );
  };

  // Manual coordinate input
  const handleManualInput = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Koordinat tidak valid. Latitude: -90 to 90, Longitude: -180 to 180');
      return;
    }

    addMarker(lat, lng);
    mapRef.current?.setView([lat, lng], 15);
    reverseGeocode(lat, lng);
  };

  // Clear location
  const handleClear = () => {
    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    setManualLat('');
    setManualLng('');
    setDetectedAddress('');
    onChange(null);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      {showSearch && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cari lokasi (contoh: Jakarta Pusat)"
              disabled={disabled}
              className="input w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={disabled || isSearching}
            className="btn btn-primary"
          >
            {isSearching ? 'Mencari...' : 'Cari'}
          </button>
        </div>
      )}

      {/* Current Location Button */}
      {showCurrentLocation && (
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={disabled}
          className="btn btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Navigation className="h-4 w-4" />
          Gunakan Lokasi Saat Ini
        </button>
      )}

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <div ref={mapContainerRef} style={{ height, width: '100%' }} />
        
        {/* Clear Button Overlay */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-3 right-3 z-[1000] bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Hapus lokasi"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </div>

      {/* Detected Address */}
      {detectedAddress && (
        <div className="flex items-start gap-2 p-3 bg-info-50 dark:bg-info-900/20 rounded-lg">
          <MapPin className="h-5 w-5 text-info-600 dark:text-info-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-info-800 dark:text-info-200">
            <strong>Alamat Terdeteksi:</strong>
            <p className="mt-1">{detectedAddress}</p>
          </div>
        </div>
      )}

      {/* Manual Coordinate Input */}
      {showManualInput && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Input Manual Koordinat
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="Latitude (contoh: -6.2088)"
              disabled={disabled}
              className="input"
            />
            <input
              type="text"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="Longitude (contoh: 106.8456)"
              disabled={disabled}
              className="input"
            />
            <button
              type="button"
              onClick={handleManualInput}
              disabled={disabled}
              className="btn btn-secondary"
            >
              Set Lokasi
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Latitude: -90 sampai 90, Longitude: -180 sampai 180
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationMapPicker;