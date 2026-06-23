/**
 * Task Optimization Agent
 * Automatically prioritizes lists based on Eisenhower Matrix logic.
 */
class TaskOptimizerAgent {
  constructor() {
    this.name = 'TaskOptimizer';
    this.description = 'Organizes and ranks todo items to improve concentration and maximize output.';
  }

  getQuadrantName(quadrant) {
    const quadrants = {
      1: 'Urgent & Important (Do First)',
      2: 'Not Urgent but Important (Schedule)',
      3: 'Urgent but Not Important (Delegate)',
      4: 'Not Urgent & Not Important (Eliminate)'
    };
    return quadrants[quadrant] || 'General';
  }
}

module.exports = new TaskOptimizerAgent();
