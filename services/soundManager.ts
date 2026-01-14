
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private birdsGain: GainNode | null = null;
  private cheerGain: GainNode | null = null;

  init() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0.5;

    this.birdsGain = this.ctx.createGain();
    this.birdsGain.gain.value = 0.08;
    this.birdsGain.connect(this.masterGain);
    
    this.cheerGain = this.ctx.createGain();
    this.cheerGain.gain.value = 0.3;
    this.cheerGain.connect(this.masterGain);

    this.playAmbientBirds();
  }

  setMasterVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx?.currentTime || 0, 0.1);
    }
  }

  private playAmbientBirds() {
    if (!this.ctx || !this.birdsGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const time = this.ctx.currentTime;
    osc.frequency.setValueAtTime(1800 + Math.random() * 1500, time);
    osc.frequency.exponentialRampToValueAtTime(1000, time + 0.2);
    
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.04, time + 0.05);
    g.gain.linearRampToValueAtTime(0, time + 0.2);
    
    osc.connect(g);
    g.connect(this.birdsGain);
    osc.start(time);
    osc.stop(time + 0.2);
    
    setTimeout(() => this.playAmbientBirds(), 5000 + Math.random() * 8000);
  }

  playPurchase() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046, this.ctx.currentTime + 0.3);
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playCut() {
    if (!this.ctx || !this.masterGain) return;
    // Snap Sound
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(900, this.ctx.currentTime);
    snapGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    snapGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    snapOsc.connect(snapGain);
    snapGain.connect(this.masterGain);
    snapOsc.start();
    snapOsc.stop(this.ctx.currentTime + 0.15);

    // Dynamic Crowd Cheer simulation
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) output[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + 0.5);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.cheerGain!);
    noise.start();
  }

  playSuccess() {
    if (!this.ctx || !this.masterGain) return;
    [523, 659, 783, 1046].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.1);
      g.gain.setValueAtTime(0.1, this.ctx.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.4);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.4);
    });
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const soundManager = new SoundManager();
