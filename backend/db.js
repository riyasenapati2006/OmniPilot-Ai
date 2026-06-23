/**
 * Shared JSON Database Manager for OmniPilot AI
 * Synchronizes state between Express API and agent CLI tools.
 * Includes support for Memory Vault and Focus Streaks.
 * Uses 12-hour AM/PM time format.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const DEFAULT_DB = {
  tasks: [
    { id: 1, title: 'Revise electromagnetism formula sheet', category: 'Study', priority: 'High', status: 'Pending', quadrant: 1 },
    { id: 2, title: 'Buy lab materials for semester project', category: 'Life', priority: 'Medium', status: 'Pending', quadrant: 2 },
    { id: 3, title: 'Draft Physics lab report outline', category: 'Study', priority: 'High', status: 'Pending', quadrant: 1 },
    { id: 4, title: 'Register for final exam slots', category: 'Study', priority: 'High', status: 'Completed', quadrant: 1 }
  ],
  calendar: [
    { id: 1, title: 'Morning Gym Workout', start: '8:00 AM', end: '9:00 AM', type: 'Life', day: 'Monday' },
    { id: 2, title: 'Calculus Lecture', start: '10:00 AM', end: '11:30 AM', type: 'Study', day: 'Monday' },
    { id: 3, title: 'Group Meeting (Physics Project)', start: '2:00 PM', end: '3:30 PM', type: 'Study', day: 'Tuesday' },
    { id: 4, title: 'Dinner with Parents', start: '7:00 PM', end: '8:30 PM', type: 'Life', day: 'Wednesday' },
    { id: 5, title: 'AI Recovery Day', start: '9:00 AM', end: '5:00 PM', type: 'Life', day: 'Saturday' },
    { id: 6, title: 'Weekly Review and Planning', start: '10:00 AM', end: '12:00 PM', type: 'Study', day: 'Sunday' }
  ],
  studyProgress: {
    completedHours: 12,
    targetHours: 40,
    confidenceScores: { Physics: 65, Calculus: 78, Chemistry: 45 },
    activeRecallDeckCount: 24
  },
  memories: [
    { id: 1, key: 'routine', value: 'User prefers daily workouts in the evening at 6:00 PM to unwind.', timestamp: new Date().toISOString() },
    { id: 2, key: 'study_preference', value: 'User prefers active recall blocks scheduled before spaced repetitions.', timestamp: new Date().toISOString() }
  ],
  focusStreak: 5,
  securityLogs: [
    { timestamp: new Date().toISOString(), event: 'Security Gate database session started', severity: 'Info', status: 'Safe' }
  ]
};

class DBManager {
  static read() {
    try {
      if (!fs.existsSync(DB_PATH)) {
        this.write(DEFAULT_DB);
        return DEFAULT_DB;
      }
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading local db, reverting to memory default:', err);
      return DEFAULT_DB;
    }
  }

  static write(data) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing local db:', err);
    }
  }
}

module.exports = DBManager;
