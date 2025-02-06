import { Injectable } from '@angular/core';
import mapboxgl from 'mapbox-gl';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private map!: mapboxgl.Map;
  private userMarker!: mapboxgl.Marker;
  private lastCoords: [number, number] | null = null; // Store previous coordinates

  constructor() {
    mapboxgl.accessToken =
      'pk.eyJ1IjoidHJvbnlhIiwiYSI6ImNsNDV0YWJoeDAxeTgzam4yN3F3bnlraXYifQ.ZwOyX-2w_7yuevL4SPJo2Q';
  }

  initializeMap(container: string) {
    this.map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [24.03176, 49.82699], // Default location (Lviv)
      zoom: 20,
      pitch: 90,
      bearing: 90,
      antialias: true,
    });

    this.map.on('load', () => this.add3DBuildings());
  }

  navigationControl() {
    this.map.addControl(new mapboxgl.NavigationControl());
  }

  private add3DBuildings() {
    this.map.addLayer({
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', 'extrude', 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#aaa',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'height'],
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'min_height'],
        ],
        'fill-extrusion-opacity': 0.6,
      },
    });
  }

  trackUserLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          console.info('Position updated', position);
          const newCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          let bearing = 0; // Default bearing
          if (this.lastCoords) {
            bearing = this.calculateBearing(this.lastCoords, newCoords);
          }
          this.lastCoords = newCoords; // Update last known position

          // Move camera smoothly to new location
          this.moveCameraToLocation(newCoords, bearing);

          // Update or create user marker
          if (!this.userMarker) {
            this.userMarker = new mapboxgl.Marker({ color: 'blue' })
              .setLngLat(newCoords)
              .addTo(this.map);
          } else {
            this.userMarker.setLngLat(newCoords);
          }
        },
        (error) => console.error('Geolocation error:', error.message),
        { enableHighAccuracy: true }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  // Function to move camera to the new coordinates with calculated bearing
  private moveCameraToLocation(newCoords: [number, number], bearing: number) {
    this.map.flyTo({
      center: newCoords,
      zoom: 20,
      pitch: 90,
      bearing: bearing, // Rotate camera smoothly
      speed: 2, // Smooth transition speed
      curve: 1, // Smooth animation
      easing: (t) => t,
      essential: true,
    });
  }

  // Calculate the bearing (angle) between two points
  private calculateBearing(start: [number, number], end: [number, number]): number {
    const [lng1, lat1] = start;
    const [lng2, lat2] = end;

    const rad = Math.PI / 180;
    const φ1 = lat1 * rad;
    const φ2 = lat2 * rad;
    const λ1 = lng1 * rad;
    const λ2 = lng2 * rad;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);

    return ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize
  }
}
