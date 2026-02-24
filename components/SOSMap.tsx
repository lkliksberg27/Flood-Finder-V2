"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface SOSMapProps {
  userLat: number | null;
  userLng: number | null;
  routeGeometry: [number, number][] | null;
  destinationName: string | null;
}

export default function SOSMap({ userLat, userLng, routeGeometry, destinationName }: SOSMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [25.9565, -80.1392],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
      }).addTo(map);

      mapRef.current = map;
      layersRef.current = L.layerGroup().addTo(map);

      setTimeout(() => map.invalidateSize(), 100);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // User location
    if (userLat !== null && userLng !== null) {
      L.marker([userLat, userLng], {
        icon: L.divIcon({
          className: "",
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          html: '<div class="user-location-dot"></div>',
        }),
      }).addTo(layers);

      if (!routeGeometry) {
        map.setView([userLat, userLng], 15);
      }
    }

    // Route
    if (routeGeometry && routeGeometry.length > 0) {
      // Shadow
      L.polyline(routeGeometry, {
        color: "#000",
        weight: 8,
        opacity: 0.3,
      }).addTo(layers);

      // Main line
      L.polyline(routeGeometry, {
        color: "#f87171",
        weight: 5,
        opacity: 1,
      }).addTo(layers);

      // Destination marker
      const dest = routeGeometry[routeGeometry.length - 1];
      L.circleMarker(dest, {
        radius: 8,
        fillColor: "#f87171",
        fillOpacity: 1,
        color: "white",
        weight: 3,
      })
        .bindTooltip(destinationName || "Destination", {
          permanent: true,
          direction: "top",
          offset: [0, -12],
        })
        .addTo(layers);

      map.fitBounds(L.latLngBounds(routeGeometry), { padding: [40, 40] });
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [userLat, userLng, routeGeometry, destinationName]);

  return <div ref={containerRef} className="h-full w-full" />;
}
