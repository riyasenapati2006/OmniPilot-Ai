/**
 * Security Agent (SecurityAgent)
 * Actively audits prompts, checks safety constraints, and filters command executions.
 */

const SecurityGate = require('../mcp/security-gate');
const DBManager = require('../db');

class SecurityAgent {
  constructor() {
    this.name = 'SecurityAgent';
    this.description = 'Audits all system commands, validates user queries, and mitigates prompt injections or script execution threats.';
  }

  /**
   * Evaluates input prompt safety
   * @param {string} prompt 
   * @returns {{safe: boolean, reason: string | null, sanitized: string}}
   */
  auditPrompt(prompt) {
    const result = SecurityGate.validateInputText(prompt);
    if (!result.safe) {
      this.logSecurityEvent(`Prompt Audit Block: ${result.reason}`, 'High', 'Blocked');
      return result;
    }

    // Secondary command-injection scanner
    const cmdResult = SecurityGate.validateCommand(prompt);
    if (!cmdResult.safe) {
      this.logSecurityEvent(`Command-Injection Pattern Blocked: ${cmdResult.reason}`, 'High', 'Blocked');
      return cmdResult;
    }

    return {
      safe: true,
      reason: null,
      sanitized: prompt
    };
  }

  /**
   * Logs security event inside db.json
   */
  logSecurityEvent(event, severity, status) {
    const db = DBManager.read();
    db.securityLogs.push({
      timestamp: new Date().toISOString(),
      event,
      severity,
      status
    });
    DBManager.write(db);
  }
}

module.exports = new SecurityAgent();
