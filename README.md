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
- **Offline-First Caching (TTL):** Implemented an `IndexedDB` cache (falling back to memory) with a 2-hour Time-To-Live (TTL). If the user loses cellular signal on a highway or the API times out, the app instantly falls back to rendering the cached local responders.

### 2. Hardware API Integrations (Progressive Enhancement)
Because this app relies heavily on native browser APIs, I treated all of them as progressive enhancements with graceful fallbacks. If an API is unavailable (or denied), the app simply bypasses it without breaking the core flow.

| API | Core Purpose | Browser Support Gaps |
| --- | --- | --- |
| **Geolocation** | Finds nearest helpers | Standard. Requires HTTPS. Fails gracefully to a default central hub if denied. |
| **Battery Status** | Triggers "Survival Mode" (Pure black OLED) < 20% | **Chromium Only.** Removed from Firefox/Safari for fingerprinting reasons. |
| **Web Speech** | "Voice SOS" hands-free intent filtering | **Spotty.** Solid in Chrome/Edge, largely absent in Firefox and older Safari. |
| **Vibration** | Haptic SOS SOS feedback pattern | **No iOS Safari support.** Works on Android/Chromium. |
| **Web Share** | One-tap native live location sharing | **Inconsistent.** Good on mobile Safari/Android, often absent on Desktop. |

### 3. Production-Grade UI/UX
- **Glassmorphism & Micro-animations:** A modern, premium UI built with vanilla CSS variables and smooth transitions.
- **Strict Accessibility (a11y):** Built for panic scenarios. Respects `@media (prefers-reduced-motion: reduce)` by stripping all CSS animations and pulsing effects for users with motion sensitivities.
- **Bilingual Support:** Seamless toggling between English and "Hinglish" (Hindi-English) for localized Indian audiences.

## 🛠 Tech Stack

- **Core:** HTML5, CSS3 (Vanilla), JavaScript (ES6+ Modules)
- **Mapping:** Leaflet.js (`unpkg` CDN)
- **Data Source:** OpenStreetMap (Overpass API)
- **Icons:** Lucide Icons
- **Zero Build Step (For Production):** No React, No Webpack required to run the client. `package.json` and Vitest are included strictly as dev-dependencies for testing the data layer.

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

## ⚠️ Known Limitations

As an engineering demonstration rather than a funded startup, this project operates with honest constraints:
- **Browser Fragmentation:** Several advanced features (Battery API, Web Speech, Vibration) rely on APIs that Apple/Mozilla have deprecated or ignored. These are feature-detected and handled as progressive enhancements. Safari Private Browsing's restrictive `IndexedDB` quotas are also wrapped in `try/catch` blocks.
- **Overpass API Throttling:** Querying live OSM data on a public instance can result in timeouts during heavy load, especially in dense urban areas. The app uses a 10-second debounce and caches recent searches to minimize spam, but public limits apply.
- **Data Veracity:** OpenStreetMap data is crowd-sourced. A "hospital" tag might be a major trauma center or a tiny local clinic. 
- **Disclaimer:** *OnTheSpot is a demonstration portfolio project. It is not a replacement for dialing official emergency services (e.g., 112, 911). Auto-dispatches and digital receipts are simulated.*
