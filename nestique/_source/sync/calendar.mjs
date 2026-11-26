// Pulls each stay's booking calendar (iCal links kept in the NESTIQUE_ICAL secret)
// and writes the booked date ranges to calendar.json for the website.
// Secret format, one stay per line:  <slug> <ical url>
import fs from 'node:fs';
const out = process.argv[2] || 'nestique/calendar.json';
const lines = (process.env.NESTIQUE_ICAL || '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { stays: {} };
const stays = { ...prev.stays };
const today = new Date().toISOString().slice(0, 10);
const day = (v) => v.replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3');
for (const line of lines) {
  const [slug, ...rest] = line.split(/\s+/); const url = rest.join('');
  const ranges = [];
  for (const u of url.split(',')) {               // several calendars per stay allowed
    const res = await fetch(u, { headers: { 'user-agent': 'nestique-calendar' } });
    if (!res.ok) { console.error(`${slug}: HTTP ${res.status}, keeping last data`); ranges.length = 0; ranges.push(null); break; }
    const ics = (await res.text()).replace(/\r?\n[ \t]/g, '');
    for (const ev of ics.split('BEGIN:VEVENT').slice(1)) {
      const s = ev.match(/DTSTART[^:]*:(\d{8})/)?.[1], e = ev.match(/DTEND[^:]*:(\d{8})/)?.[1];
      if (s && e && day(e) > today) ranges.push([day(s), day(e)]);
    }
  }
  if (ranges[0] === null) continue;
  stays[slug] = ranges.sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`${slug}: ${stays[slug].length} booked ranges`);
}
const changed = JSON.stringify(stays) !== JSON.stringify(prev.stays);
if (changed || !prev.updated) fs.writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), stays }, null, 1) + '\n');
console.log(changed ? 'calendar changed' : 'no change');
