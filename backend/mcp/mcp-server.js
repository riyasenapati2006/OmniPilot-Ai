/**
 * MCP Server Simulator for OmniPilot AI
 * Follows JSON-RPC 2.0 standards for tool listing and calling.
 * Persists data using DBManager.
 * Employs 12-hour AM/PM time configurations and 7-day scheduling matrices.
 */

const SecurityGate = require('./security-gate');
const DBManager = require('../db');

// Convert "8:30 AM" or "6:00 PM" to minutes-from-midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

// Available MCP Tools
const MCP_TOOLS = [
  {
    name: 'optimize_tasks',
    description: 'Takes raw task inputs and organizes them into the Eisenhower Matrix quadrants.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              importance: { type: 'string', enum: ['high', 'low'] },
              urgency: { type: 'string', enum: ['high', 'low'] }
            },
            required: ['title', 'importance', 'urgency']
          }
        }
      },
      required: ['tasks']
    }
  },
  {
    name: 'schedule_event',
    description: 'Adds a scheduled event to the calendar and runs a conflict check using 12-hour time formats.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start: { type: 'string', description: 'h:mm AM/PM format' },
        end: { type: 'string', description: 'h:mm AM/PM format' },
        type: { type: 'string', enum: ['Study', 'Life'] },
        day: { type: 'string' }
      },
      required: ['title', 'start', 'end', 'type', 'day']
    }
  },
  {
    name: 'create_study_plan',
    description: 'Generates a balanced weekly study plan spanning Mon-Sun, enforcing Sunday planning and Saturday recovery slots.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        examDate: { type: 'string' }
      },
      required: ['subject', 'examDate']
    }
  },
  {
    name: 'execute_skill_command',
    description: 'Runs a simulated agent CLI tool command (e.g. todo-cli, cal-cli). Crucial security validation path.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' }
      },
      required: ['command']
    }
  }
];

class MCPServer {
  static getDB() {
    return DBManager.read();
  }

  /**
   * Handles JSON-RPC requests conforming to the MCP specification
   */
  static async handleRequest(rpcBody) {
    const { jsonrpc, method, params, id } = rpcBody;

    if (jsonrpc !== '2.0') {
      return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }, id: id || null };
    }

    try {
      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            result: { tools: MCP_TOOLS },
            id
          };

        case 'tools/call':
          if (!params || !params.name) {
            return {
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Invalid params: name is required' },
              id
            };
          }
          return await this.callTool(params.name, params.arguments || {}, id);

        default:
          return {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id
          };
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        error: { code: -32000, message: err.message || 'Internal server error' },
        id
      };
    }
  }

  /**
   * Calls a tool by name with arguments
   */
  static async callTool(toolName, args, rpcId) {
    const timestamp = new Date().toISOString();
    const db = DBManager.read();

    db.securityLogs.push({
      timestamp,
      event: `Tool call requested: ${toolName}`,
      severity: 'Info',
      status: 'Auditing'
    });

    switch (toolName) {
      case 'optimize_tasks': {
        const rawTasks = args.tasks || [];
        const optimized = rawTasks.map((t, index) => {
          const audit = SecurityGate.validateInputText(t.title);
          if (!audit.safe) {
            db.securityLogs.push({
              timestamp: new Date().toISOString(),
              event: `Security block on task Title: "${t.title}". Reason: ${audit.reason}`,
              severity: 'High',
              status: 'Sanitized'
            });
            t.title = audit.sanitized;
          }

          let quadrant = 4;
          if (t.importance === 'high' && t.urgency === 'high') quadrant = 1;
          else if (t.importance === 'high' && t.urgency === 'low') quadrant = 2;
          else if (t.importance === 'low' && t.urgency === 'high') quadrant = 3;

          const newTask = {
            id: db.tasks.length + index + 1,
            title: t.title,
            category: t.category || 'Study',
            priority: t.importance === 'high' ? 'High' : 'Medium',
            status: 'Pending',
            quadrant
          };

          db.tasks.push(newTask);
          return newTask;
        });

        db.securityLogs.push({
          timestamp: new Date().toISOString(),
          event: `Task optimization completed. Classified ${optimized.length} tasks.`,
          severity: 'Info',
          status: 'Success'
        });

        DBManager.write(db);

        return {
          jsonrpc: '2.0',
          result: {
            status: 'success',
            message: `Successfully optimized ${optimized.length} tasks into Eisenhower quadrants`,
            optimizedTasks: optimized
          },
          id: rpcId
        };
      }

      case 'schedule_event': {
        const auditTitle = SecurityGate.validateInputText(args.title);
        const title = auditTitle.safe ? args.title : auditTitle.sanitized;
        if (!auditTitle.safe) {
          db.securityLogs.push({
            timestamp: new Date().toISOString(),
            event: `Security warning: Sanitized scheduled event title.`,
            severity: 'Medium',
            status: 'Sanitized'
          });
        }

        // Validate AM/PM format
        const timeRegex = /^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(?:AM|PM)$/i;
        if (!timeRegex.test(args.start) || !timeRegex.test(args.end)) {
          return {
            jsonrpc: '2.0',
            error: { code: -32602, message: 'Start and End times must use 12-hour format (e.g. 8:00 AM, 6:30 PM)' },
            id: rpcId
          };
        }

        // Conflict check using minute offsets
        const startMin = timeToMinutes(args.start);
        const endMin = timeToMinutes(args.end);

        const conflict = db.calendar.find(evt => {
          if (evt.day.toLowerCase() !== args.day.toLowerCase()) return false;
          const evtStart = timeToMinutes(evt.start);
          const evtEnd = timeToMinutes(evt.end);
          return (startMin >= evtStart && startMin < evtEnd) || 
                 (endMin > evtStart && endMin <= evtEnd) ||
                 (startMin <= evtStart && endMin >= evtEnd);
        });

        if (conflict) {
          db.securityLogs.push({
            timestamp: new Date().toISOString(),
            event: `Schedule conflict detected: "${title}" conflicts with "${conflict.title}" at ${conflict.start}-${conflict.end} on ${conflict.day}`,
            severity: 'Low',
            status: 'Resolved (Flagged)'
          });
          DBManager.write(db);
          return {
            jsonrpc: '2.0',
            result: {
              status: 'conflict',
              conflictWith: conflict.title,
              message: `Warning: Event conflicts with "${conflict.title}" at ${conflict.start}-${conflict.end} on ${conflict.day}.`
            },
            id: rpcId
          };
        }

        const newEvent = {
          id: db.calendar.length + 1,
          title,
          start: args.start,
          end: args.end,
          type: args.type,
          day: args.day
        };

        db.calendar.push(newEvent);
        
        db.securityLogs.push({
          timestamp: new Date().toISOString(),
          event: `Scheduled event: "${title}"`,
          severity: 'Info',
          status: 'Success'
        });

        DBManager.write(db);

        return {
          jsonrpc: '2.0',
          result: {
            status: 'success',
            event: newEvent,
            message: `Scheduled "${title}" on ${args.day} at ${args.start}-${args.end}`
          },
          id: rpcId
        };
      }

      case 'create_study_plan': {
        const { subject, examDate } = args;
        const auditSubject = SecurityGate.validateInputText(subject);
        const cleanSubject = auditSubject.safe ? subject : auditSubject.sanitized;

        // Balanced weekly layout: Monday to Sunday
        // Enforce scheduling rules:
        // Mon, Tue, Thu: study sessions (max 3 per day, standard workout times)
        // Wed, Fri: revision / spaced repetitions
        // Sat: AI Recovery Day
        // Sun: Weekly Review and Planning
        const weeklyEvents = [
          { title: `Active Recall: Core theories of ${cleanSubject}`, start: '4:00 PM', end: '5:30 PM', type: 'Study', day: 'Monday' },
          { title: `Exercise: Light cardio workout`, start: '6:00 PM', end: '7:30 PM', type: 'Life', day: 'Monday' },
          
          { title: `Spaced Repetition: Topic revision on ${cleanSubject}`, start: '3:00 PM', end: '4:30 PM', type: 'Study', day: 'Tuesday' },
          
          { title: `Revision: Chemistry & ${cleanSubject} concepts`, start: '4:00 PM', end: '5:30 PM', type: 'Study', day: 'Wednesday' },
          
          { title: `Mock Test: Mock paper 1 for ${cleanSubject}`, start: '2:00 PM', end: '4:00 PM', type: 'Study', day: 'Thursday' },
          
          { title: `Buffer Time: Weak-topic catchup`, start: '3:00 PM', end: '4:30 PM', type: 'Study', day: 'Friday' },
          
          { title: 'AI Recovery Day', start: '9:00 AM', end: '5:00 PM', type: 'Life', day: 'Saturday' },
          
          { title: 'Weekly Review and Planning', start: '10:00 AM', end: '12:00 PM', type: 'Study', day: 'Sunday' }
        ];

        // Filter out old study-plan schedules before writing to prevent duplicate slots
        db.calendar = db.calendar.filter(evt => !evt.title.includes(cleanSubject) && !evt.title.includes('Weekly Review') && !evt.title.includes('AI Recovery'));

        weeklyEvents.forEach((evt, idx) => {
          db.calendar.push({
            id: db.calendar.length + 1,
            title: evt.title,
            start: evt.start,
            end: evt.end,
            type: evt.type,
            day: evt.day
          });
        });

        // Add corresponding prioritized tasks
        db.tasks.push({
          id: db.tasks.length + 1,
          title: `Weekly Review and Planning (Prepare upcoming syllabus)`,
          category: 'Study',
          priority: 'High',
          status: 'Pending',
          quadrant: 2
        });

        db.tasks.push({
          id: db.tasks.length + 1,
          title: `Active recall sessions for ${cleanSubject}`,
          category: 'Study',
          priority: 'High',
          status: 'Pending',
          quadrant: 1
        });

        db.studyProgress.targetHours += 10;
        db.studyProgress.confidenceScores[cleanSubject] = 55;

        db.securityLogs.push({
          timestamp: new Date().toISOString(),
          event: `7-Day Study and planning matrix created for ${cleanSubject} leading to ${examDate}.`,
          severity: 'Info',
          status: 'Success'
        });

        DBManager.write(db);

        return {
          jsonrpc: '2.0',
          result: {
            status: 'success',
            subject: cleanSubject,
            sessionsScheduled: weeklyEvents,
            message: `Generated balanced 7-day study plan (Mon-Sun) with Saturday AI Recovery and Sunday Weekly Review & Planning.`
          },
          id: rpcId
        };
      }

      case 'execute_skill_command': {
        const { command } = args;
        const audit = SecurityGate.validateCommand(command);
        
        if (!audit.safe) {
          db.securityLogs.push({
            timestamp: new Date().toISOString(),
            event: `Security Gate BLOCKED command: "${command}". Reason: ${audit.reason}`,
            severity: 'High',
            status: 'Blocked'
          });
          DBManager.write(db);

          return {
            jsonrpc: '2.0',
            result: {
              status: 'blocked',
              safe: false,
              reason: audit.reason,
              output: `Access Denied: Command execution blocked by Security Agent.\nViolation: ${audit.reason}`
            },
            id: rpcId
          };
        }

        let terminalOutput = '';
        if (command.startsWith('todo-cli list')) {
          terminalOutput = `=== TODO-CLI LISTING ===\n` + 
            db.tasks.map(t => `[${t.status === 'Completed' ? 'X' : ' '}] ID:${t.id} | ${t.title} (${t.priority})`).join('\n');
        } else if (command.startsWith('todo-cli add')) {
          const titleMatch = command.match(/add\s+['"]([^'"]+)['"]/);
          const title = titleMatch ? titleMatch[1] : 'CLI Task';
          const newTask = {
            id: db.tasks.length + 1,
            title,
            category: 'Life',
            priority: 'Medium',
            status: 'Pending',
            quadrant: 3
          };
          db.tasks.push(newTask);
          terminalOutput = `Added new task via TODO-CLI:\nID: ${newTask.id} | Title: "${newTask.title}"`;
        } else if (command.startsWith('cal-cli list')) {
          terminalOutput = `=== CAL-CLI SCHEDULE ===\n` +
            db.calendar.map(c => `- ${c.day} ${c.start}-${c.end}: ${c.title} (${c.type})`).join('\n');
        } else {
          terminalOutput = `Executed CLI command: "${command}"\nStatus: Success (Simulated Safe Execution)\nNo system changes modified outside sandbox.`;
        }

        db.securityLogs.push({
          timestamp: new Date().toISOString(),
          event: `CLI Command executed safely: "${command}"`,
          severity: 'Low',
          status: 'Allowed'
        });

        DBManager.write(db);

        return {
          jsonrpc: '2.0',
          result: {
            status: 'success',
            safe: true,
            reason: null,
            output: terminalOutput
          },
          id: rpcId
        };
      }

      default:
        DBManager.write(db);
        return {
          jsonrpc: '2.0',
          error: { code: -32601, message: `Tool not found: ${toolName}` },
          id: rpcId
        };
    }
  }
}

module.exports = MCPServer;

