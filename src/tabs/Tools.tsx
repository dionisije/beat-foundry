import { db } from '../db';

/**
 * A placeholder for another app function. Export is included as an example of
 * a feature that works entirely offline.
 */
export default function Tools() {
  async function exportCsv() {
    const items = await db.items.where('deleted').equals(0).sortBy('name');
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['name,notes', ...items.map((i) => `${escape(i.name)},${escape(i.notes)}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'items.csv' });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Export list</h2>
        <p className="muted">Download your list as a CSV file. This works offline.</p>
        <button className="btn btn-primary" onClick={() => void exportCsv()}>
          Download CSV
        </button>
      </section>
    </div>
  );
}
