/**
 * OmniPilot AI Backend Express Server
 * Serves frontend static files and handles Multi-Agent and MCP APIs.
 */

const express = require('express');
const path = require('path');
const AgentCoordinator = require('./agents/coordinator');
const MCPServer = require('./mcp/mcp-server');
const DBManager = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database file on startup
DBManager.read();

// API: Process user query through multi-agent coordination
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await AgentCoordinator.processRequest(prompt);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Error processing multi-agent simulation' });
  }
});

// API: Direct JSON-RPC MCP Server endpoint
app.post('/api/mcp', async (req, res) => {
  try {
    const result = await MCPServer.handleRequest(req.body);
    res.json(result);
  } catch (err) {
    console.error('MCP error:', err);
    res.status(500).json({ error: 'Error running MCP server call' });
  }
});

// API: Get current database state
app.get('/api/db', (req, res) => {
  try {
    res.json(DBManager.read());
  } catch (err) {
    res.status(500).json({ error: 'Error reading database state' });
  }
});

// API: Reset database state
app.post('/api/db/reset', (req, res) => {
  try {
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'db.json');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const freshDb = DBManager.read();
    res.json({ message: 'Database reset successful', dbState: freshDb });
  } catch (err) {
    res.status(500).json({ error: 'Error resetting database' });
  }
});

// Serve frontend build static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for React routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  OmniPilot AI Dashboard Running Offline        `);
  console.log(`  Access URL: http://localhost:${PORT}          `);
  console.log(`===============================================`);
});
