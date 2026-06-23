/**
 * Agent Skill: TODO-CLI
 * A command-line tool simulation that reads and writes tasks.
 * Usage:
 *   node todo-cli.js list
 *   node todo-cli.js add "Task title" --priority High --category Study
 *   node todo-cli.js complete <id>
 */

const path = require('path');
const DBManager = require('../db');

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
OmniPilot TODO-CLI
Usage:
  node todo-cli.js list
  node todo-cli.js add "Task title" [--priority High|Medium|Low] [--category Study|Life]
  node todo-cli.js complete <id>
`);
  process.exit(0);
}

const db = DBManager.read();

switch (command) {
  case 'list': {
    console.log('=== OMNIPILOT TODO LIST ===');
    db.tasks.forEach(t => {
      const mark = t.status === 'Completed' ? '✔' : ' ';
      console.log(`[${mark}] ID: ${t.id} | ${t.title.padEnd(45)} | ${t.priority.padEnd(6)} | Q${t.quadrant}`);
    });
    break;
  }

  case 'add': {
    const title = args[1];
    if (!title) {
      console.error('Error: Task title is required.');
      process.exit(1);
    }

    // Simple option parsing
    let priority = 'Medium';
    let category = 'Life';
    
    const prioIdx = args.indexOf('--priority');
    if (prioIdx !== -1 && args[prioIdx + 1]) {
      priority = args[prioIdx + 1];
    }

    const catIdx = args.indexOf('--category');
    if (catIdx !== -1 && args[catIdx + 1]) {
      category = args[catIdx + 1];
    }

    // Determine Quadrant
    let quadrant = 3; // Default Urgent but Not Important
    if (priority.toLowerCase() === 'high') {
      quadrant = category.toLowerCase() === 'study' ? 1 : 2;
    }

    const newTask = {
      id: db.tasks.length ? Math.max(...db.tasks.map(t => t.id)) + 1 : 1,
      title,
      category,
      priority,
      status: 'Pending',
      quadrant
    };

    db.tasks.push(newTask);
    DBManager.write(db);

    console.log(`✔ Task successfully added!`);
    console.log(`ID: ${newTask.id} | "${newTask.title}" | Quadrant: ${quadrant}`);
    break;
  }

  case 'complete': {
    const id = parseInt(args[1], 10);
    if (isNaN(id)) {
      console.error('Error: Valid task ID is required.');
      process.exit(1);
    }

    const task = db.tasks.find(t => t.id === id);
    if (!task) {
      console.error(`Error: Task ID ${id} not found.`);
      process.exit(1);
    }

    task.status = 'Completed';
    DBManager.write(db);
    console.log(`✔ Task ID ${id} ("${task.title}") marked as Completed.`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
