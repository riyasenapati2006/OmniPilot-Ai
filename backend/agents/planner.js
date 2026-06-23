/**
 * Planner Agent
 * Parses user requirements and orchestrates work across specialist agents.
 */
class PlannerAgent {
  constructor() {
    this.name = 'Planner';
    this.description = 'Deconstructs user queries and maps objectives to specialized cognitive units.';
  }

  getRules() {
    return [
      { id: 'parse_intent', description: 'Analyze input for educational, calendar, and task-based markers.' },
      { id: 'delegate_tasks', description: 'Route sub-goals to Exam/Study, Life Scheduler, and Task Optimization systems.' }
    ];
  }
}

module.exports = new PlannerAgent();
