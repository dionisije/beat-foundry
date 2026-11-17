import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { TempoDetector } from '../utils/tempoDetector';

export default function Tempo() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [beatCount, setBeatCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<TempoDetector | null>(null);

  useEffect(() => {
    detectorRef.current = new TempoDetector();

    return () => {
      if (detectorRef.current?.isActive) {
        detectorRef.current.stopListening();
      }
    };
  }, []);

  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(() => {
      if (detectorRef.current) {
        const currentBpm = detectorRef.current.getCurrentBPM();
        setBpm(currentBpm);
        setBeatCount(detectorRef.current.getBeatCount());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  async function handleStartListening() {
    try {
      setError(null);
      if (detectorRef.current) {
        await detectorRef.current.startListening();
        setIsListening(true);
        setBpm(null);
        setBeatCount(0);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access microphone'
      );
      setIsListening(false);
    }
  }

  function handleStopListening() {
    if (detectorRef.current) {
      detectorRef.current.stopListening();
    }
    setIsListening(false);
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="tempo-display">
          <div className="tempo-value">
            {isListening ? (
              <>
                <span className="bpm-number">{bpm ? Math.round(bpm) : '--'}</span>
                <span className="bpm-label">BPM</span>
              </>
            ) : (
              <>
                <span className="bpm-number">--</span>
                <span className="bpm-label">BPM</span>
              </>
            )}
          </div>

          {isListening && (
            <div className="beat-info">
              <p className="muted">Beats detected: {beatCount}</p>
            </div>
          )}
        </div>

        <div className="button-group">
          {!isListening ? (
            <button
              className="btn btn-primary"
              onClick={handleStartListening}
            >
              <Mic size={20} />
              Start Listening
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleStopListening}
            >
              <MicOff size={20} />
              Stop Listening
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {!isListening && !error && (
          <p className="muted">
            Tap the microphone button to start detecting tempo. Clap or play beats into your device's microphone.
          </p>
        )}

        {isListening && (
          <p className="muted">
            Listening for beats... Keep the rhythm steady for accurate detection.
          </p>
        )}
      </div>
    </div>
  );
}
