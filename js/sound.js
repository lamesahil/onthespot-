/* ==========================================================================
   OnTheSpot - Sound FX Engine (sound.js)
   Uses Web Audio API to synthesize UI sound effects without external audio files
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.isSirenPlaying = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.isSirenPlaying) {
      this.stopSiren();
    }
    return this.enabled;
  }

  playTap() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playRadarPing() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    } catch (e) {}
  }

  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.15);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  toggleSiren() {
    if (this.isSirenPlaying) {
      this.stopSiren();
      return false;
    } else {
      this.startSiren();
      return true;
    }
  }

  startSiren() {
    this.init();
    if (!this.audioCtx) return;
    if (this.isSirenPlaying) return;

    try {
      this.isSirenPlaying = true;
      this.sirenGain = this.audioCtx.createGain();
      this.sirenGain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);

      this.sirenOsc1 = this.audioCtx.createOscillator();
      this.sirenOsc1.type = 'sawtooth';
      this.sirenOsc1.frequency.setValueAtTime(700, this.audioCtx.currentTime);

      // LFO to modulate siren pitch
      const lfo = this.audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(1.5, this.audioCtx.currentTime); // 1.5 Hz cycle
      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(300, this.audioCtx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc1.frequency);

      this.sirenOsc1.connect(this.sirenGain);
      this.sirenGain.connect(this.audioCtx.destination);

      lfo.start();
      this.sirenOsc1.start();
      this.sirenLfo = lfo;
    } catch (e) {
      this.isSirenPlaying = false;
    }
  }

  stopSiren() {
    if (!this.isSirenPlaying) return;
    try {
      if (this.sirenOsc1) {
        this.sirenOsc1.stop();
        this.sirenOsc1.disconnect();
      }
      if (this.sirenLfo) {
        this.sirenLfo.stop();
        this.sirenLfo.disconnect();
      }
      if (this.sirenGain) {
        this.sirenGain.disconnect();
      }
    } catch (e) {}
    this.isSirenPlaying = false;
  }
}

// Global Sound instance
window.soundEngine = new SoundEngine();
