/* ==========================================================================
   OnTheSpot - Leaflet Map Engine (map.js)
   Handles dark tiles, custom pulsating markers, animated routes & GPS tracking
   ========================================================================== */

class MapEngine {
  constructor() {
    this.map = null;
    this.userMarker = null;
    this.markersGroup = null;
    this.activeRoutePolyline = null;
    this.enrouteDriverMarker = null;
    this.driverAnimInterval = null;
    this.onSpotSelectCallback = null;
    this.onMapClickCallback = null;
  }

  init(centerCoords, onSpotSelect, onMapClick) {
    this.onSpotSelectCallback = onSpotSelect;
    this.onMapClickCallback = onMapClick;

    // Initialize Leaflet map
    this.map = L.map('map', {
      center: [centerCoords.lat, centerCoords.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });

    // Standard OpenStreetMap tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Zoom control on bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Layer group for spot markers
    this.markersGroup = L.layerGroup().addTo(this.map);

    // Add user beacon marker
    this.setUserLocation(centerCoords);

    // Map click handler (for picking location in "Add Spot" modal)
    this.map.on('click', (e) => {
      if (this.onMapClickCallback) {
        this.onMapClickCallback(e.latlng);
      }
    });

    return this.map;
  }

  setUserLocation(coords) {
    if (this.userMarker) {
      this.userMarker.setLatLng([coords.lat, coords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-beacon-wrapper',
        html: `
          <div class="user-beacon-marker">
            <div class="user-beacon-ring"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      this.userMarker = L.marker([coords.lat, coords.lng], {
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(this.map);

      this.userMarker.bindPopup(`
        <div class="popup-container">
          <div class="popup-header">
            <span style="font-size:1.2rem">📍</span>
            <strong class="popup-title">Your Current Location</strong>
          </div>
          <p style="font-size:0.75rem; color:#94a3b8;">Scanning for instant helpers within 5km...</p>
        </div>
      `);
    }
  }

  recenter(coords, zoom = 14) {
    if (this.map) {
      this.map.flyTo([coords.lat, coords.lng], zoom, {
        animate: true,
        duration: 1.2
      });
    }
  }

  renderSpotMarkers(spots) {
    this.markersGroup.clearLayers();

    spots.forEach(spot => {
      const catInfo = SPOT_CATEGORIES[spot.category] || { icon: '📍', color: '#38bdf8' };
      
      const customIcon = L.divIcon({
        className: 'custom-spot-marker',
        html: `
          <div class="spot-marker-pin ${spot.category}" style="border-color: ${catInfo.color}; box-shadow: 0 0 15px ${catInfo.color}55;">
            ${catInfo.icon}
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });

      // Rich dark popup
      const popupHtml = `
        <div class="popup-container">
          <div class="popup-header">
            <span style="font-size:1.3rem">${catInfo.icon}</span>
            <div>
              <div class="popup-title">${spot.name}</div>
              <div class="popup-meta">
                <span class="spot-rating">★ ${spot.rating}</span>
                <span>•</span>
                <span>${spot.distance} km away</span>
                <span>•</span>
                <span class="popup-price">₹${spot.baseRate}</span>
              </div>
              <div style="font-size:0.68rem; margin-top:2px;">
                ${spot.isRealOsm ? '<span style="color:#38bdf8; font-weight:700;">🟢 Live OpenStreetMap Registered</span>' : '<span style="color:#10b981; font-weight:700;">🛡️ Genuine 24/7 Helpline</span>'}
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:#94a3b8; margin: 4px 0;">${spot.specialty}</p>
          <div class="popup-actions">
            <a href="tel:${spot.phone ? spot.phone.replace(/\s+/g, '') : '18001021800'}" class="btn btn-call btn-sm" style="flex:1.2;">
              <span>Call (${spot.phone})</span>
            </a>
            <button class="btn btn-primary btn-sm popup-dispatch-btn" data-id="${spot.id}" style="flex:1;">
              <span>Dispatch Now</span>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (this.onSpotSelectCallback) {
          this.onSpotSelectCallback(spot);
        }
      });

      marker.addTo(this.markersGroup);
      spot._marker = marker;
    });

    // Delegate dispatch button inside Leaflet popups
    setTimeout(() => {
      document.querySelectorAll('.popup-dispatch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const spotId = e.currentTarget.getAttribute('data-id');
          const targetSpot = spots.find(s => s.id === spotId);
          if (targetSpot && window.appEngine) {
            window.appEngine.startDispatch(targetSpot);
          }
        });
      });
    }, 100);
  }

  highlightSpot(spot) {
    if (spot && spot._marker) {
      this.map.panTo([spot.lat, spot.lng], { animate: true, duration: 0.8 });
      spot._marker.openPopup();
    }
  }

  // Draw simulated route and start animated driver movement toward user
  startRouteAnimation(startCoords, endCoords, onProgress, onComplete) {
    this.clearRouteAnimation();

    // Curved interpolation points for a realistic route path
    const numPoints = 60;
    const pathCoords = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Slight bezier curve variation
      const curveOffset = Math.sin(t * Math.PI) * 0.0015;
      const lat = startCoords.lat + (endCoords.lat - startCoords.lat) * t + curveOffset;
      const lng = startCoords.lng + (endCoords.lng - startCoords.lng) * t - curveOffset;
      pathCoords.push([lat, lng]);
    }

    // Polyline
    this.activeRoutePolyline = L.polyline(pathCoords, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      className: 'animated-polyline'
    }).addTo(this.map);

    // Fit map bounds to view both points
    const bounds = L.latLngBounds([startCoords.lat, startCoords.lng], [endCoords.lat, endCoords.lng]);
    this.map.fitBounds(bounds, { padding: [80, 80] });

    // Moving vehicle marker
    const vehicleIcon = L.divIcon({
      className: 'enroute-vehicle-wrapper',
      html: `<div class="enroute-vehicle-marker">🛵</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this.enrouteDriverMarker = L.marker(pathCoords[0], {
      icon: vehicleIcon,
      zIndexOffset: 2000
    }).addTo(this.map);

    let currentStep = 0;
    const intervalTime = 700; // ms per step

    this.driverAnimInterval = setInterval(() => {
      currentStep++;
      if (currentStep >= pathCoords.length) {
        clearInterval(this.driverAnimInterval);
        this.driverAnimInterval = null;
        if (onComplete) onComplete();
        return;
      }

      const nextPos = pathCoords[currentStep];
      this.enrouteDriverMarker.setLatLng(nextPos);

      const percent = (currentStep / pathCoords.length) * 100;
      if (onProgress) {
        onProgress(percent, nextPos);
      }
    }, intervalTime);
  }

  clearRouteAnimation() {
    if (this.driverAnimInterval) {
      clearInterval(this.driverAnimInterval);
      this.driverAnimInterval = null;
    }
    if (this.activeRoutePolyline) {
      this.map.removeLayer(this.activeRoutePolyline);
      this.activeRoutePolyline = null;
    }
    if (this.enrouteDriverMarker) {
      this.map.removeLayer(this.enrouteDriverMarker);
      this.enrouteDriverMarker = null;
    }
  }
}

// Global MapEngine instance
window.mapEngine = new MapEngine();
