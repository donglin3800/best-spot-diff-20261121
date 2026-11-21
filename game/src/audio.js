// Synthesised sound effects through WebAudio: no audio files, no network,
// just oscillators. Everything is lazy (the context starts on the first
// user gesture) and every call is safe before that moment.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Start the audio context from a user gesture; harmless when called twice.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (err) {
      this.ctx = null;
    }
  }

  // One short tone. `when` delays it in seconds for little arpeggios.
  tone(freq, dur, type, vol, when) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A soft click for buttons and the crosshair.
  click() {
    this.tone(660, 0.07, 'triangle', 0.08, 0);
  }

  // A bright two-note chime when a difference is found.
  found() {
    this.tone(880, 0.14, 'sine', 0.14, 0);
    this.tone(1318, 0.22, 'sine', 0.12, 0.09);
  }

  // A low buzz for a wrong click.
  wrong() {
    this.tone(160, 0.22, 'sawtooth', 0.07, 0);
    this.tone(110, 0.26, 'sawtooth', 0.06, 0.05);
  }

  // A shimmer for a hint.
  hint() {
    this.tone(1046, 0.12, 'sine', 0.1, 0);
    this.tone(1568, 0.18, 'sine', 0.08, 0.08);
  }

  // A rising arpeggio for clearing a scene.
  win() {
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < notes.length; i += 1) {
      this.tone(notes[i], 0.22, 'triangle', 0.12, i * 0.11);
    }
  }

  // A falling line for running out of time.
  lose() {
    const notes = [392, 330, 262, 196];
    for (let i = 0; i < notes.length; i += 1) {
      this.tone(notes[i], 0.26, 'triangle', 0.1, i * 0.13);
    }
  }
}
