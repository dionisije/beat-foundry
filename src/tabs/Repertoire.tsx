import { useMemo, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2, ChevronDown } from 'lucide-react';
import { db, createSong, deleteSong, updateSong, type Song } from '../db';

export default function Repertoire() {
  const songs = useLiveQuery(() => db.songs.where('deleted').equals(0).sortBy('name'), [], []);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [bpm, setBpm] = useState('120');
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'bpm'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAddForm, setShowAddForm] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = songs;

    if (q) {
      filtered = songs.filter((s) => s.name.toLowerCase().includes(q));
    }

    // Sort
    let sorted = [...filtered];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => a.bpm - b.bpm);
    }

    if (sortOrder === 'desc') {
      sorted.reverse();
    }

    return sorted;
  }, [songs, query, sortBy, sortOrder]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bpm) return;

    try {
      await createSong({ name, bpm: parseFloat(bpm) });
      setName('');
      setBpm('120');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <button
          className="collapsible-header"
          onClick={() => setShowAddForm(!showAddForm)}
          aria-expanded={showAddForm}
        >
          <span>Add Song</span>
          <ChevronDown
            size={18}
            style={{
              transform: showAddForm ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </button>

        {showAddForm && (
          <form className="add-form" onSubmit={handleAdd}>
            <label>
              Song Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Wonderwall"
                required
              />
            </label>
            <label>
              BPM
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                min="40"
                max="300"
                step="0.1"
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!name.trim() || !bpm}>
              Add Song
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </div>

      <div className="panel">
        <div className="filter-controls">
          <input
            className="search"
            type="search"
            placeholder={`Search ${songs.length} songs`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search songs"
          />
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="empty">Add your first song above to build your repertoire.</p>
      ) : visible.length === 0 ? (
        <p className="empty">No songs match "{query}".</p>
      ) : (
        <div className="table-container">
          <table className="songs-table">
            <thead>
              <tr>
                <th
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortOrder('asc');
                    }
                  }}
                  className="sortable-header"
                  title="Click to sort by song name"
                >
                  Song Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'bpm') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('bpm');
                      setSortOrder('asc');
                    }
                  }}
                  className="sortable-header"
                  title="Click to sort by BPM"
                >
                  BPM {sortBy === 'bpm' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((song) => (
                <SongRow key={song.id} song={song} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SongRow({ song }: { song: Song }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(song.name);
  const [bpm, setBpm] = useState(song.bpm.toString());

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !bpm) return;
    await updateSong(song.id, { name: name.trim(), bpm: parseFloat(bpm) });
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="editing">
        <td>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Song name"
            autoFocus
            required
          />
        </td>
        <td>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            min="40"
            max="300"
            step="0.1"
            aria-label="BPM"
            required
          />
        </td>
        <td>
          <div className="row-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                void save(e as any);
              }}
            >
              Save
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setName(song.name);
                setBpm(song.bpm.toString());
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="song-name">{song.name}</td>
      <td className="song-bpm">{Math.round(song.bpm)}</td>
      <td>
        <div className="row-actions">
          <button
            className="icon-btn"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${song.name}`}
          >
            <Pencil size={18} />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              if (confirm(`Delete "${song.name}"?`)) {
                void deleteSong(song.id);
              }
            }}
            aria-label={`Delete ${song.name}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
