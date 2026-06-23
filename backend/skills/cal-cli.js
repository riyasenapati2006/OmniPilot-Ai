/**
 * Agent Skill: CAL-CLI
 * A command-line tool simulation that reads and writes calendar events.
 * Usage:
 *   node cal-cli.js list
 *   node cal-cli.js add "Event title" --start "8:00 AM" --end "9:30 AM" --day Monday [--type Study|Life]
 */

const DBManager = require('../db');

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
OmniPilot CAL-CLI
Usage:
  node cal-cli.js list
  node cal-cli.js add "Event title" --start "h:mm AM/PM" --end "h:mm AM/PM" --day Monday [--type Study|Life]
`);
  process.exit(0);
}

const db = DBManager.read();

switch (command) {
  case 'list': {
    console.log('=== OMNIPILOT CALENDAR ===');
    // Group calendar by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
      const dayEvts = db.calendar.filter(c => c.day.toLowerCase() === day.toLowerCase());
      if (dayEvts.length > 0) {
        console.log(`\n--- ${day.toUpperCase()} ---`);
        // Simple display sort
        dayEvts.forEach(c => {
          console.log(`  ${c.start.padEnd(8)} - ${c.end.padEnd(8)} | ${c.title.padEnd(35)} | [${c.type}]`);
        });
      }
    });
    break;
  }

  case 'add': {
    const title = args[1];
    if (!title) {
      console.error('Error: Event title is required.');
      process.exit(1);
    }

    let start = '9:00 AM';
    let end = '10:00 AM';
    let day = 'Monday';
    let type = 'Life';

    const startIdx = args.indexOf('--start');
    if (startIdx !== -1 && args[startIdx + 1]) start = args[startIdx + 1];

    const endIdx = args.indexOf('--end');
    if (endIdx !== -1 && args[endIdx + 1]) end = args[endIdx + 1];

    const dayIdx = args.indexOf('--day');
    if (dayIdx !== -1 && args[dayIdx + 1]) day = args[dayIdx + 1];

    const typeIdx = args.indexOf('--type');
    if (typeIdx !== -1 && args[typeIdx + 1]) type = args[typeIdx + 1];

    // Validate 12-hour AM/PM format
    const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(?:AM|PM)$/i;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      console.error('Error: Start and End times must use 12-hour format (e.g. "8:00 AM", "6:30 PM")');
      process.exit(1);
    }

    // Helper to check minutes offset
    const timeToMinutes = (timeStr) => {
      const match = timeStr.trim().match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      else if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // Simple conflict check
    const conflict = db.calendar.find(evt => {
      if (evt.day.toLowerCase() !== day.toLowerCase()) return false;
      const evtStart = timeToMinutes(evt.start);
      const evtEnd = timeToMinutes(evt.end);
      return (startMin >= evtStart && startMin < evtEnd) || 
             (endMin > evtStart && endMin <= evtEnd) ||
             (startMin <= evtStart && endMin >= evtEnd);
    });

    if (conflict) {
      console.warn(`[CONFLICT WARNING] Event conflicts with existing event: "${conflict.title}" at ${conflict.start}-${conflict.end}`);
    }

    const newEvent = {
      id: db.calendar.length ? Math.max(...db.calendar.map(c => c.id)) + 1 : 1,
      title,
      start,
      end,
      type,
      day
    };

    db.calendar.push(newEvent);
    DBManager.write(db);

    console.log(`✔ Event successfully scheduled!`);
    console.log(`${newEvent.day} at ${newEvent.start} - ${newEvent.end} | "${newEvent.title}"`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
