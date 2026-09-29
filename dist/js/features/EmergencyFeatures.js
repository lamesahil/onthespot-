/* ==========================================================================
   OnTheSpot - Emergency Features (js/features/EmergencyFeatures.js)
   Handles Voice SOS, Hazard Strobe, and Battery Survival Mode
   ========================================================================== */

class EmergencyFeatures {
  constructor(appEngine) {
    this.app = appEngine;
    this.isSurvivalMode = false;
    this.recognition = null;
  }

  toggleSurvivalMode() {
    this.isSurvivalMode = !this.isSurvivalMode;
    if (this.isSurvivalMode) {
      document.body.classList.add('survival-mode');
      this.app.showToast("⚡ Low Battery Survival Mode Activated", "warning");
    } else {
      document.body.classList.remove('survival-mode');
      this.app.showToast("Survival Mode Deactivated", "info");
    }
  }

  toggleHazardStrobe(enable) {
    const overlay = document.getElementById('hazard-strobe-overlay');
    if (enable) {
      overlay.classList.remove('hidden');
      this.app.showToast("⚠️ Hazard Strobe Active. Place phone visible to incoming traffic.", "danger");
    } else {
      overlay.classList.add('hidden');
    }
  }

  startVoiceSOS() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.app.showToast("Voice SOS is not supported in this browser.", "danger");
      return;
    }

    const overlay = document.getElementById('voice-sos-overlay');
    overlay.classList.remove('hidden');

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.app.currentLang === 'hi' ? 'hi-IN' : 'en-US';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.start();

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      overlay.classList.add('hidden');
      this.app.showToast(`Heard: "${transcript}"`, "info");
      
      if (transcript.includes('puncture') || transcript.includes('tyre') || transcript.includes('टायर') || transcript.includes('पंक्चर')) {
        this.app.filters.category = 'puncture';
        this.app.triggerBreakdownSimulation();
      } else if (transcript.includes('battery') || transcript.includes('start') || transcript.includes('बैटरी')) {
        this.app.filters.category = 'mechanic';
        this.app.triggerBreakdownSimulation();
      } else if (transcript.includes('accident') || transcript.includes('help') || transcript.includes('मदद') || transcript.includes('emergency')) {
        this.app.filters.category = 'medical';
        this.app.triggerBreakdownSimulation();
      } else {
        this.app.showToast("Could not determine emergency type. Try again.", "warning");
      }
    };

    this.recognition.onerror = (event) => {
      overlay.classList.add('hidden');
      this.app.showToast("Voice recognition failed. Try again.", "danger");
    };

    this.recognition.onend = () => {
      overlay.classList.add('hidden');
    };
  }

  stopVoiceSOS() {
    if (this.recognition) {
      this.recognition.stop();
    }
    document.getElementById('voice-sos-overlay').classList.add('hidden');
  }
}

window.EmergencyFeatures = EmergencyFeatures;
