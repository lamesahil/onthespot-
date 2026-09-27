/* ==========================================================================
   OnTheSpot - Main Application Logic (app.js)
   State management, event wiring, dispatch simulations & geolocation
   ========================================================================== */

window.escapeHTML = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

class AppEngine {
  constructor() {
    this.userCoords = { lat: 28.6315, lng: 77.2167 }; // Default: New Delhi
    this.filters = {
      category: 'all',
      maxDistance: 5,
      openOnly: true,
      query: '',
      sortBy: 'distance'
    };
    this.selectedSpot = null;
    this.activeDispatch = null;
    this.pinnedNewSpotCoords = null;
    this.isPinningMode = false;
    this.chatMessages = [];
    this.emergencyFeatures = new window.EmergencyFeatures(this);
  }

  init() {
    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    this.currentLang = 'en';
    this.isSurvivalMode = false;
    
    // Auto-detect Low Battery for Survival Mode
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        if (battery.level <= 0.20 && !battery.charging) {
          this.emergencyFeatures.toggleSurvivalMode();
        }
        battery.addEventListener('levelchange', () => {
          if (battery.level <= 0.20 && !battery.charging && !this.emergencyFeatures.isSurvivalMode) {
             this.emergencyFeatures.toggleSurvivalMode();
          }
        });
      });
    }

    // Attempt browser geolocation or fallback
    this.detectUserLocation(() => {
      this.initMapAndData();
      this.bindEvents();
      this.updateCategoryCounts();
      this.renderSpots();
    });
  }

  detectUserLocation(callback) {
    const locText = document.getElementById('current-location-text');
    locText.textContent = "Locating nearby spots...";

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          this.userCoords = {
            lat: parseFloat(pos.coords.latitude.toFixed(4)),
            lng: parseFloat(pos.coords.longitude.toFixed(4))
          };
          locText.textContent = `Live GPS: ${this.userCoords.lat}, ${this.userCoords.lng}`;
          this.showToast(`GPS Location Locked (${this.userCoords.lat}, ${this.userCoords.lng})`, 'success');
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${this.userCoords.lat}&lon=${this.userCoords.lng}&format=json`);
            const data = await res.json();
            if (data && data.display_name) {
              const shortAddr = data.display_name.split(',').slice(0, 3).join(',');
              locText.textContent = shortAddr;
            }
          } catch (e) {
            console.warn('Reverse geocoding failed', e);
          }
          
          callback();
        },
        (err) => {
          console.warn("Geolocation denied or unavailable, using Delhi hub:", err);
          locText.textContent = "Location disabled. Using New Delhi (Default).";
          this.showToast("Location denied. Using default map center.", "warning");
          callback();
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      locText.textContent = "New Delhi Central";
      callback();
    }
  }

  initMapAndData() {
    // Generate mock spots based on user coords
    window.dataStore.generateSpots(this.userCoords);

    // Initialize Map
    window.mapEngine.init(
      this.userCoords,
      (spot) => this.onSpotSelected(spot),
      (latlng) => this.onMapClicked(latlng)
    );

    // Update SOS coords display
    document.getElementById('sos-share-coords').textContent = 
      `Lat: ${this.userCoords.lat}, Lng: ${this.userCoords.lng} (Nearby 5km coverage active)`;

    // Trigger Live OpenStreetMap Overpass query for real businesses around user
    window.dataStore.fetchLiveOsmSpots(this.userCoords, (success, count) => {
      if (success && count > 0) {
        this.showToast(`🛰️ Live OSM Sync: Loaded ${count} real local businesses!`, "success");
        this.updateCategoryCounts();
        this.renderSpots();
      }
    });
  }

  bindEvents() {
    // Sound FX Toggle
    const soundBtn = document.getElementById('sound-control');
    soundBtn.addEventListener('click', () => {
      const isEnabled = window.soundEngine.toggle();
      soundBtn.classList.toggle('muted', !isEnabled);
      soundBtn.querySelector('span').textContent = isEnabled ? "Sound FX" : "Muted";
      if (isEnabled) window.soundEngine.playTap();
    });

    // Category carousel filter clicks
    const catPills = document.querySelectorAll('#category-filters .cat-pill');
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        window.soundEngine.playTap();
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.filters.category = pill.getAttribute('data-cat');
        this.renderSpots();
      });
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    searchInput.addEventListener('input', (e) => {
      this.filters.query = e.target.value;
      clearBtn.classList.toggle('hidden', e.target.value.length === 0);
      this.renderSpots();
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      this.filters.query = '';
      clearBtn.classList.add('hidden');
      this.renderSpots();
    });

    // Radius slider
    const radiusSlider = document.getElementById('radius-slider');
    const radiusVal = document.getElementById('radius-val');
    radiusSlider.addEventListener('input', (e) => {
      this.filters.maxDistance = parseInt(e.target.value, 10);
      radiusVal.textContent = `${this.filters.maxDistance} km`;
      this.renderSpots();
    });

    // Open Only Toggle
    const openToggle = document.getElementById('open-only-toggle');
    openToggle.addEventListener('change', (e) => {
      this.filters.openOnly = e.target.checked;
      window.soundEngine.playTap();
      this.renderSpots();
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', (e) => {
      this.filters.sortBy = e.target.value;
      window.soundEngine.playTap();
      this.renderSpots();
    });

    // Refresh GPS button
    document.getElementById('refresh-gps-btn').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.detectUserLocation(() => {
        window.dataStore.generateSpots(this.userCoords);
        window.mapEngine.setUserLocation(this.userCoords);
        window.mapEngine.recenter(this.userCoords);
        this.renderSpots();
      });
    });

    // Recenter Map button
    document.getElementById('recenter-map-btn').addEventListener('click', () => {
      window.soundEngine.playTap();
      window.mapEngine.recenter(this.userCoords);
    });

    // Radar scan toggle
    const radarBtn = document.getElementById('radar-toggle-btn');
    const radarOverlay = document.getElementById('radar-scan');
    radarBtn.addEventListener('click', () => {
      window.soundEngine.playRadarPing();
      radarBtn.classList.toggle('active');
      const isActive = radarBtn.classList.contains('active');
      radarOverlay.style.opacity = isActive ? '0.85' : '0';
    });

    // Simulate Emergency Breakdown Button
    document.getElementById('simulate-breakdown-btn').addEventListener('click', () => {
      this.triggerBreakdownSimulation();
    });

    // SOS Emergency Modal Trigger
    const sosTopBtn = document.getElementById('sos-top-btn');
    const sosModal = document.getElementById('sos-modal');
    const closeSosBtn = document.getElementById('close-sos-btn');

    sosTopBtn.addEventListener('click', () => {
      window.soundEngine.playAlert();
      sosModal.classList.remove('hidden');
      if (window.lucide) window.lucide.createIcons();
    });

    closeSosBtn.addEventListener('click', () => {
      sosModal.classList.add('hidden');
      window.soundEngine.stopSiren();
      document.getElementById('toggle-siren-btn').classList.remove('playing');
      document.getElementById('siren-status-text').textContent = "Play Loud Emergency Alarm";
    });

    // Siren Toggle
    const sirenBtn = document.getElementById('toggle-siren-btn');
    sirenBtn.addEventListener('click', () => {
      const isPlaying = window.soundEngine.toggleSiren();
      sirenBtn.classList.toggle('playing', isPlaying);
      document.getElementById('siren-status-text').textContent = 
        isPlaying ? "Stop Emergency Alarm" : "Play Loud Emergency Alarm";
    });

    // Copy SOS Coordinates
    document.getElementById('copy-sos-loc-btn').addEventListener('click', () => {
      const msg = `EMERGENCY SOS: I need roadside assistance at Coordinates: ${this.userCoords.lat}, ${this.userCoords.lng}. Sent via OnTheSpot.`;
      navigator.clipboard.writeText(msg).then(() => {
        window.soundEngine.playSuccess();
        this.showToast("Emergency coordinates copied to clipboard!", "success");
      });
    });

    // Add Spot Modal Triggers
    const addSpotTrigger = document.getElementById('add-spot-trigger');
    const addSpotModal = document.getElementById('add-spot-modal');
    const closeAddSpotBtn = document.getElementById('close-add-spot-btn');
    const cancelAddSpotBtn = document.getElementById('cancel-add-spot-btn');

    addSpotTrigger.addEventListener('click', () => {
      window.soundEngine.playTap();
      this.openAddSpotModal();
    });
    closeAddSpotBtn.addEventListener('click', () => addSpotModal.classList.add('hidden'));
    cancelAddSpotBtn.addEventListener('click', () => addSpotModal.classList.add('hidden'));

    // "Use My GPS" inside Add Spot form
    document.getElementById('use-gps-pin-btn').addEventListener('click', () => {
      this.pinnedNewSpotCoords = { ...this.userCoords };
      document.getElementById('pin-coords-text').textContent = 
        `Lat: ${this.pinnedNewSpotCoords.lat}, Lng: ${this.pinnedNewSpotCoords.lng}`;
      this.showToast("Using your current GPS for new spot pin", "info");
    });

    // Submit Add Spot Form
    document.getElementById('add-spot-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleCreateSpot();
    });

    // Dispatch Tracker Close & Cancel & Complete
    document.getElementById('close-dispatch-btn').addEventListener('click', () => {
      document.getElementById('dispatch-tracker-modal').classList.add('hidden');
    });

    document.getElementById('cancel-dispatch-btn').addEventListener('click', () => {
      this.cancelDispatch();
    });

    document.getElementById('complete-job-btn').addEventListener('click', () => {
      this.completeDispatch();
    });

    // Chat modal
    const chatModal = document.getElementById('chat-modal');
    document.getElementById('tracker-chat-btn').addEventListener('click', () => {
      this.openChatModal();
    });
    document.getElementById('close-chat-btn').addEventListener('click', () => {
      chatModal.classList.add('hidden');
    });
    document.getElementById('send-chat-btn').addEventListener('click', () => {
      this.handleSendChatMessage();
    });
    document.getElementById('chat-user-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSendChatMessage();
    });

    // Dispatch Tracker WhatsApp Share Button
    const waTrackerBtn = document.getElementById('tracker-share-wa-btn');
    if (waTrackerBtn) {
      waTrackerBtn.addEventListener('click', () => {
        if (!this.activeDispatch) return;
        window.soundEngine.playTap();
        const spot = this.activeDispatch;
        const msg = `🚗 ONTHESPOT UPDATE: Helper ${spot.name} (${spot.phone}) is en route with toolkit to my location (Lat: ${this.userCoords.lat}, Lng: ${this.userCoords.lng}). ETA: ~${spot.etaMins} mins. Tracking live on OnTheSpot.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }

    // SOS WhatsApp Distress Button
    const waSosBtn = document.getElementById('whatsapp-sos-btn');
    if (waSosBtn) {
      waSosBtn.addEventListener('click', () => {
        window.soundEngine.playAlert();
        const msg = `🚨 URGENT EMERGENCY SOS! I need immediate roadside/emergency assistance at GPS Coordinates: ${this.userCoords.lat}, ${this.userCoords.lng}.\nOpen Map Location: https://maps.google.com/?q=${this.userCoords.lat},${this.userCoords.lng}\nSent via OnTheSpot Emergency Hub.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      });
    }

    // Diagnostic Wizard Modal Triggers
    const diagTrigger = document.getElementById('diagnose-trigger');
    const diagModal = document.getElementById('diagnostic-modal');
    const closeDiagBtn = document.getElementById('close-diagnostic-btn');
    if (diagTrigger && diagModal) {
      diagTrigger.addEventListener('click', () => {
        window.soundEngine.playTap();
        diagModal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      });
      closeDiagBtn.addEventListener('click', () => diagModal.classList.add('hidden'));

      // Symptom Selection
      const symptoms = {
        battery: {
          title: "Dead Battery / Starter Failure",
          cause: "Battery voltage dropped below 11.8V or alternator failed. Engine starter cannot draw crank current.",
          specialist: "Mobile Bike/Car Mechanic (Jumpstart Kit)",
          cost: "₹200 - ₹300",
          cat: "mechanic"
        },
        puncture: {
          title: "Tubeless Puncture / Pressure Loss",
          cause: "Nail or sharp debris punctured tread block, or bead valve seal is leaking.",
          specialist: "Puncture & Tyre Specialist",
          cost: "₹100 - ₹150",
          cat: "puncture"
        },
        overheating: {
          title: "Coolant Leakage / Thermal Hazard",
          cause: "Radiator hose rupture or thermostat stuck. WARNING: Do NOT open radiator cap while hot.",
          specialist: "Roadside Towing / Flatbed",
          cost: "₹600 - ₹900",
          cat: "towing"
        },
        lockout: {
          title: "Vehicle Lockout / Jammed Keys",
          cause: "Key fob battery drained, keys trapped inside cabin, or tumbler pin seizure.",
          specialist: "Verified Master Locksmith",
          cost: "₹350 - ₹500",
          cat: "locksmith"
        },
        breakdown: {
          title: "Clutch Cable / Transmission Breakage",
          cause: "Clutch inner wire snapped at lever end, or brake hydraulic line pressure lost.",
          specialist: "Mobile Mechanic (Wire & Tools)",
          cost: "₹200 - ₹300",
          cat: "mechanic"
        },
        electrical: {
          title: "Main MCB Short Circuit / Sparking",
          cause: "Phase overload or neutral wire burnt at distribution board. Fire hazard.",
          specialist: "Emergency Electrician",
          cost: "₹250 - ₹400",
          cat: "electrician"
        }
      };

      let activeDiagCat = 'mechanic';

      document.querySelectorAll('.symptom-card').forEach(card => {
        card.addEventListener('click', () => {
          window.soundEngine.playTap();
          document.querySelectorAll('.symptom-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');

          const issue = card.getAttribute('data-issue');
          const data = symptoms[issue];
          if (data) {
            activeDiagCat = data.cat;
            document.getElementById('diag-title').textContent = data.title;
            document.getElementById('diag-cause').textContent = data.cause;
            document.getElementById('diag-specialist').textContent = data.specialist;
            document.getElementById('diag-cost').textContent = data.cost;
            document.getElementById('diagnostic-result').classList.remove('hidden');
          }
        });
      });

      document.getElementById('diag-dispatch-action').addEventListener('click', () => {
        diagModal.classList.add('hidden');
        this.filters.category = activeDiagCat;
        document.querySelectorAll('.cat-pill').forEach(pill => {
          pill.classList.toggle('active', pill.getAttribute('data-cat') === activeDiagCat);
        });
        this.renderSpots();
        const available = window.dataStore.getFilteredSpots(this.filters);
        if (available.length > 0) {
          this.startDispatch(available[0]);
        }
      });
    }

    // Rate Card Modal Triggers
    const ratecardTrigger = document.getElementById('ratecard-trigger');
    const rateModal = document.getElementById('rate-card-modal');
    const closeRateBtn = document.getElementById('close-ratecard-btn');
    if (ratecardTrigger && rateModal) {
      ratecardTrigger.addEventListener('click', () => {
        window.soundEngine.playTap();
        rateModal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      });
      closeRateBtn.addEventListener('click', () => rateModal.classList.add('hidden'));

      // Calculate total
      const rateChecks = document.querySelectorAll('.rate-calc-check');
      const calcTotalEl = document.getElementById('calc-total-amount');

      const recalculateRates = () => {
        let total = 0;
        rateChecks.forEach(chk => {
          if (chk.checked) total += parseInt(chk.getAttribute('data-price'), 10);
        });
        calcTotalEl.textContent = `₹${total}`;
      };

      rateChecks.forEach(chk => {
        chk.addEventListener('change', () => {
          window.soundEngine.playTap();
          recalculateRates();
        });
      });

      document.getElementById('book-calculated-service-btn').addEventListener('click', () => {
        window.soundEngine.playSuccess();
        rateModal.classList.add('hidden');
        this.showToast(`Fair Rate Locked: Helpers nearby guarantee benchmark rates!`, 'success');
      });
    }

    // Receipt Modal Print & WhatsApp triggers
    document.getElementById('close-receipt-btn').addEventListener('click', () => {
      document.getElementById('receipt-modal').classList.add('hidden');
    });

    document.getElementById('print-receipt-btn').addEventListener('click', () => {
      window.print();
    });

    document.getElementById('share-receipt-wa-btn').addEventListener('click', () => {
      if (!this.lastCompletedSpot) return;
      const spot = this.lastCompletedSpot;
      const total = Math.round(spot.baseRate * 1.18);
      const text = `🧾 ONTHESPOT DIGITAL RECEIPT\nInvoice: #OTS-2026-${Math.floor(1000 + Math.random()*9000)}\nService: ${spot.specialty.split(',')[0]}\nTechnician: ${spot.name} (${spot.phone})\nTotal Paid: ₹${total} (incl. GST)\nStatus: PAID & RESOLVED\nVerified by OnTheSpot Safety Network.`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    });

    // Review Modal Events
    const reviewModal = document.getElementById('review-modal');
    document.getElementById('close-review-btn').addEventListener('click', () => {
      reviewModal.classList.add('hidden');
    });

    // Stars rating
    const stars = document.querySelectorAll('#star-rating-box .star');
    const captions = [
      "Poor experience",
      "Below expectations",
      "Average response",
      "Good service!",
      "Exceptional! Arrived super fast."
    ];
    let selectedRating = 5;

    stars.forEach(star => {
      star.addEventListener('click', () => {
        window.soundEngine.playTap();
        selectedRating = parseInt(star.getAttribute('data-val'), 10);
        stars.forEach((s, idx) => {
          s.classList.toggle('active', idx < selectedRating);
        });
        document.getElementById('rating-caption-text').textContent = captions[selectedRating - 1] || "Great!";
      });
    });

    // Tags toggle
    document.querySelectorAll('.review-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        window.soundEngine.playTap();
        tag.classList.toggle('selected');
      });
    });

    // Submit Review -> Opens Digital Invoice Receipt
    document.getElementById('submit-review-btn').addEventListener('click', () => {
      window.soundEngine.playSuccess();
      reviewModal.classList.add('hidden');
      this.showToast(`⭐ Review submitted (${selectedRating} Stars)! Generating verified receipt...`, 'success');
      setTimeout(() => {
        this.openReceiptModal(this.lastCompletedSpot);
      }, 400);
    });

    // Mobile Sheet Toggle
    const mobileTab = document.getElementById('mobile-sheet-toggle');
    const sidebar = document.getElementById('sidebar');
    mobileTab.addEventListener('click', () => {
      sidebar.classList.toggle('expanded');
      const arrow = document.getElementById('sheet-arrow');
      if (sidebar.classList.contains('expanded')) {
        arrow.setAttribute('data-lucide', 'chevron-down');
      } else {
        arrow.setAttribute('data-lucide', 'chevron-up');
      }
      if (window.lucide) window.lucide.createIcons();
    });

    // Tagda Feature: Language Switcher
    const langSwitcher = document.getElementById('lang-switcher');
    if (langSwitcher) {
      langSwitcher.addEventListener('click', () => {
        window.soundEngine.playTap();
        this.toggleLanguage();
      });
    }

    // Tagda Feature: Survival Mode (Battery API integration)
    const survivalBtn = document.getElementById('survival-mode-trigger');
    if (survivalBtn) {
      survivalBtn.addEventListener('click', () => {
        window.soundEngine.playAlert();
        this.emergencyFeatures.toggleSurvivalMode();
      });
    }

    // Tagda Feature: Hazard Strobe
    const hazardBtn = document.getElementById('hazard-strobe-btn');
    if (hazardBtn) {
      hazardBtn.addEventListener('click', () => {
        window.soundEngine.playAlert();
        this.emergencyFeatures.toggleHazardStrobe(true);
      });
    }
    const stopStrobeBtn = document.getElementById('stop-strobe-btn');
    if (stopStrobeBtn) {
      stopStrobeBtn.addEventListener('click', () => {
        this.emergencyFeatures.toggleHazardStrobe(false);
      });
    }

    // Tagda Feature: Voice SOS
    const voiceBtn = document.getElementById('voice-sos-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        window.soundEngine.playTap();
        this.emergencyFeatures.startVoiceSOS();
      });
    }
    const stopVoiceBtn = document.getElementById('stop-voice-btn');
    if (stopVoiceBtn) {
      stopVoiceBtn.addEventListener('click', () => {
        this.emergencyFeatures.stopVoiceSOS();
      });
    }
    
    // Web Share API
    const shareBtn = document.getElementById('share-location-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'My Location - OnTheSpot Emergency',
              text: `I need help! My current location is Lat: ${this.userCoords.lat}, Lng: ${this.userCoords.lng}`,
              url: `https://www.google.com/maps/search/?api=1&query=${this.userCoords.lat},${this.userCoords.lng}`
            });
          } catch (err) {
            console.log('Error sharing:', err);
          }
        } else {
          this.showToast("Web Share not supported on this device.", "warning");
        }
      });
    }
  }

  updateCategoryCounts() {
    const allSpots = window.dataStore.spots;
    document.getElementById('count-all').textContent = allSpots.length;
    Object.keys(SPOT_CATEGORIES).forEach(cat => {
      const el = document.getElementById(`count-${cat}`);
      if (el) {
        el.textContent = allSpots.filter(s => s.category === cat).length;
      }
    });
  }

  renderSpots() {
    const spots = window.dataStore.getFilteredSpots(this.filters);
    const container = document.getElementById('spots-list');
    const countEl = document.getElementById('spots-found-count');
    const mobileSummary = document.getElementById('mobile-spot-summary');

    countEl.textContent = `${spots.length} Helpers Nearby`;
    mobileSummary.textContent = `Nearby Helpers (${spots.length} available)`;

    // Update map markers
    window.mapEngine.renderSpotMarkers(spots);

    if (spots.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748b;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h3 style="color: #fff; margin-bottom: 6px;">No spots found</h3>
          <p style="font-size: 0.8rem;">Try increasing search radius or clearing active filters.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 14px;" id="reset-filters-btn">
            Reset Filters
          </button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.filters.category = 'all';
          this.filters.maxDistance = 15;
          this.filters.openOnly = false;
          this.filters.query = '';
          document.getElementById('radius-slider').value = 15;
          document.getElementById('radius-val').textContent = '15 km';
          document.getElementById('open-only-toggle').checked = false;
          document.getElementById('search-input').value = '';
          document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-cat') === 'all'));
          this.renderSpots();
        });
      }
      return;
    }

    // Render cards
    container.innerHTML = spots.map(spot => {
      const catInfo = SPOT_CATEGORIES[spot.category] || { label: 'Service', icon: '⚡' };
      const isSelected = this.selectedSpot && this.selectedSpot.id === spot.id;

      return `
        <div class="spot-card ${isSelected ? 'selected' : ''}" data-id="${escapeHTML(spot.id)}">
          <div class="spot-card-top">
            <div class="spot-avatar-wrapper">
              <img src="${escapeHTML(spot.avatar)}" alt="${escapeHTML(spot.name)}" class="spot-avatar">
              <span class="spot-badge-icon">${catInfo.icon}</span>
            </div>
            <div class="spot-info-block">
              <div class="spot-title-row">
                <h3 class="spot-name">${escapeHTML(spot.name)}</h3>
                <span class="spot-distance-pill">${spot.distance} km</span>
              </div>
              <div class="spot-category-label">
                <span>${catInfo.label}</span>
                ${spot.isRealOsm ? '<span class="verified-tag" style="color:#38bdf8;"><i data-lucide="map-pin"></i> Live OSM Registered</span>' : (spot.isRealHelpline ? '<span class="verified-tag"><i data-lucide="shield-check"></i> Genuine 24/7 Helpline</span>' : (spot.verified ? '<span class="verified-tag"><i data-lucide="shield-check"></i> Verified Helper</span>' : ''))}
              </div>
              <div class="spot-meta-row">
                <span class="spot-rating">★ ${spot.rating} <span class="spot-rating-count">(${spot.reviewsCount})</span></span>
                <span class="spot-eta-tag"><i data-lucide="clock"></i> ${spot.etaMins} mins</span>
                <span class="spot-pricing-preview">₹${spot.baseRate}</span>
              </div>
            </div>
          </div>
          <p class="spot-description-snippet">${escapeHTML(spot.specialty)}</p>
          <div class="spot-actions-bar">
            <a href="tel:${spot.phone ? escapeHTML(spot.phone).replace(/\s+/g, '') : '18001021800'}" class="btn btn-call btn-sm" onclick="event.stopPropagation()" title="Call ${escapeHTML(spot.phone)}">
              <i data-lucide="phone"></i>
              <span>Call</span>
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" target="_blank" class="btn btn-secondary btn-sm" onclick="event.stopPropagation()" title="Get Directions">
              <i data-lucide="navigation"></i>
              <span>Directions</span>
            </a>
            <button class="btn btn-primary btn-sm dispatch-btn" data-id="${spot.id}">
              <i data-lucide="zap"></i>
              <span>Dispatch</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    // Attach card click handlers
    container.querySelectorAll('.spot-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('.dispatch-btn')) return;
        const spotId = card.getAttribute('data-id');
        const spot = spots.find(s => s.id === spotId);
        if (spot) {
          window.soundEngine.playTap();
          this.onSpotSelected(spot);
        }
      });
    });

    // Attach dispatch button handlers
    container.querySelectorAll('.dispatch-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const spotId = btn.getAttribute('data-id');
        const spot = spots.find(s => s.id === spotId);
        if (spot) {
          this.startDispatch(spot);
        }
      });
    });
  }

  onSpotSelected(spot) {
    this.selectedSpot = spot;
    document.querySelectorAll('.spot-card').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-id') === spot.id);
    });
    window.mapEngine.highlightSpot(spot);
  }

  onMapClicked(latlng) {
    if (this.isPinningMode) {
      this.pinnedNewSpotCoords = {
        lat: parseFloat(latlng.lat.toFixed(4)),
        lng: parseFloat(latlng.lng.toFixed(4))
      };
      document.getElementById('pin-coords-text').textContent = 
        `Lat: ${this.pinnedNewSpotCoords.lat}, Lng: ${this.pinnedNewSpotCoords.lng}`;
      this.showToast(`Pinned Location at ${this.pinnedNewSpotCoords.lat}, ${this.pinnedNewSpotCoords.lng}`, "success");
    }
  }

  // Breakdown simulation: simulate emergency flat tyre / mechanic needed
  triggerBreakdownSimulation() {
    window.soundEngine.playAlert();
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 500]); // SOS haptic pattern
    }
    this.showToast("⚠️ VEHICLE BREAKDOWN DETECTED! Filtering closest puncture & mechanics.", "danger");

    // Switch filter to puncture
    this.filters.category = 'puncture';
    document.querySelectorAll('.cat-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-cat') === 'puncture');
    });

    this.renderSpots();

    // Automatically focus on the first available helper
    const available = window.dataStore.getFilteredSpots(this.filters);
    if (available.length > 0) {
      setTimeout(() => {
        this.onSpotSelected(available[0]);
      }, 400);
    }
  }

  // Instant Dispatch Simulation
  startDispatch(spot) {
    this.activeDispatch = spot;
    window.soundEngine.playSuccess();

    // Populate dispatch modal
    const modal = document.getElementById('dispatch-tracker-modal');
    modal.classList.remove('hidden');

    document.getElementById('tracker-eta-mins').textContent = spot.etaMins;
    document.getElementById('tracker-status-title').textContent = "Helper Dispatched";
    document.getElementById('tracker-status-desc').textContent = `${spot.name} is on the way with emergency toolkit.`;
    document.getElementById('tracker-progress').style.width = '15%';

    document.getElementById('tracker-driver-img').src = spot.avatar;
    document.getElementById('tracker-driver-name').textContent = spot.name;
    document.getElementById('tracker-driver-spec').textContent = 
      SPOT_CATEGORIES[spot.category]?.label || "Service Specialist";

    document.getElementById('tracker-service-name').textContent = spot.specialty.split(',')[0];
    document.getElementById('tracker-est-cost').textContent = `₹${spot.baseRate}`;
    document.getElementById('tracker-call-btn').href = `tel:${spot.phone}`;

    // Reset chat
    this.chatMessages = [
      { sender: 'driver', text: `Namaste! Main nikal chuka hu, lagbhag ${spot.etaMins} minute mein aapke location par pahunch raha hu. Koi specific landmark hai?` }
    ];

    this.showToast(`Dispatch Confirmed: ${spot.name} is arriving in ~${spot.etaMins} mins!`, 'success');

    // Start animated route and GPS movement on the map
    window.mapEngine.startRouteAnimation(
      { lat: spot.lat, lng: spot.lng },
      this.userCoords,
      (percent, currentCoords) => {
        // Progress update
        const progressEl = document.getElementById('tracker-progress');
        if (progressEl) progressEl.style.width = `${Math.min(95, 15 + percent * 0.8)}%`;

        const coordsEl = document.getElementById('tracker-coords');
        if (coordsEl) coordsEl.textContent = `Lat: ${currentCoords[0].toFixed(4)}, Lng: ${currentCoords[1].toFixed(4)}`;

        const remainingMins = Math.max(1, Math.round(spot.etaMins * (1 - percent / 100)));
        document.getElementById('tracker-eta-mins').textContent = remainingMins;
      },
      () => {
        // Driver arrived
        window.soundEngine.playSuccess();
        document.getElementById('tracker-eta-mins').textContent = '0';
        document.getElementById('tracker-status-title').textContent = "Helper Arrived On The Spot!";
        document.getElementById('tracker-status-desc').textContent = `${spot.name} has reached your precise location!`;
        document.getElementById('tracker-progress').style.width = '100%';
        this.showToast(`🎉 ${spot.name} has arrived at your spot!`, 'success');
      }
    );

    if (window.lucide) window.lucide.createIcons();
  }

  cancelDispatch() {
    window.soundEngine.playTap();
    window.mapEngine.clearRouteAnimation();
    document.getElementById('dispatch-tracker-modal').classList.add('hidden');
    this.showToast("Service request cancelled.", "warning");
    this.activeDispatch = null;
  }

  completeDispatch() {
    window.soundEngine.playSuccess();
    window.mapEngine.clearRouteAnimation();
    document.getElementById('dispatch-tracker-modal').classList.add('hidden');
    this.lastCompletedSpot = this.activeDispatch;
    this.activeDispatch = null;
    this.showToast("Service marked resolved! Please rate your experience.", "success");
    setTimeout(() => {
      this.openReviewModal(this.lastCompletedSpot);
    }, 400);
  }

  openReviewModal(spot) {
    if (!spot) return;
    const modal = document.getElementById('review-modal');
    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  openReceiptModal(spot) {
    if (!spot) return;
    const modal = document.getElementById('receipt-modal');
    modal.classList.remove('hidden');

    const invNo = `#OTS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
                    now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('receipt-invoice-no').textContent = invNo;
    document.getElementById('receipt-timestamp').textContent = dateStr;
    document.getElementById('receipt-gps').textContent = `${this.userCoords.lat}, ${this.userCoords.lng}`;
    document.getElementById('receipt-provider-name').textContent = spot.name;
    document.getElementById('receipt-provider-phone').textContent = `${spot.phone} • Nearby (via OpenStreetMap)`;
    document.getElementById('receipt-service-title').textContent = spot.specialty.split(',')[0] || "Emergency Service";

    const baseFee = spot.baseRate;
    const gst = Math.round(baseFee * 0.18);
    const total = baseFee + gst;

    document.getElementById('receipt-base-fee').textContent = `₹${baseFee}.00`;
    document.getElementById('receipt-gst').textContent = `₹${gst}.00`;
    document.getElementById('receipt-total').textContent = `₹${total}.00`;

    // Dynamic UPI payment link
    const upiUri = `upi://pay?pa=ots.helper@okhdfcbank&pn=${encodeURIComponent(spot.name)}&am=${total}&cu=INR`;
    document.getElementById('receipt-upi-id').textContent = upiUri;

    if (window.lucide) window.lucide.createIcons();
  }

  // Chat Simulation
  openChatModal() {
    if (!this.activeDispatch) return;
    const modal = document.getElementById('chat-modal');
    modal.classList.remove('hidden');

    document.getElementById('chat-driver-avatar').src = escapeHTML(this.activeDispatch.avatar);
    document.getElementById('chat-driver-name').textContent = this.activeDispatch.name;

    this.renderChatMessages();
    if (window.lucide) window.lucide.createIcons();
  }

  renderChatMessages() {
    const container = document.getElementById('chat-messages-container');
    container.innerHTML = this.chatMessages.map(msg => `
      <div class="chat-bubble ${escapeHTML(msg.sender)}">
        ${escapeHTML(msg.text)}
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  handleSendChatMessage() {
    const input = document.getElementById('chat-user-input');
    const text = input.value.trim();
    if (!text) return;

    window.soundEngine.playTap();
    this.chatMessages.push({ sender: 'user', text });
    input.value = '';
    this.renderChatMessages();

    // Simulated driver response
    setTimeout(() => {
      window.soundEngine.playTap();
      const driverReplies = [
        "Haan bhaiya, main traffic se nikal gaya hu, bas 2 minute!",
        "Theek hai, main toolkit ready karke sidha wahi rukunga.",
        "Aap bilkul chinta mat karo, sab fix ho jayega On The Spot!",
        "Aapki location map pe live dikh rahi hai, samne hi hu!"
      ];
      const reply = driverReplies[Math.floor(Math.random() * driverReplies.length)];
      this.chatMessages.push({ sender: 'driver', text: reply });
      this.renderChatMessages();
    }, 1200);
  }

  // Register New Spot Flow
  openAddSpotModal() {
    this.isPinningMode = true;
    this.pinnedNewSpotCoords = { ...this.userCoords };
    document.getElementById('pin-coords-text').textContent = 
      `Lat: ${this.pinnedNewSpotCoords.lat}, Lng: ${this.pinnedNewSpotCoords.lng}`;
    document.getElementById('add-spot-modal').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  handleCreateSpot() {
    const name = document.getElementById('new-spot-name').value.trim();
    const category = document.getElementById('new-spot-category').value;
    const phone = document.getElementById('new-spot-phone').value.trim();
    const rate = parseInt(document.getElementById('new-spot-rate').value, 10);
    const eta = parseInt(document.getElementById('new-spot-eta').value, 10) || 10;
    const desc = document.getElementById('new-spot-desc').value.trim() || "Local verified instant emergency service";

    const coords = this.pinnedNewSpotCoords || this.userCoords;

    const newSpot = {
      id: `spot-custom-${Date.now()}`,
      name,
      category,
      phone,
      rating: 5.0,
      reviewsCount: 1,
      baseRate: rate,
      etaMins: eta,
      openNow: true,
      verified: true,
      specialty: desc,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      lat: coords.lat,
      lng: coords.lng,
      isCustom: true
    };

    window.dataStore.saveCustomSpot(newSpot);
    window.soundEngine.playSuccess();
    this.showToast(`🎉 "${name}" added to live map!`, 'success');

    document.getElementById('add-spot-modal').classList.add('hidden');
    document.getElementById('add-spot-form').reset();
    this.isPinningMode = false;

    this.updateCategoryCounts();
    this.renderSpots();
    this.onSpotSelected(newSpot);
  }

  // --- TAGDA FEATURES IMPLEMENTATION ---

  toggleLanguage() {
    this.currentLang = this.currentLang === 'hi' ? 'en' : 'hi';
    const btnSpan = document.querySelector('#lang-switcher span');
    if (btnSpan) btnSpan.textContent = this.currentLang === 'hi' ? 'EN' : 'HI';
    
    document.querySelectorAll('.lang-text').forEach(el => {
      const text = el.getAttribute(`data-${this.currentLang}`);
      if (text) {
        el.textContent = text;
      }
    });
    this.showToast(this.currentLang === 'hi' ? "Hinglish language activated" : "English language activated", "success");
  }



  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: 'check-circle-2',
      danger: 'alert-triangle',
      warning: 'alert-circle',
      info: 'info'
    };

    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'bell'}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Instantiate and start app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.appEngine = new AppEngine();
  window.appEngine.init();
});
