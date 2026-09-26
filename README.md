<div align="center">
  <img src="https://img.icons8.com/color/96/000000/siren.png" alt="Logo" width="80" height="80">
  <h1 align="center">OnTheSpot 🚨</h1>
  <p align="center">
    <strong>Hyperlocal Emergency & Instant Service Dispatch Network</strong>
    <br />
    A production-grade, framework-less Vanilla JavaScript application built for high-stress scenarios.
  </p>
</div>

---

## 📖 Overview

**OnTheSpot** is a real-time web application designed to connect people in sudden distress—such as a punctured tyre, dead bike battery, broken car lock, or midnight medical emergency—with nearby emergency responders within a 5 km radius in minutes. 

Instead of relying on a proprietary backend, the application dynamically queries live **OpenStreetMap (OSM)** data to find real-world local mechanics, electricians, and towing services. It is designed to be blindingly fast, offline-resilient, and accessible in high-stress situations.

## ✨ Key Features & Engineering Decisions

This project avoids generic portfolio fluff and focuses on solving complex engineering challenges purely on the client-side:

### 1. Robust Data Layer (No Backend)
- **Live Overpass API Integration:** Dynamically fetches real nearby businesses (mechanics, pharmacies, locksmiths) based on the user's live GPS coordinates.
- **Debounce & Throttling:** Implemented a strict request throttle to prevent Overpass API IP bans from rapid map panning or frantic user clicks.
- **Offline-First Caching (TTL):** Implemented a `localStorage` cache with a 2-hour Time-To-Live (TTL). If the user loses cellular signal on a highway or the API times out, the app instantly falls back to rendering the cached local responders.

### 2. Hardware API Integrations
- **Web Speech API (Intent Detection):** Features a hands-free "Voice SOS" mode. Instead of generic LLM wrappers, it uses native browser speech recognition to detect emergency intents (e.g., "puncture", "battery", "help") and auto-filters the map instantly.
- **Battery Status API (Survival Mode):** The app monitors the device's battery level in real-time. If the battery drops below 20%, it auto-triggers a high-contrast, pure-black OLED "Survival Mode" and strips all animations to preserve remaining battery life.
- **Geolocation API:** High-accuracy GPS tracking with **graceful degradation**. If the user denies location access, the app doesn't break; it falls back to a default central hub with clear UI warnings.

### 3. Production-Grade UI/UX
- **Glassmorphism & Micro-animations:** A modern, premium UI built with vanilla CSS variables and smooth transitions.
- **Strict Accessibility (a11y):** Built for panic scenarios. Respects `@media (prefers-reduced-motion: reduce)` by stripping all CSS animations and pulsing effects for users with motion sensitivities.
- **Bilingual Support:** Seamless toggling between English and "Hinglish" (Hindi-English) for localized Indian audiences.

## 🛠 Tech Stack

- **Core:** HTML5, CSS3 (Vanilla), JavaScript (ES6+ Modules)
- **Mapping:** Leaflet.js (`unpkg` CDN)
- **Data Source:** OpenStreetMap (Overpass API)
- **Icons:** Lucide Icons
- **Zero Build Step:** No React, No Webpack, No Node.js required to run.

## 🚀 How to Run Locally

Because this project is built entirely with Vanilla JavaScript and has zero backend dependencies, running it is incredibly simple:

1. **Clone the repo:**
   ```bash
   git clone https://github.com/lamesahil/onthespot-.git
   cd onthespot-
   ```

2. **Serve the files:**
   You can use any local HTTP server. For example, using Python or Node:
   ```bash
   python -m http.server 3000
   # OR
   npx serve .
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:3000`.

## 🧠 Architecture

The codebase was deliberately refactored from a monolithic script into a clean, modular ES6 architecture to enforce Separation of Concerns:

- `/js/app.js`: Core state management and UI event binding.
- `/js/services/OverpassAPI.js`: Independent service class handling OSM network requests, debouncing, and cache validation.
- `/js/features/EmergencyFeatures.js`: Encapsulates all Hardware API logic (Voice SOS, Hazard Strobe, Battery Monitoring).
- `/js/data.js`: Merges API results with fallback verified national helplines.
- `/js/map.js`: Leaflet mapping engine abstraction.

## ⚖️ Disclaimer

*OnTheSpot is a demonstration portfolio project. It is not a replacement for dialing official emergency services (e.g., 112, 911). Auto-dispatches and digital receipts are simulated for demonstration purposes.*
