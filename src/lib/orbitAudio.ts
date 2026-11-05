class OrbitAudio {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private proctorVoiceEnabled: boolean = true;
  private ambientNode: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientPlaying: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.enabled = localStorage.getItem('orbit_sound_enabled') !== 'false';
      this.proctorVoiceEnabled = localStorage.getItem('orbit_proctor_enabled') !== 'false';
    }
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Pleasant major chord chime (C5 - E5 - G5)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.36);
    });
  }

  public playIncorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public speakProctor(text: string) {
    if (!this.proctorVoiceEnabled || typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  public toggleAmbientSound(force?: boolean): boolean {
    if (typeof window === 'undefined') return false;
    this.init();
    if (!this.ctx) return false;

    const nextState = force !== undefined ? force : !this.ambientPlaying;

    if (!nextState) {
      // Clean up ambient sound nodes
      if (this.ambientNode) {
        this.ambientNode.disconnect();
        this.ambientNode = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
      this.ambientPlaying = false;
      return false;
    }

    // Clean up any existing ambient nodes before creating new ones
    if (this.ambientNode) {
      this.ambientNode.disconnect();
      this.ambientNode = null;
    }
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }

    // Create soothing, quiet exam room / library air sound
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm low frequencies (like quiet air circulation in an exam hall)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime); // Very quiet & non-intrusive

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    whiteNoise.start();
    this.ambientNode = whiteNoise;
    this.ambientPlaying = true;
    return true;
  }

  public stopAmbientSound() {
    if (this.ambientPlaying) {
      this.toggleAmbientSound(false);
    }
  }

  public isAmbientPlaying(): boolean {
    return this.ambientPlaying;
  }

  public toggleProctorVoice(): boolean {
    this.proctorVoiceEnabled = !this.proctorVoiceEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_proctor_enabled', String(this.proctorVoiceEnabled));
    }
    return this.proctorVoiceEnabled;
  }

  public isProctorEnabled(): boolean {
    return this.proctorVoiceEnabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_sound_enabled', String(this.enabled));
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

export const orbitAudio = new OrbitAudio();
