import * as Tone from 'tone';

export class Metronome {
  private synth: Tone.PolySynth<Tone.Synth>;
  private isPlaying = false;
  private bpm: number;
  private beatCount = 0;
  private totalBeatsToPlay: number | null = null;
  private onBeatCallback?: (beatNumber: number) => void;
  private onCompleteCallback?: () => void;
  private beatInterval: ReturnType<typeof setTimeout> | null = null;
  private timeSignature: number = 4; // Default 4/4 time signature

  constructor(bpm: number = 120) {
    this.bpm = bpm;

    // Create a simple sine wave synth for the click
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.05
      }
    }).toDestination();
  }

  async start(beatsToPlay?: number): Promise<void> {
    await Tone.start();

    this.isPlaying = true;
    this.beatCount = 0;
    this.totalBeatsToPlay = beatsToPlay ?? null;

    this.playBeat();
  }

  private playBeat(): void {
    if (!this.isPlaying) return;

    // Determine which beat in the bar (1-indexed, starting with beatCount before increment)
    const beatInBar = (this.beatCount % this.timeSignature) + 1;

    // Play a higher note for beat 1, lower note for other beats
    const note = beatInBar === 1 ? 'C5' : 'C4'; // Emphasize first beat with higher pitch
    this.synth.triggerAttackRelease(note, '8n', Tone.now());

    this.beatCount++;
    this.onBeatCallback?.(this.beatCount);

    // Check if we should stop
    if (this.totalBeatsToPlay && this.beatCount >= this.totalBeatsToPlay) {
      this.stop();
      this.onCompleteCallback?.();
      return;
    }

    // Schedule next beat
    const beatDuration = (60 / this.bpm) * 1000; // convert to ms
    this.beatInterval = setTimeout(() => this.playBeat(), beatDuration);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearTimeout(this.beatInterval);
      this.beatInterval = null;
    }
    this.beatCount = 0;
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  setBeatCallback(callback: (beatNumber: number) => void): void {
    this.onBeatCallback = callback;
  }

  setCompleteCallback(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  setTimeSignature(beats: number): void {
    this.timeSignature = beats;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get currentBPM(): number {
    return this.bpm;
  }

  get beatPosition(): number {
    return this.beatCount;
  }

  get barPosition(): number {
    return ((this.beatCount % this.timeSignature) || this.timeSignature);
  }
}
