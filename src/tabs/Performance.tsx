import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Square, ChevronLeft, ChevronRight, Mic, MicOff } from 'lucide-react';
import { db, type Setlist } from '../db';
import { Metronome } from '../utils/metronome';
import { TempoDetector } from '../utils/tempoDetector';

export default function Performance() {
  const setlists = useLiveQuery(() => db.setlists.where('deleted').equals(0).toArray(), [], []);
  const [activeSetlistId] = useState<string | null>(() => localStorage.getItem('selectedSetlistId'));

  if (setlists.length === 0 || !activeSetlistId) {
    return (
      <div className="stack">
        <p className="empty">Create a setlist first to use Performance mode.</p>
      </div>
    );
  }

  const activeSetlist = setlists.find((s) => s.id === activeSetlistId);

  return (
    <div className="stack">
      {activeSetlist && (
        <PerformanceContent setlist={activeSetlist} />
      )}
    </div>
  );
}

function PerformanceContent({ setlist }: { setlist: Setlist }) {
  const items = useLiveQuery(
    () =>
      db.setlistItems
        .filter((item) => item.setlistId === setlist.id && item.deleted === 0)
        .sortBy('position'),
    [],
    [setlist.id]
  );

  const songs = useLiveQuery(() => db.songs.where('deleted').equals(0).toArray(), [], []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [beatsPlayed, setBeatsPlayed] = useState(0);
  const [performanceBeats, setPerformanceBeats] = useState(16);
  const [tempoDetectorActive, setTempoDetectorActive] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [beatCount, setBeatCount] = useState(0);

  const metronomeRef = useRef<Metronome | null>(null);
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
    if (!tempoDetectorActive) return;

    const interval = setInterval(() => {
      if (detectorRef.current) {
        setDetectedBpm(detectorRef.current.getCurrentBPM());
        setBeatCount(detectorRef.current.getBeatCount());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [tempoDetectorActive]);

  if (items.length === 0) {
    return <p className="empty">Add songs to this setlist to get started.</p>;
  }

  if (!items || items.length === 0 || currentIndex >= items.length) {
    return null;
  }

  const currentItem = items[currentIndex] as any;
  const currentSong = songs.find((s) => s.id === currentItem?.songId)!;

  if (!currentSong || !currentItem) return null;

  async function handleMetronomeStart() {
    if (!metronomeRef.current) {
      metronomeRef.current = new Metronome(Math.round(currentSong?.bpm ?? 120));
    } else {
      metronomeRef.current.setBPM(Math.round(currentSong?.bpm ?? 120));
    }

    await metronomeRef.current.start(performanceBeats);
    setIsMetronomePlaying(true);
    setBeatsPlayed(0);

    metronomeRef.current.setBeatCallback((beatNumber) => {
      setBeatsPlayed(beatNumber);
    });

    metronomeRef.current.setCompleteCallback(() => {
      setIsMetronomePlaying(false);
    });
  }

  function handleMetronomeStop() {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }
    setIsMetronomePlaying(false);
    setBeatsPlayed(0);
  }

  async function handleTempoDetectorStart() {
    try {
      if (detectorRef.current) {
        await detectorRef.current.startListening();
        setTempoDetectorActive(true);
        setDetectedBpm(null);
        setBeatCount(0);
      }
    } catch (err) {
      console.error('Failed to start tempo detector:', err);
    }
  }

  function handleTempoDetectorStop() {
    if (detectorRef.current) {
      detectorRef.current.stopListening();
    }
    setTempoDetectorActive(false);
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setBeatsPlayed(0);
    }
  }

  function handleNext() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setBeatsPlayed(0);
    }
  }

  return (
    <>
      {/* Current Song Display */}
      <div className="panel current-song">
        <h2>Current Song</h2>
        <div className="song-display">
          <h1 className="song-title">{currentSong.name}</h1>
          <p className="song-tempo">{Math.round(currentSong.bpm)} BPM</p>
          <p className="song-position">
            Song {currentIndex + 1} of {items.length}
          </p>
          {currentItem.section && (
            <p className="section-info">{currentItem.section}</p>
          )}
        </div>

        <div className="button-group">
          <button
            className="btn btn-secondary"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Metronome Section */}
      <div className="panel metronome-section">
        <h2>Metronome</h2>
        <div className="tempo-display">
          <div className="tempo-value">
            <span className="bpm-number">{Math.round(currentSong.bpm)}</span>
            <span className="bpm-label">BPM</span>
          </div>
        </div>

        {isMetronomePlaying && (
          <div className="beat-info">
            <p>Beat: <strong>{beatsPlayed}</strong> / {performanceBeats}</p>
          </div>
        )}

        <div className="button-group">
          {!isMetronomePlaying ? (
            <button className="btn btn-primary" onClick={handleMetronomeStart}>
              <Play size={20} />
              Start
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleMetronomeStop}>
              <Square size={20} />
              Stop
            </button>
          )}
        </div>

        <label>
          Beats to play
          <input
            type="number"
            min="4"
            max="100"
            step="4"
            value={performanceBeats}
            onChange={(e) => setPerformanceBeats(Math.max(4, parseInt(e.target.value) || 4))}
            disabled={isMetronomePlaying}
          />
        </label>
      </div>

      {/* Tempo Detector Section */}
      <div className="panel tempo-section">
        <h2>Tempo Detection</h2>
        <div className="tempo-display">
          <div className="tempo-value">
            <span className="bpm-number">{detectedBpm ? Math.round(detectedBpm) : '--'}</span>
            <span className="bpm-label">BPM</span>
          </div>

          {tempoDetectorActive && (
            <div className="beat-info">
              <p className="muted">Beats detected: {beatCount}</p>
            </div>
          )}
        </div>

        <div className="button-group">
          {!tempoDetectorActive ? (
            <button
              className="btn btn-primary"
              onClick={handleTempoDetectorStart}
            >
              <Mic size={20} />
              Start
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleTempoDetectorStop}
            >
              <MicOff size={20} />
              Stop
            </button>
          )}
        </div>

        {!tempoDetectorActive && !detectedBpm && (
          <p className="muted">
            Tap to detect the current tempo during your performance.
          </p>
        )}
      </div>
    </>
  );
}
