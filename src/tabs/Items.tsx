import { useMemo, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Trash2 } from 'lucide-react';
import { MAX_ITEMS, createItem, db, deleteItem, updateItem, type Item } from '../db';

export default function Items() {
  const items = useLiveQuery(() => db.items.where('deleted').equals(0).sortBy('name'), [], []);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 500 rows filters instantly in memory; no virtualisation needed.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.notes.toLowerCase().includes(q));
  }, [items, query]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createItem({ name, notes });
      setName('');
      setNotes('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const full = items.length >= MAX_ITEMS;

  return (
    <div className="stack">
      <form className="panel add-form" onSubmit={handleAdd}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={full} required />
        </label>
        <label>
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={full} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={full || !name.trim()}>
          Add item
        </button>
        {error && <p className="error">{error}</p>}
        {full && !error && <p className="muted">The list is full. Remove an item to add a new one.</p>}
      </form>

      <input
        className="search"
        type="search"
        placeholder={`Search ${items.length} items`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search items"
      />

      {items.length === 0 ? (
        <p className="empty">Add your first item above. It's saved on this device straight away.</p>
      ) : visible.length === 0 ? (
        <p className="empty">No items match “{query}”.</p>
      ) : (
        <ul className="item-list">
          {visible.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [notes, setNotes] = useState(item.notes);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateItem(item.id, { name: name.trim(), notes: notes.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="item editing">
        <form onSubmit={save} className="edit-form">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" autoFocus required />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          <div className="row-actions">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setName(item.name);
                setNotes(item.notes);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="item">
      <div className="item-text">
        <span className="item-name">
          {item.name}
          {item.pendingSync === 1 && <span className="pending" title="Not synced yet" aria-label="Not synced yet" />}
        </span>
        {item.notes && <span className="item-notes">{item.notes}</span>}
      </div>
      <div className="row-actions">
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit ${item.name}`}>
          <Pencil size={18} />
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            if (confirm(`Delete “${item.name}”?`)) void deleteItem(item.id);
          }}
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}
