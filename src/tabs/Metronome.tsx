import { useEffect, useRef, useState } from 'react';
import { Play, Square, Plus, Minus } from 'lucide-react';
import { Metronome } from '../utils/metronome';

export default function MetronomeTab() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPlayed, setBeatsPlayed] = useState(0);
  const [performanceBeats, setPerformanceBeats] = useState(16);
  const [showPerformanceMode, setShowPerformanceMode] = useState(false);
  const metronomeRef = useRef<Metronome | null>(null);

  useEffect(() => {
    metronomeRef.current = new Metronome(bpm);

    return () => {
      if (metronomeRef.current?.playing) {
        metronomeRef.current.stop();
      }
    };
  }, [bpm]);

  async function handleStart() {
    if (metronomeRef.current) {
      const beatsToPlay = showPerformanceMode ? performanceBeats : undefined;
      await metronomeRef.current.start(beatsToPlay);
      setIsPlaying(true);
      setBeatsPlayed(0);

      metronomeRef.current.setBeatCallback((beatNumber) => {
        setBeatsPlayed(beatNumber);
      });

      if (showPerformanceMode) {
        metronomeRef.current.setCompleteCallback(() => {
          setIsPlaying(false);
        });
      }
    }
  }

  function handleStop() {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }
    setIsPlaying(false);
    setBeatsPlayed(0);
  }

  function handleBpmChange(change: number) {
    const newBpm = Math.max(40, Math.min(300, bpm + change));
    setBpm(newBpm);
    if (metronomeRef.current && !isPlaying) {
      metronomeRef.current.setBPM(newBpm);
    }
  }

  function handlePerformanceBeatChange(change: number) {
    const newBeats = Math.max(4, Math.min(100, performanceBeats + change));
    setPerformanceBeats(newBeats);
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="tempo-control">
          {/* Left buttons */}
          <div className="tempo-buttons-left">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => handleBpmChange(-5)}
              disabled={isPlaying}
              title="Decrease BPM by 5"
            >
              <Minus size={16} />
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => handleBpmChange(-1)}
              disabled={isPlaying}
              title="Decrease BPM by 1"
            >
              -1
            </button>
          </div>

          {/* Center display */}
          <div className="tempo-display">
            <div className="tempo-value">
              <span className="bpm-number">{bpm}</span>
              <span className="bpm-label">BPM</span>
            </div>
          </div>

          {/* Right buttons */}
          <div className="tempo-buttons-right">
            <button
              className="btn btn-secondary btn-small"
              onClick={() => handleBpmChange(1)}
              disabled={isPlaying}
              title="Increase BPM by 1"
            >
              +1
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => handleBpmChange(5)}
              disabled={isPlaying}
              title="Increase BPM by 5"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="button-group">
          {!isPlaying ? (
            <button className="btn btn-primary" onClick={handleStart}>
              <Play size={20} />
              Start
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStop}>
              <Square size={20} />
              Stop
            </button>
          )}
        </div>

        {isPlaying && (
          <div className="beat-info">
            <p>Beat: <strong>{beatsPlayed}</strong></p>
          </div>
        )}
      </div>

      {/* Performance Mode Section */}
      <div className="panel">
        <h3>Performance Mode</h3>
        <p className="muted">
          Stop the metronome after a set number of beats (useful for practice sessions).
        </p>

        <label>
          Beats to play
          <input
            type="number"
            min="4"
            max="100"
            step="4"
            value={performanceBeats}
            onChange={(e) => setPerformanceBeats(Math.max(4, parseInt(e.target.value) || 4))}
            disabled={isPlaying}
          />
        </label>

        <div className="button-group">
          <button
            className="btn btn-secondary"
            onClick={() => handlePerformanceBeatChange(-4)}
            disabled={isPlaying}
          >
            <Minus size={20} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handlePerformanceBeatChange(4)}
            disabled={isPlaying}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="button-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showPerformanceMode}
              onChange={(e) => setShowPerformanceMode(e.target.checked)}
              disabled={isPlaying}
            />
            Use Performance Mode
          </label>
        </div>
      </div>

      <div className="panel">
        <h3>Time Signature: 4/4</h3>
        <p className="muted">
          The metronome plays in 4/4 time (four beats per measure).
        </p>
      </div>
    </div>
  );
}
