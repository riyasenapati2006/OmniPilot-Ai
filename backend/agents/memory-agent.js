/**
 * Memory Agent (MemoryAgent)
 * Manages reading, writing, and scanning user preferences from the Memory Vault.
 */

const DBManager = require('../db');

class MemoryAgent {
  constructor() {
    this.name = 'MemoryAgent';
    this.description = 'Manages long-term user preferences, past settings, and retrieves context from the Memory Vault.';
  }

  /**
   * Retrieves all memories as a single contextual string for the Planner
   */
  getContextString() {
    const db = DBManager.read();
    if (!db.memories || db.memories.length === 0) {
      return 'No active memories in vault.';
    }
    return db.memories.map(m => `- [${m.key}]: ${m.value}`).join('\n');
  }

  /**
   * Scans user prompt for new preferences to store in the vault
   * @param {string} prompt 
   * @returns {object | null} Returns the newly added memory or null
   */
  rememberPreference(prompt) {
    if (!prompt) return null;
    const db = DBManager.read();
    
    // Look for phrases like "remember that...", "I prefer...", "My favorite..."
    let key = '';
    let value = '';

    const prefMatch = prompt.match(/(?:remember that|i prefer|my preference is for)\s+([^.]+)/i);
    if (prefMatch) {
      value = prefMatch[1].trim();
      // Generate a simple key
      if (value.toLowerCase().includes('workout') || value.toLowerCase().includes('gym')) {
        key = 'workout_pref';
      } else if (value.toLowerCase().includes('study') || value.toLowerCase().includes('recall')) {
        key = 'study_pref';
      } else {
        key = `preference_${Date.now().toString().slice(-4)}`;
      }

      // Check if key already exists, update or add
      const existing = db.memories.find(m => m.key === key);
      if (existing) {
        existing.value = value;
        existing.timestamp = new Date().toISOString();
      } else {
        db.memories.push({
          id: db.memories.length ? Math.max(...db.memories.map(m => m.id)) + 1 : 1,
          key,
          value,
          timestamp: new Date().toISOString()
        });
      }

      DBManager.write(db);
      return { key, value };
    }

    return null;
  }
}

module.exports = new MemoryAgent();
