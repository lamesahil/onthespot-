# OnTheSpot (ऑन-द-स्पॉट) 🚨📍
### Hyperlocal Emergency & Instant Roadside Service Dispatch Platform

**OnTheSpot** is a real-time web application designed to connect people in sudden distress—such as a punctured tyre, dead bike battery, broken car lock, home electrical short circuit, or midnight medical emergency—with verified local helpers and technicians within a 5 km radius in minutes.

---

## ✨ Key Features

1. **Interactive Live Cyber Dark Map**
   - Built on Leaflet.js with custom-styled dark tiles and radar sweep animations.
   - Dynamic pulsing category markers:
     - 🔧 **Puncture & Tyre Repair**
     - 🚗 **Towing & Flatbed Rescue**
     - 🛵 **Mobile Mechanic & Jumpstart**
     - 🔑 **Locksmith & Keymaker**
     - 💡 **Emergency Electrician**
     - 🏥 **24x7 Chemist & Emergency Aid**
   - Click-to-focus on map markers with detailed dark glassmorphism popups.

2. **Smart Vehicle Breakdown Diagnostic Wizard ("Diagnose")**
   - Interactive breakdown troubleshooter covering 6 common emergency scenarios:
     - 🪫 Dead Battery / Starter Failure
     - 🛞 Flat Tyre / Puncture Loss
     - 💨 Overheating / Smoke from Bonnet
     - 🔒 Vehicle Lockout / Key Lost
     - 🛑 Brake / Clutch Cable Jam
     - ⚡ Home MCB Short Circuit / Sparking
   - Provides instant AI breakdown guidance, estimated fair repair cost, and one-tap auto-match & dispatch!

3. **Fair Rate Card & Cost Estimator ("Rate Card")**
   - Transparent price estimator to protect stranded drivers from roadside overcharging.
   - Interactive checklist with real-time dynamic total calculation (Puncture, Battery Jumpstart, Lockout, Towing, Night Emergency Surcharge).

4. **Real-Time Dispatch Simulator with WhatsApp Status**
   - Tap **"Dispatch Spot"** on any provider to initiate a live assistance request.
   - Dynamic animated polyline route drawn from the provider's spot to the user's location.
   - Animated vehicle icon (🛵) gliding along the route with live ETA countdown.
   - Driver profile with ratings, direct calling (`tel:`), simulated chat, and **1-Click WhatsApp Live Status Sharing** with family.

5. **Rating System & Digital Tax Invoice Receipt**
   - After job completion, users rate their experience (1–5 stars + feedback tags).
   - Generates an official, printable **Digital Roadside Assistance Invoice** featuring:
     - Verified `#OTS-2026-XXXX` invoice number & live GPS coordinates
     - Itemized charges breakdown + 18% GST calculation
     - Green **"PAID & RESOLVED"** authenticity stamp & safety barcode
     - **UPI Scan & Pay** support (GPay, PhonePe, Paytm, BHIM)
     - 1-click **Print / Save as PDF** and **Share Receipt via WhatsApp**

6. **Emergency SOS Hub with WhatsApp Distress**
   - Flashing top-bar SOS button.
   - 1-tap quick access to critical national emergency hotlines:
     - **112** (National Emergency Police / Fire)
     - **108** (Medical Ambulance)
     - **1033** (National Highway & Expressway Breakdown)
     - **1091** (Women Safety Helpline)
   - Built-in loud synthesized emergency siren alarm.
   - 1-click WhatsApp SOS distress message pre-formatted with live Google Maps link.

4. **"Simulate Flat Tyre" Emergency Button**
   - Instant simulation button on the map to trigger a sudden roadside breakdown alert, automatically filtering and focusing on the closest mobile puncture mechanic.

5. **Register Your Spot / Helper**
   - Local mechanics, puncture shops, and emergency workers can register their spot.
   - Pick location directly by clicking on the map or using active GPS.
   - Saved locally via `localStorage` for instant persistence.

6. **Web Audio API Sound Engine**
   - Synthesizes futuristic sonar radar blips, UI taps, confirmation chimes, alert tones, and sirens natively in the browser without any external audio files.

---

## 🚀 How to Run Locally

1. Open your terminal in the project directory:
   ```bash
   cd d:/Project/onthespot
   ```

2. Start a local server (Python or Node):
   ```bash
   python -m http.server 3000
   ```
   *or*
   ```bash
   npx serve . -p 3000
   ```

3. Open your browser and navigate to:
   [http://localhost:3000/](http://localhost:3000/)

---

## 🛠️ Tech Stack
- **Structure:** HTML5 Semantic Elements, Mobile-first responsive layout
- **Styling:** Custom Vanilla CSS3 (Glassmorphism, CSS Custom Properties, Animations, Dark Theme)
- **Map:** Leaflet.js
- **Audio:** Web Audio API (OscillatorNode, GainNode, LFO pitch modulation)
- **Icons:** Lucide Icons
- **Storage:** LocalStorage for user-registered spots
