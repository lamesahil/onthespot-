/* ==========================================================================
   OnTheSpot - Overpass API Service (js/services/OverpassAPI.js)
   Handles fetching real businesses via OpenStreetMap with caching & fallbacks
   ========================================================================== */

class OverpassAPI {
  constructor() {
    this.cacheKey = 'onthespot_osm_cache';
    this.cacheExpiryMs = 1000 * 60 * 60 * 2; // 2 hours
    this.isFetching = false;
    this.lastFetchTime = 0;
  }

  // Load from LocalStorage Cache
  loadFromCache(centerCoords) {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Basic check if cache is for the same approximate location
        const dLat = Math.abs(parsed.center.lat - centerCoords.lat);
        const dLng = Math.abs(parsed.center.lng - centerCoords.lng);
        if (dLat < 0.05 && dLng < 0.05 && (Date.now() - parsed.timestamp < this.cacheExpiryMs)) {
          return parsed.spots;
        }
      }
    } catch (e) {
      console.warn("Cache read failed:", e);
    }
    return null;
  }

  // Save to LocalStorage Cache
  saveToCache(centerCoords, spots) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        center: centerCoords,
        timestamp: Date.now(),
        spots: spots
      }));
    } catch (e) {
      console.warn("Cache write failed:", e);
    }
  }

  // Haversine formula to compute accurate distance in kilometers
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  async fetchSpots(centerCoords) {
    // 1. Try Cache First (Offline-first / Fast load)
    const cachedSpots = this.loadFromCache(centerCoords);
    if (cachedSpots && cachedSpots.length > 0) {
      console.log("OSM Data loaded from cache!");
      return { spots: cachedSpots, fromCache: true, isStale: false };
    }

    // Debounce: prevent hammering the API within 10 seconds
    const now = Date.now();
    if (this.isFetching || (now - this.lastFetchTime < 10000)) {
       console.log("OverpassAPI is throttled/debounced to prevent abuse.");
       return { spots: [], fromCache: false, error: "throttled" };
    }

    this.isFetching = true;
    this.lastFetchTime = now;

    // 2. Fetch from Live API
    const radiusMeters = 6000;
    const query = `
      [out:json][timeout:15];
      (
        node["shop"~"car_repair|motorcycle_repair|tyres"](around:${radiusMeters},${centerCoords.lat},${centerCoords.lng});
        node["amenity"~"pharmacy|hospital"](around:${radiusMeters},${centerCoords.lat},${centerCoords.lng});
        node["craft"~"locksmith|electrician"](around:${radiusMeters},${centerCoords.lat},${centerCoords.lng});
      );
      out center 20;
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`OSM Server returned ${response.status}`);
      const data = await response.json();
      const elements = data.elements || [];

      const parsedOsmSpots = [];

      elements.forEach((el, i) => {
        const tags = el.tags || {};
        let name = tags.name || tags['name:en'];
        let category = 'mechanic';
        let specialty = 'Local automotive repair & roadside assistance';

        if (tags.shop === 'tyres') {
          category = 'puncture';
          if (!name) name = 'Local Tyre & Puncture Care';
          specialty = 'Tyre puncture repair, air inflation, tube replacement';
        } else if (tags.shop === 'car_repair' || tags.shop === 'motorcycle_repair') {
          category = 'mechanic';
          if (!name) name = tags.shop === 'motorcycle_repair' ? 'Two-Wheeler Service Point' : 'Auto Garage & Repair';
          specialty = 'Engine tuning, brake service, battery jumpstart, roadside mechanics';
        } else if (tags.amenity === 'pharmacy' || tags.amenity === 'hospital') {
          category = 'medical';
          if (!name) name = tags.amenity === 'hospital' ? 'Emergency Care Hospital' : '24/7 Medico Chemist';
          specialty = 'Critical first aid, trauma response, emergency medicines';
        } else if (tags.craft === 'locksmith') {
          category = 'locksmith';
          if (!name) name = 'Rapid Key & Locksmith Centre';
          specialty = 'Car lockout, laser computerized keys, door lock unlock';
        } else if (tags.craft === 'electrician') {
          category = 'electrician';
          if (!name) name = 'Emergency Electrical Works';
          specialty = 'Short circuit, MCB tripping, domestic electrical wireman';
        }

        const spotLat = el.lat;
        const spotLng = el.lon;
        const dist = this.calculateDistance(centerCoords.lat, centerCoords.lng, spotLat, spotLng);
        const dynamicEta = Math.max(3, Math.round(dist * 3.5 + 2));

        const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '1800 102 1800';

        parsedOsmSpots.push({
          id: `spot-osm-${el.id || i}`,
          name: name,
          category: category,
          phone: phone,
          rating: parseFloat((4.6 + (i % 5) * 0.1).toFixed(1)),
          reviewsCount: 85 + (i * 18),
          baseRate: category === 'medical' ? 100 : (category === 'puncture' ? 150 : 250),
          etaMins: dynamicEta,
          distance: dist,
          openNow: true,
          verified: false, // Explicitly false, it's just OSM data
          isRealOsm: true,
          specialty: specialty,
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          lat: spotLat,
          lng: spotLng,
          isCustom: false
        });
      });

      // Save successful result to cache
      if (parsedOsmSpots.length > 0) {
        this.saveToCache(centerCoords, parsedOsmSpots);
      }

      this.isFetching = false;
      return { spots: parsedOsmSpots, fromCache: false };

    } catch (err) {
      console.warn("Live OSM Overpass fetch failed:", err);
      this.isFetching = false;
      // If we failed, return empty array. The app will fallback to Helplines.
      return { spots: [], fromCache: false, error: err };
    }
  }
}

window.OverpassAPI = new OverpassAPI();
