/**
 * Detects tempo from audio input using beat detection algorithm
 */

interface BeatTimings {
  times: number[];
  bpms: number[];
}

export class TempoDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isListening = false;
  private beatTimings: BeatTimings = { times: [], bpms: [] };
  private lastBeatTime = 0;
  private beatThreshold = 0.1; // seconds
  private highPassFilter: BiquadFilterNode;
  private lowPassFilter: BiquadFilterNode;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    // Create frequency filters for drum detection (40 Hz - 15 kHz for kick/snare/hi-hat)
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 40; // Cut below 40 Hz (remove rumble, keep kick drum)
    this.highPassFilter.Q.value = 0.7;

    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 15000; // Cut above 15 kHz (focus on snare/hi-hat)
    this.lowPassFilter.Q.value = 0.7;

    // Chain filters: microphone -> highpass -> lowpass -> analyser
    this.highPassFilter.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.analyser);
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.highPassFilter);
      this.isListening = true;
      this.beatTimings = { times: [], bpms: [] };
      this.lastBeatTime = Date.now();
      this.detectBeats();
    } catch (error) {
      console.error('Failed to access microphone:', error);
      throw error;
    }
  }

  stopListening(): void {
    this.isListening = false;
    if (this.microphone) {
      this.microphone.disconnect();
      const tracks = this.microphone.mediaStream.getTracks();
      tracks.forEach(track => track.stop());
      this.microphone = null;
    }
  }

  private detectBeats(): void {
    if (!this.isListening) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const peak = Math.max(...dataArray);
    const energy = peak > average * 2 ? peak : 0;

    const now = Date.now();
    const timeSinceLastBeat = (now - this.lastBeatTime) / 1000;

    // Detect beat if energy spike and minimum time since last beat
    if (energy > 100 && timeSinceLastBeat > this.beatThreshold) {
      this.lastBeatTime = now;
      this.beatTimings.times.push(now);

      // Keep only last 60 beats (about 1 minute at 60 BPM)
      if (this.beatTimings.times.length > 60) {
        this.beatTimings.times.shift();
      }

      // Calculate BPM from recent beats
      this.updateBPM();
    }

    requestAnimationFrame(() => this.detectBeats());
  }

  private updateBPM(): void {
    if (this.beatTimings.times.length < 2) {
      this.beatTimings.bpms = [];
      return;
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimings.times.length; i++) {
      const interval = (this.beatTimings.times[i] - this.beatTimings.times[i - 1]) / 1000;
      if (interval > 0.2 && interval < 3) {
        // Valid beat interval between 0.2s and 3s (20-300 BPM)
        intervals.push(interval);
      }
    }

    if (intervals.length > 0) {
      this.beatTimings.bpms = intervals.map(interval => Math.round((60 / interval) * 10) / 10);
    }
  }

  getCurrentBPM(): number | null {
    if (this.beatTimings.bpms.length === 0) return null;

    // Return median of recent BPM readings for stability
    const sorted = [...this.beatTimings.bpms].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  getBeatCount(): number {
    return this.beatTimings.times.length;
  }

  get isActive(): boolean {
    return this.isListening;
  }
}
