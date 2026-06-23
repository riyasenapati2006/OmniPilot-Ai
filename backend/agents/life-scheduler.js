/**
 * Life Scheduler Agent
 * Coordinates personal life routines (workouts, dinners, wellness checks) to maintain focus and energy.
 */
class LifeSchedulerAgent {
  constructor() {
    this.name = 'LifeScheduler';
    this.description = 'Manages daily routines, checks calendar collisions, and schedules breaks to maintain physical/mental wellness.';
  }

  getRoutineConstraints() {
    return {
      sleep: { start: '10:30 PM', end: '6:30 AM' },
      workout: { duration: 90, preferredWindow: '6:00 PM - 8:00 PM' },
      meals: { breakfast: '8:00 AM', lunch: '1:00 PM', dinner: '8:00 PM' }
    };
  }
}

module.exports = new LifeSchedulerAgent();
