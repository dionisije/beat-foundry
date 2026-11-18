import { useEffect, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Plus, ChevronDown } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import {
  db,
  createSetlist,
  addSetlistItem,
  deleteSetlistItem,
  updateSetlistItem,
  type Setlist as SetlistType,
  type SetlistItem,
  type Song
} from '../db';

const SECTIONS = ['Set 1', 'Set 2', 'Set 3', 'Encore'];
const DEFAULT_SETLIST_NAME = 'My Setlist';

export default function Setlist() {
  const setlists = useLiveQuery(() => db.setlists.where('deleted').equals(0).toArray(), [], []);
  const songs = useLiveQuery(() => db.songs.where('deleted').equals(0).sortBy('name'), [], []);
  const [setlistId, setSetlistId] = useState<string | null>(null);

  // Auto-create default setlist on mount
  useEffect(() => {
    async function ensureSetlist() {
      if (setlists.length === 0) {
        const id = await createSetlist({ name: DEFAULT_SETLIST_NAME });
        setSetlistId(id);
      } else if (!setlistId) {
        setSetlistId(setlists[0].id);
      }
    }
    void ensureSetlist();
  }, [setlists, setlistId]);

  const activeSetlist = setlists.find((s) => s.id === setlistId);

  if (!activeSetlist) {
    return (
      <div className="stack">
        <p className="empty">Loading setlist...</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <SetlistContent setlist={activeSetlist} songs={songs} />
    </div>
  );
}

function SetlistContent({ setlist, songs }: { setlist: SetlistType; songs: Song[] }) {
  const items = useLiveQuery(
    () =>
      db.setlistItems
        .filter((item) => item.setlistId === setlist.id && item.deleted === 0)
        .sortBy('position'),
    [],
    [setlist.id]
  );

  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  async function handleAddSong(e: FormEvent) {
    e.preventDefault();
    if (!selectedSongId) return;

    const maxPosition = items.length > 0 ? Math.max(...items.map((i: any) => i.position ?? 0)) + 1 : 0;
    await addSetlistItem({
      setlistId: setlist.id,
      songId: selectedSongId,
      position: maxPosition,
      section: selectedSection || undefined
    });

    setSelectedSongId('');
    setSelectedSection('');
  }

  return (
    <>
      <form className="panel add-form" onSubmit={handleAddSong}>
        <label>
          Add Song
          <Select.Root value={selectedSongId} onValueChange={setSelectedSongId}>
            <Select.Trigger className="select-trigger" aria-label="Select a song">
              <Select.Value placeholder="Select a song..." />
              <Select.Icon className="select-icon">
                <ChevronDown size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.ScrollUpButton className="select-scroll-btn" />
                <Select.Viewport className="select-viewport">
                  {songs.map((song) => (
                    <Select.Item
                      key={song.id}
                      value={song.id}
                      className="select-item"
                    >
                      <Select.ItemText>
                        {song.name} ({Math.round(song.bpm)} BPM)
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton className="select-scroll-btn" />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </label>

        <label>
          Section (Optional)
          <Select.Root value={selectedSection} onValueChange={setSelectedSection}>
            <Select.Trigger className="select-trigger" aria-label="Select a section">
              <Select.Value placeholder="No section" />
              <Select.Icon className="select-icon">
                <ChevronDown size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.ScrollUpButton className="select-scroll-btn" />
                <Select.Viewport className="select-viewport">
                  <Select.Item value="" className="select-item">
                    <Select.ItemText>No section</Select.ItemText>
                  </Select.Item>
                  {SECTIONS.map((section) => (
                    <Select.Item
                      key={section}
                      value={section}
                      className="select-item"
                    >
                      <Select.ItemText>{section}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton className="select-scroll-btn" />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </label>

        <button className="btn btn-primary" type="submit" disabled={!selectedSongId}>
          <Plus size={18} />
          Add to Setlist
        </button>
      </form>

      {items.length === 0 ? (
        <p className="empty">Add songs from your repertoire to create your setlist.</p>
      ) : (
        <div className="panel setlist-items">
          <h3>Setlist Items ({items.length})</h3>
          <ul className="setlist-list">
            {items.map((item: any, index: number) => (
              <SetlistItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                song={songs.find((s) => s.id === item.songId)}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function SetlistItemRow({
  item,
  index,
  total,
  song
}: {
  item: SetlistItem;
  index: number;
  total: number;
  song?: Song;
}) {
  const [sectionEdit, setSectionEdit] = useState<string | null>(null);

  async function handleMove(direction: 'up' | 'down') {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === total - 1)) {
      return;
    }

    const newPosition = direction === 'up' ? item.position - 1 : item.position + 1;
    await updateSetlistItem(item.id, { position: newPosition });
  }

  async function handleSectionChange(section: string) {
    await updateSetlistItem(item.id, { section: section || undefined });
    setSectionEdit(null);
  }

  if (!song) return null;

  return (
    <li className="setlist-item">
      <div className="item-content">
        {item.section && (
          <span className="section-badge">{item.section}</span>
        )}
        <div className="item-info">
          <span className="item-number">{index + 1}.</span>
          <span className="song-name">{song.name}</span>
          <span className="song-bpm">{Math.round(song.bpm)} BPM</span>
        </div>
      </div>

      <div className="row-actions">
        <button
          className="icon-btn"
          onClick={() => handleMove('up')}
          disabled={index === 0}
          title="Move up"
        >
          ↑
        </button>
        <button
          className="icon-btn"
          onClick={() => handleMove('down')}
          disabled={index === total - 1}
          title="Move down"
        >
          ↓
        </button>

        {sectionEdit === item.id ? (
          <Select.Root value={item.section ?? ''} onValueChange={(value) => void handleSectionChange(value)}>
            <Select.Trigger className="select-trigger select-trigger-small" autoFocus aria-label="Select section">
              <Select.Value placeholder="No section" />
              <Select.Icon className="select-icon">
                <ChevronDown size={14} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.ScrollUpButton className="select-scroll-btn" />
                <Select.Viewport className="select-viewport">
                  <Select.Item value="" className="select-item">
                    <Select.ItemText>No section</Select.ItemText>
                  </Select.Item>
                  {SECTIONS.map((section) => (
                    <Select.Item
                      key={section}
                      value={section}
                      className="select-item"
                    >
                      <Select.ItemText>{section}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton className="select-scroll-btn" />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        ) : (
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setSectionEdit(item.id)}
          >
            {item.section ?? 'Add section'}
          </button>
        )}

        <button
          className="icon-btn"
          onClick={() => void deleteSetlistItem(item.id)}
          title={`Remove ${song.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}
