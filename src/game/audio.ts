type Noise = AudioBuffer;

function makeNoise(ctx: AudioContext, seconds = 1.2): Noise {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = last * 3.2;
  }
  return buf;
}

const MELODY = [
  440, 0, 523.25, 493.88, 0, 392, 440, 0, 349.23, 392, 440, 0, 329.63, 349.23, 392, 440,
  392, 0, 349.23, 329.63, 0, 293.66, 329.63, 0, 261.63, 293.66, 329.63, 0, 349.23, 392, 440, 0,
];
const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98, 110, 110, 87.31, 87.31, 98, 98, 110, 110];

export class StormAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noise: Noise | null = null;
  private pad: OscillatorNode[] = [];
  private rainGain: GainNode | null = null;
  private rainSrc: AudioBufferSourceNode | null = null;
  muted = false;
  private musicOn = false;
  private menuOn = false;
  private menuTimer: number | null = null;
  private menuStep = 0;
  private track: HTMLAudioElement | null = null;
  private trackWant = false;
  trackEnabled = true;

  unlock() {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC({ latencyHint: "interactive" });
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      // El volumen general permanece activo: los efectos y la música tienen
      // controles independientes para que silenciar efectos no corte la música.
      master.gain.value = 0.85;
      music.gain.value = this.trackEnabled ? 0.34 : 0;
      sfx.gain.value = this.muted ? 0 : 0.9;
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.music = music;
      this.sfx = sfx;
      this.noise = makeNoise(ctx);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.sfx) return;
    // Este interruptor afecta únicamente a efectos, lluvia y sonidos ambientales.
    // La música (incluida la pista del Arcade) sigue saliendo por su propio bus.
    this.sfx.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  startMenu() {
    this.unlock();
    this.startBed();
    if (!this.ctx || this.menuOn) return;
    this.menuOn = true;
    this.setRain(0.16);
    const stepMs = 340;
    const tick = () => {
      if (!this.menuOn) return;
      const i = this.menuStep % MELODY.length;
      const note = MELODY[i] ?? 0;
      if (note) this.voice(note, i % 8 === 6 ? 0.48 : 0.26, "triangle", 0.05, this.music);
      if (i % 2 === 0) {
        const bass = BASS[(i / 2) % BASS.length] ?? 110;
        this.voice(bass, 0.5, "sine", 0.07, this.music);
      }
      this.menuStep += 1;
      this.menuTimer = window.setTimeout(tick, stepMs);
    };
    tick();
  }

  stopMenu() {
    this.menuOn = false;
    if (this.menuTimer != null) window.clearTimeout(this.menuTimer);
    this.menuTimer = null;
  }

  stopPad() {
    for (const osc of this.pad) {
      try {
        osc.stop();
      } catch {
        /* ya estaba parado */
      }
    }
    this.pad = [];
    this.musicOn = false;
  }

  private ensureTrack() {
    this.unlock();
    if (this.track || !this.ctx || !this.master) return;
    const el = new Audio("/audio/profugos.mp3");
    el.loop = true;
    el.preload = "auto";
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    const node = this.ctx.createMediaElementSource(el);
    node.connect(gain);
    gain.connect(this.master);
    this.track = el;
  }

  preloadArcadeTrack() {
    this.ensureTrack();
    this.track?.load();
  }

  wantsArcadeTrack() {
    return this.trackWant;
  }

  startArcadeTrack() {
    this.unlock();
    this.stopMenu();
    this.stopPad();
    this.trackWant = true;
    this.ensureTrack();
    if (!this.trackEnabled || !this.track || !this.track.paused) return;
    void this.track.play().catch(() => {});
  }

  stopArcadeTrack() {
    this.trackWant = false;
    if (!this.track) return;
    this.track.pause();
    this.track.currentTime = 0;
  }

  pauseArcadeTrack() {
    this.track?.pause();
  }

  resumeArcadeTrack() {
    if (!this.trackWant || !this.trackEnabled || !this.track || !this.track.paused) return;
    void this.track.play().catch(() => {});
  }

  setTrackEnabled(on: boolean) {
    this.trackEnabled = on;
    if (this.ctx && this.music) {
      this.music.gain.setTargetAtTime(on ? 0.34 : 0, this.ctx.currentTime, 0.03);
    }
    if (!this.track) return;
    if (on && this.trackWant) void this.track.play().catch(() => {});
    else this.track.pause();
  }

  startBed() {
    this.unlock();
    if (!this.ctx || !this.music || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx;
    const notes = [196, 246.94, 293.66];
    this.pad = notes.map((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(this.music!);
      osc.start();
      return osc;
    });
    this.setRain(0.14);
  }

  setRain(amount: number) {
    if (!this.ctx || !this.sfx || !this.noise) return;
    if (!this.rainGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.6;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfx);
      src.start();
      this.rainSrc = src;
      this.rainGain = gain;
    }
    this.rainGain.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.08);
  }

  private voice(
    freq: number,
    dur: number,
    type: OscillatorType,
    gainValue: number,
    bus: GainNode | null,
    slideTo?: number,
  ) {
    if (!this.ctx || !bus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gainValue: number, slideTo?: number) {
    this.voice(freq, dur, type, gainValue, this.sfx, slideTo);
  }

  private burst(freq: number, dur: number, gainValue: number) {
    if (!this.ctx || !this.sfx || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.4), ctx.currentTime + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    src.start();
    src.stop(ctx.currentTime + dur + 0.02);
  }

  slide() {
    this.tone(640, 0.045, "square", 0.028, 360);
  }

  record() {
    [523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.18, "triangle", 0.08), i * 90);
    });
  }

  click() {
    this.tone(980, 0.045, "square", 0.045);
    this.tone(1480, 0.07, "square", 0.02);
  }

  flip() {
    this.tone(740 + Math.random() * 80, 0.07, "triangle", 0.06);
    this.burst(1800, 0.05, 0.04);
  }

  place(bonus: boolean) {
    this.tone(bonus ? 620 : 420, 0.12, "sine", 0.08, bonus ? 880 : 560);
    this.burst(400, 0.1, 0.08);
  }

  wrong() {
    this.tone(180, 0.16, "square", 0.04, 90);
    this.burst(240, 0.12, 0.05);
  }

  splash() {
    this.burst(500 + Math.random() * 200, 0.22, 0.12);
    this.tone(180, 0.18, "sine", 0.05, 70);
  }

  whoosh() {
    this.burst(900, 0.28, 0.07);
  }

  storm(heavy: boolean) {
    this.setRain(heavy ? 0.55 : 0.38);
    this.burst(heavy ? 180 : 260, heavy ? 0.7 : 0.4, heavy ? 0.22 : 0.12);
    this.tone(70, heavy ? 0.5 : 0.3, "sine", heavy ? 0.12 : 0.06, 40);
    window.setTimeout(() => this.setRain(0.16), heavy ? 1400 : 900);
  }

  quizOk() {
    [523, 659, 784].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.16, "triangle", 0.07), i * 90);
    });
  }

  win() {
    this.setRain(0.02);
    [392, 494, 587, 784, 988].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.24, "triangle", 0.08), i * 120);
    });
  }

  lose() {
    this.setRain(0.42);
    this.tone(140, 0.55, "sawtooth", 0.05, 48);
    this.burst(200, 0.6, 0.12);
  }
}

export const audio = new StormAudio();
