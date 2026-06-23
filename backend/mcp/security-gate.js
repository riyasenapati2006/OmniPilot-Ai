/**
 * Security Gate Validator for OmniPilot AI
 * Intercepts, inspects, and validates agent intents, commands, and inputs.
 */

const COMMAND_BLACKLIST = [
  /rm\s+-/i,              // Block recursive delete (rm -rf)
  />\s*\/dev/i,            // Block redirect to null/devices
  /chmod/i,                // Block permission modifications
  /chown/i,                // Block owner modifications
  /sudo/i,                 // Block root elevation
  /passwd/i,               // Block password file inspection
  /wget/i,                 // Block unverified download tools
  /curl/i,                 // Block unverified download tools
  /ssh/i,                  // Block unauthorized external connections
  /telnet/i,               // Block unauthorized external connections
  /format/i,               // Block format commands
  /mkfs/i,                 // Block file system creation
  /dd/i,                   // Block raw copy commands
  /systemctl/i,            // Block system service control
  /shutdown/i,             // Block shutdown commands
  /reboot/i,               // Block reboot commands
  /kill\s+-9/i,            // Block force kill
  /\bdel\b.*\b\/s/i,       // Windows delete recursive
  /\bformat\b\s+[a-z]:/i,  // Windows drive format
  /\brd\b.*\b\/s/i         // Windows folder delete recursive
];

const PATH_TRAVERSAL = /(\.\.[\/\\])/; // Block traversal

class SecurityGate {
  /**
   * Validates a CLI command string for execution
   * @param {string} command 
   * @returns {{safe: boolean, reason: string | null, sanitized: string}}
   */
  static validateCommand(command) {
    if (!command || typeof command !== 'string') {
      return { safe: false, reason: 'Invalid command format', sanitized: '' };
    }

    const trimmed = command.trim();

    // Check path traversal
    if (PATH_TRAVERSAL.test(trimmed)) {
      return {
        safe: false,
        reason: 'Path traversal attempt detected (..)',
        sanitized: trimmed.replace(/\.\.[\/\\]/g, '')
      };
    }

    // Check blacklist regexes
    for (const pattern of COMMAND_BLACKLIST) {
      if (pattern.test(trimmed)) {
        return {
          safe: false,
          reason: `Malicious command pattern detected: ${pattern.toString()}`,
          sanitized: '[REDACTED_SECURE]'
        };
      }
    }

    // Check multiple command executions (semi-colon, double ampersand, pipe in unexpected contexts)
    // For our agent skills, commands should be single-purpose, e.g., 'todo-cli list'
    const commandSeparators = /[;&|]/;
    if (commandSeparators.test(trimmed)) {
      return {
        safe: false,
        reason: 'Multiple chained command executors (; & |) are restricted for security',
        sanitized: trimmed.split(commandSeparators)[0].trim()
      };
    }

    return {
      safe: true,
      reason: null,
      sanitized: trimmed
    };
  }

  /**
   * Validates text input content (e.g. todo items, notes, study text) for SQLi, XSS, or Command Injection
   * @param {string} text 
   * @returns {{safe: boolean, reason: string | null, sanitized: string}}
   */
  static validateInputText(text) {
    if (!text || typeof text !== 'string') {
      return { safe: true, reason: null, sanitized: '' };
    }

    let safe = true;
    let reason = null;
    let sanitized = text;

    // Check for XSS/HTML Injection
    if (/<script/i.test(text) || /javascript:/i.test(text) || /onload=/i.test(text) || /onerror=/i.test(text)) {
      safe = false;
      reason = 'Potential HTML/XSS script injection detected';
      sanitized = text.replace(/<[^>]*>/g, '[SANITIZED]');
    }

    // Check for SQL-like injection sequences (simple heuristic for local validation)
    if (/union\s+select/i.test(text) || /or\s+1\s*=\s*1/i.test(text) || /['"];\s*drop\s+table/i.test(text)) {
      safe = false;
      reason = 'Potential SQL injection pattern detected';
      sanitized = text.replace(/['"`;]/g, '');
    }

    return {
      safe,
      reason,
      sanitized
    };
  }

  /**
   * Audits an entire task object before it is scheduled or stored
   * @param {object} task 
   * @returns {{safe: boolean, warnings: string[], auditedTask: object}}
   */
  static auditTask(task) {
    const warnings = [];
    let safe = true;
    const auditedTask = { ...task };

    if (task.title) {
      const auditTitle = this.validateInputText(task.title);
      if (!auditTitle.safe) {
        safe = false;
        warnings.push(`Title check: ${auditTitle.reason}`);
        auditedTask.title = auditTitle.sanitized;
      }
    }

    if (task.description) {
      const auditDesc = this.validateInputText(task.description);
      if (!auditDesc.safe) {
        safe = false;
        warnings.push(`Description check: ${auditDesc.reason}`);
        auditedTask.description = auditDesc.sanitized;
      }
    }

    if (task.command) {
      const auditCmd = this.validateCommand(task.command);
      if (!auditCmd.safe) {
        safe = false;
        warnings.push(`Command check: ${auditCmd.reason}`);
        auditedTask.command = auditCmd.sanitized;
      }
    }

    return {
      safe,
      warnings,
      auditedTask
    };
  }
}

module.exports = SecurityGate;
