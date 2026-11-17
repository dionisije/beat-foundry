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

    // Play a click sound
    this.synth.triggerAttackRelease('8n', Tone.now());

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

  get playing(): boolean {
    return this.isPlaying;
  }

  get currentBPM(): number {
    return this.bpm;
  }

  get beatPosition(): number {
    return this.beatCount;
  }
}
