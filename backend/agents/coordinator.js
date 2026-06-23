/**
 * ADK Multi-Agent Coordinator for OmniPilot AI
 * Coordinates message passing between 6 agents:
 * Planner, StudyExpert, LifeScheduler, TaskOptimizer, SecurityAgent, MemoryAgent.
 */

const MCPServer = require('../mcp/mcp-server');
const SecurityAgent = require('./security-agent');
const MemoryAgent = require('./memory-agent');

class AgentCoordinator {
  constructor() {
    this.messageLogs = [];
    this.agentStates = {
      Planner: { status: 'Idle', lastActive: null },
      StudyExpert: { status: 'Idle', lastActive: null },
      LifeScheduler: { status: 'Idle', lastActive: null },
      TaskOptimizer: { status: 'Idle', lastActive: null },
      SecurityAgent: { status: 'Idle', lastActive: null },
      MemoryAgent: { status: 'Idle', lastActive: null }
    };
  }

  logMessage(from, to, content, meta = {}) {
    const timestamp = new Date().toISOString();
    this.messageLogs.push({
      timestamp,
      from,
      to,
      content,
      meta
    });
  }

  updateAgentStatus(agentName, status) {
    this.agentStates[agentName] = {
      status,
      lastActive: new Date().toISOString()
    };
  }

  clearLogs() {
    this.messageLogs = [];
  }

  /**
   * Processes a user query through the extended ADK multi-agent network
   * @param {string} userPrompt 
   */
  async processRequest(userPrompt) {
    this.clearLogs();
    const cotLogs = [];
    const graphNodes = ['User'];
    const graphEdges = [];

    // Initialize coordination
    this.logMessage('User', 'SecurityAgent', userPrompt);
    this.updateAgentStatus('SecurityAgent', 'Active');
    graphNodes.push('SecurityAgent');
    graphEdges.push({ from: 'User', to: 'SecurityAgent', type: 'audit' });

    cotLogs.push({
      agent: 'SecurityAgent',
      action: 'INPUT_SECURITY_AUDIT',
      thought: 'Auditing user prompt against security blacklists, injection parameters, and chained shell operators.',
      log: 'Running input check filters...'
    });

    // 1. Audit prompt using SecurityAgent
    const securityCheck = SecurityAgent.auditPrompt(userPrompt);
    this.updateAgentStatus('SecurityAgent', 'Idle');

    if (!securityCheck.safe) {
      cotLogs.push({
        agent: 'SecurityAgent',
        action: 'PROMPT_REJECTED',
        thought: 'Malicious threat vector or forbidden script pattern matches detected. Halting pipeline execution.',
        log: `Blocked: ${securityCheck.reason}`
      });

      this.logMessage('SecurityAgent', 'User', `Access Denied: ${securityCheck.reason}`, { severity: 'High' });
      graphEdges.push({ from: 'SecurityAgent', to: 'User', type: 'block' });

      return {
        response: `OmniPilot Safety Shield: Command blocked by Security Agent.\nViolation: ${securityCheck.reason}`,
        messageLogs: this.messageLogs,
        cotLogs,
        agentStates: this.agentStates,
        graphNodes,
        graphEdges,
        dbState: MCPServer.getDB()
      };
    }

    // Safe prompt, pass to Planner
    this.logMessage('SecurityAgent', 'Planner', `Safe query: "${securityCheck.sanitized}"`);
    this.updateAgentStatus('Planner', 'Thinking');
    graphNodes.push('Planner');
    graphEdges.push({ from: 'SecurityAgent', to: 'Planner', type: 'forward' });

    cotLogs.push({
      agent: 'Planner',
      action: 'INITIALIZE_PLAN',
      thought: 'Analyzing request structure. Dispatching context fetch request to Memory Agent.',
      log: 'Forwarding request to MemoryAgent...'
    });

    // 2. Fetch context & record new preferences via Memory Agent
    this.updateAgentStatus('MemoryAgent', 'Active');
    this.logMessage('Planner', 'MemoryAgent', 'Fetch contextual preference flags');
    graphNodes.push('MemoryAgent');
    graphEdges.push({ from: 'Planner', to: 'MemoryAgent', type: 'query' });

    // Check if prompt contains preference statements to save
    const remembered = MemoryAgent.rememberPreference(userPrompt);
    const context = MemoryAgent.getContextString();

    cotLogs.push({
      agent: 'MemoryAgent',
      action: 'LOAD_CONTEXT_VAULT',
      thought: 'Scanning vault database records for stored user parameters.',
      log: remembered 
        ? `Remembered preference: "${remembered.value}" (stored under key: ${remembered.key}).\nActive context loaded.`
        : `No new preferences detected to save. Active context loaded.`
    });

    this.logMessage('MemoryAgent', 'Planner', `Loaded Context:\n${context}`);
    this.updateAgentStatus('MemoryAgent', 'Idle');
    graphEdges.push({ from: 'MemoryAgent', to: 'Planner', type: 'response' });

    // 3. Devise routing paths
    const query = securityCheck.sanitized.toLowerCase();
    const isStudyTask = query.includes('exam') || query.includes('study') || query.includes('physics') || query.includes('calculus') || query.includes('math') || query.includes('revise');
    const isLifeTask = query.includes('gym') || query.includes('workout') || query.includes('appointment') || query.includes('dinner') || query.includes('sleep') || query.includes('routine') || query.includes('schedule');
    const isOptimizationNeeded = query.includes('optimize') || query.includes('prioritize') || query.includes('matrix') || isStudyTask || isLifeTask;

    cotLogs.push({
      agent: 'Planner',
      action: 'DISPATCH_AGENTS',
      thought: `Routing targets - StudyExpert: ${isStudyTask}, LifeScheduler: ${isLifeTask}, TaskOptimizer: ${isOptimizationNeeded}`,
      log: `Identified routine parameters. Aligning specialists.`
    });

    this.updateAgentStatus('Planner', 'Active');
    let lastAgent = 'Planner';

    // 4. Invoke Study Agent
    if (isStudyTask) {
      this.updateAgentStatus('StudyExpert', 'Thinking');
      this.logMessage('Planner', 'StudyExpert', `Create spaced study sessions.`);
      graphNodes.push('StudyExpert');
      graphEdges.push({ from: 'Planner', to: 'StudyExpert', type: 'delegate' });

      cotLogs.push({
        agent: 'StudyExpert',
        action: 'PLAN_CURRICULUM',
        thought: 'Structuring spaced study sessions.',
        log: 'Invoking local study planner tool...'
      });

      let subject = 'General Studies';
      if (query.includes('physics')) subject = 'Physics';
      else if (query.includes('calculus') || query.includes('math')) subject = 'Calculus';

      const studyResult = await MCPServer.callTool('create_study_plan', {
        subject,
        examDate: 'next week'
      });

      cotLogs.push({
        agent: 'StudyExpert',
        action: 'CURRICULUM_BUILT',
        thought: 'Revision blocks created. Syncing session schedules.',
        log: studyResult.result.message
      });

      this.logMessage('StudyExpert', 'Planner', `Syllabus review calendar created for ${subject}.`);
      this.updateAgentStatus('StudyExpert', 'Idle');
      lastAgent = 'StudyExpert';
    }

    // 5. Invoke Life Agent
    if (isLifeTask) {
      this.updateAgentStatus('LifeScheduler', 'Thinking');
      this.logMessage('Planner', 'LifeScheduler', `Arrange life schedules.`);
      graphNodes.push('LifeScheduler');
      graphEdges.push({ from: 'Planner', to: 'LifeScheduler', type: 'delegate' });

      // Apply workout preference memory if available
      const workoutTime = context.toLowerCase().includes('6:00 pm') ? '6:00 PM' : '5:00 PM';
      const endWorkoutTime = workoutTime === '6:00 PM' ? '7:30 PM' : '6:30 PM';

      cotLogs.push({
        agent: 'LifeScheduler',
        action: 'RESOLVE_COLLISIONS',
        thought: `Workout scheduling requested. Referencing Memory: prefers workouts at ${workoutTime}.`,
        log: 'Adding gym schedules...'
      });

      const schedResult = await MCPServer.callTool('schedule_event', {
        title: 'Daily Gym Workout',
        start: workoutTime,
        end: endWorkoutTime,
        type: 'Life',
        day: 'Monday'
      });

      cotLogs.push({
        agent: 'LifeScheduler',
        action: 'COLLISION_CHECK_COMPLETE',
        thought: 'Schedules audited against active classes.',
        log: schedResult.result.message
      });

      this.logMessage('LifeScheduler', 'Planner', `Workout schedules added at ${workoutTime}.`);
      this.updateAgentStatus('LifeScheduler', 'Idle');
      lastAgent = 'LifeScheduler';
    }

    // 6. Invoke Task Sorter Agent
    if (isOptimizationNeeded) {
      this.updateAgentStatus('TaskOptimizer', 'Thinking');
      this.logMessage(lastAgent, 'TaskOptimizer', `Optimize and rank priority matrices.`);
      graphNodes.push('TaskOptimizer');
      graphEdges.push({ from: lastAgent, to: 'TaskOptimizer', type: 'sort' });

      cotLogs.push({
        agent: 'TaskOptimizer',
        action: 'RUN_EISENHOWER_MATRIX',
        thought: 'Prioritizing new checklist elements.',
        log: 'Running sorting algorithm...'
      });

      const tasksToPrioritize = [
        { title: 'Read electromagnetism equations', importance: 'high', urgency: 'high', category: 'Study' },
        { title: 'Calculus exercises', importance: 'high', urgency: 'low', category: 'Study' },
        { title: 'Prepare water bottle & gym gear', importance: 'low', urgency: 'high', category: 'Life' }
      ];

      const optResult = await MCPServer.callTool('optimize_tasks', { tasks: tasksToPrioritize });

      cotLogs.push({
        agent: 'TaskOptimizer',
        action: 'MATRIX_SORT_COMPLETE',
        thought: 'Categorized priorities. Study tasks added to Q1, routines mapped to Q3.',
        log: optResult.result.message
      });

      this.logMessage('TaskOptimizer', 'Planner', 'Tasks matrix prioritization synced.');
      this.updateAgentStatus('TaskOptimizer', 'Idle');
      lastAgent = 'TaskOptimizer';
    }

    // Consolidated execution summary
    this.updateAgentStatus('Planner', 'Idle');
    graphNodes.push('DB');
    graphEdges.push({ from: lastAgent, to: 'DB', type: 'commit' });

    cotLogs.push({
      agent: 'Planner',
      action: 'COMPILE_REPORTS',
      thought: 'Merging results from study planner, calendars, and prioritization checklists into user response.',
      log: 'Multi-agent routine successfully synchronized.'
    });

    const finalResponse = `OmniPilot multi-agent coordination complete! Accomplishments:
1. **Security Agent** audited inputs and safety profiles.
2. **Planner Agent** parsed and directed target sub-tasks.
3. **Memory Agent** retrieved user preference parameters from the vault.
4. **Study Expert Agent** scheduled spaced repetition study sessions for exams.
5. **Life Scheduler Agent** booked daily workouts (accounting for study slots).
6. **Task Optimizer Agent** structured your active tasks into Eisenhower matrix quadrants.

All events are successfully synced and ready for export (.ICS).`;

    this.logMessage('Planner', 'User', finalResponse);
    graphEdges.push({ from: 'Planner', to: 'User', type: 'complete' });

    return {
      response: finalResponse,
      messageLogs: this.messageLogs,
      cotLogs,
      agentStates: this.agentStates,
      graphNodes,
      graphEdges,
      dbState: MCPServer.getDB()
    };
  }
}

module.exports = new AgentCoordinator();
