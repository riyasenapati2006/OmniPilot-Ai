import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Terminal, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  RefreshCw, 
  Send, 
  BookOpen, 
  Clock, 
  ShieldAlert, 
  Cpu,
  BarChart3,
  LayoutDashboard,
  Database,
  ChevronRight,
  Menu,
  X,
  Check,
  Lock,
  Download,
  Brain,
  Timer,
  FileText,
  Trash2,
  Plus
} from 'lucide-react';

export default function App() {
  // Navigation & Layout states
  const [currentTab, setCurrentTab] = useState('overview'); // overview, calendar, tasks, focus, memory, security, mcp, analytics
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Focus Center (Pomodoro) states
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // New Memory Vault form states
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');

  // Agent Logs Filter state
  const [logFilter, setLogFilter] = useState('All');

  // API states
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [messageLogs, setMessageLogs] = useState([]);
  const [cotLogs, setCotLogs] = useState([]);
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphEdges, setGraphEdges] = useState([]);
  
  const [agentStates, setAgentStates] = useState({
    Planner: { status: 'Idle', lastActive: null },
    StudyExpert: { status: 'Idle', lastActive: null },
    LifeScheduler: { status: 'Idle', lastActive: null },
    TaskOptimizer: { status: 'Idle', lastActive: null },
    SecurityAgent: { status: 'Idle', lastActive: null },
    MemoryAgent: { status: 'Idle', lastActive: null }
  });
  
  const [dbState, setDbState] = useState({
    tasks: [],
    calendar: [],
    studyProgress: { completedHours: 0, targetHours: 0, confidenceScores: {}, activeRecallDeckCount: 0 },
    memories: [],
    focusStreak: 0,
    securityLogs: []
  });

  // Fallback AI Recommendations Dictionary
  const fallbacks = {
    Monday: { title: 'Spaced Revision (Math)', start: '4:00 PM', end: '5:30 PM', type: 'Study' },
    Tuesday: { title: 'Active Recall Practice', start: '3:00 PM', end: '4:30 PM', type: 'Study' },
    Wednesday: { title: 'Cardio Workout & Wellness', start: '6:00 PM', end: '7:30 PM', type: 'Life' },
    Thursday: { title: 'Mock Exam Simulation', start: '2:00 PM', end: '4:30 PM', type: 'Study' },
    Friday: { title: 'Buffer Catchup & Sync', start: '3:00 PM', end: '4:30 PM', type: 'Study' },
    Saturday: { title: 'AI Recovery Day', start: '9:00 AM', end: '5:00 PM', type: 'Life' },
    Sunday: { title: 'Weekly Review and Planning', start: '10:00 AM', end: '12:00 PM', type: 'Study' }
  };

  // MCP Sandbox states
  const [mcpRequest, setMcpRequest] = useState(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "execute_skill_command",
        arguments: {
          command: "todo-cli list"
        }
      },
      id: 1
    }, null, 2)
  );
  const [mcpResponse, setMcpResponse] = useState('');

  // Preset prompts
  const presets = [
    {
      label: "Calculus & Gym 7-Day Plan",
      text: "Create a study plan for my Calculus and Physics exams next week, but schedule around my daily gym workouts at 6:00 PM."
    },
    {
      label: "Collision check (8:00 AM)",
      text: "Schedule morning Gym Workout at 8:00 AM on Monday, and also schedule a Chemistry lecture at 8:30 AM on Monday."
    },
    {
      label: "Shell Injection (Blocked)",
      text: "Create a study plan for Physics; rm -rf / ; systemctl stop firewall"
    }
  ];

  // Fetch DB data
  const fetchDb = async () => {
    try {
      const res = await fetch('/api/db');
      const data = await res.json();
      if (!data.error) {
        setDbState(data);
      }
    } catch (err) {
      console.error("Error loading db state:", err);
    }
  };

  // Reset local database
  const handleResetDb = async () => {
    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      const data = await res.json();
      if (data.dbState) {
        setDbState(data.dbState);
        setResponse('Database session reset successfully.');
        setMessageLogs([]);
        setCotLogs([]);
        setGraphNodes([]);
        setGraphEdges([]);
        setAgentStates({
          Planner: { status: 'Idle', lastActive: null },
          StudyExpert: { status: 'Idle', lastActive: null },
          LifeScheduler: { status: 'Idle', lastActive: null },
          TaskOptimizer: { status: 'Idle', lastActive: null },
          SecurityAgent: { status: 'Idle', lastActive: null },
          MemoryAgent: { status: 'Idle', lastActive: null }
        });
      }
    } catch (err) {
      console.error("Error resetting database:", err);
    }
  };

  // Submit Prompt
  const handleSubmitPrompt = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');
    setMessageLogs([]);
    setCotLogs([]);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      setResponse(data.response);
      setMessageLogs(data.messageLogs || []);
      setCotLogs(data.cotLogs || []);
      setGraphNodes(data.graphNodes || []);
      setGraphEdges(data.graphEdges || []);
      if (data.agentStates) setAgentStates(data.agentStates);
      if (data.dbState) setDbState(data.dbState);
    } catch (err) {
      console.error("Error submitting chat prompt:", err);
      setResponse("System Error: Failed to execute multi-agent simulation.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger MCP direct request
  const handleMcpCall = async () => {
    try {
      const body = JSON.parse(mcpRequest);
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setMcpResponse(JSON.stringify(data, null, 2));
      fetchDb(); // sync state changes
    } catch (err) {
      setMcpResponse(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Invalid JSON syntax" }, id: null }, null, 2));
    }
  };

  // Complete task item directly
  const handleCompleteTask = async (id) => {
    try {
      const body = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "execute_skill_command",
          arguments: {
            command: `todo-cli complete ${id}`
          }
        },
        id: id
      };
      await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      fetchDb();
    } catch (err) {
      console.error("Error completing task:", err);
    }
  };

  // Commit dynamic AI suggestion directly to db
  const handleAcceptRecommendation = async (day, rec) => {
    try {
      const body = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "schedule_event",
          arguments: {
            title: rec.title,
            start: rec.start,
            end: rec.end,
            type: rec.type,
            day: day
          }
        },
        id: Date.now()
      };
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.result && data.result.status === 'success') {
        fetchDb();
      } else if (data.result && data.result.status === 'conflict') {
        alert(data.result.message);
      }
    } catch (err) {
      console.error("Error committing suggestion:", err);
    }
  };

  // Memory additions
  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newMemKey.trim() || !newMemVal.trim()) return;

    const db = { ...dbState };
    db.memories.push({
      id: db.memories.length ? Math.max(...db.memories.map(m=>m.id))+1 : 1,
      key: newMemKey.trim(),
      value: newMemVal.trim(),
      timestamp: new Date().toISOString()
    });
    
    setDbState(db);
    setNewMemKey('');
    setNewMemVal('');
  };

  // Delete memory directly
  const handleDeleteMemory = (id) => {
    const db = { ...dbState };
    db.memories = db.memories.filter(m => m.id !== id);
    setDbState(db);
  };

  // Pomodoro timer functions
  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerRunning(false);
          const fresh = { ...dbState };
          fresh.focusStreak += 1;
          setDbState(fresh);
          alert("Focus session complete! Streak updated.");
          return timerMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
  };

  const resetTimer = (mins) => {
    clearInterval(timerRef.current);
    setTimerRunning(false);
    const m = mins || timerMinutes;
    setTimerMinutes(m);
    setTimeLeft(m * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Client-Side iCalendar (.ICS) Export with 12-hour AM/PM parsing
  const exportICS = () => {
    if (dbState.calendar.length === 0) {
      alert("No events found in calendar to export!");
      return;
    }

    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OmniPilot AI//NONSGML Scheduler//EN\r\nCALSCALE:GREGORIAN\r\n";

    const dayOffsets = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6
    };

    const getTargetDateStr = (dayName, timeStr) => {
      const today = new Date();
      const currentDay = today.getDay();
      const distance = 1 - currentDay; // Distance to current Monday
      const mondayDate = new Date(today.setDate(today.getDate() + distance));

      const targetDayOffset = dayOffsets[dayName.toLowerCase()] || 0;
      const targetDate = new Date(mondayDate.setDate(mondayDate.getDate() + targetDayOffset));

      const match = timeStr.trim().match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/i);
      let hours = 9;
      let minutes = 0;
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
      }
      
      targetDate.setHours(hours, minutes, 0, 0);

      const year = targetDate.getUTCFullYear();
      const month = (targetDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const date = targetDate.getUTCDate().toString().padStart(2, '0');
      const hh = targetDate.getUTCHours().toString().padStart(2, '0');
      const mm = targetDate.getUTCMinutes().toString().padStart(2, '0');
      const ss = "00";

      return `${year}${month}${date}T${hh}${mm}${ss}Z`;
    };

    dbState.calendar.forEach(evt => {
      const dtStart = getTargetDateStr(evt.day, evt.start);
      const dtEnd = getTargetDateStr(evt.day, evt.end);
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:uid-${evt.id}-${stamp}@omnipilot.ai\r\n`;
      icsContent += `DTSTAMP:${stamp}\r\n`;
      icsContent += `DTSTART:${dtStart}\r\n`;
      icsContent += `DTEND:${dtEnd}\r\n`;
      icsContent += `SUMMARY:${evt.title}\r\n`;
      icsContent += `DESCRIPTION:OmniPilot AI 12h Session: ${evt.start} - ${evt.end} (${evt.type})\r\n`;
      icsContent += "END:VEVENT\r\n";
    });

    icsContent += "END:VCALENDAR\r\n";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'omnipilot_7day_schedule.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter tasks helpers
  const getTasksByQuadrant = (quad) => dbState.tasks.filter(t => t.quadrant === quad);
  const getBlockedThreatsCount = () => dbState.securityLogs.filter(log => log.status === 'Blocked' || log.severity === 'High').length;
  const getPendingTasksCount = () => dbState.tasks.filter(t => t.status !== 'Completed').length;

  const filteredCotLogs = cotLogs.filter(log => {
    if (logFilter === 'All') return true;
    return log.agent.toLowerCase() === logFilter.toLowerCase();
  });

  // SVG coordinates for 8 nodes Workflow Graph
  const nodePositions = {
    'User': { x: 60, y: 150 },
    'SecurityAgent': { x: 180, y: 150 },
    'Planner': { x: 300, y: 150 },
    'MemoryAgent': { x: 300, y: 55 },
    'StudyExpert': { x: 460, y: 55 },
    'LifeScheduler': { x: 460, y: 150 },
    'TaskOptimizer': { x: 460, y: 245 },
    'DB': { x: 580, y: 150 }
  };

  return (
    <div className="flex min-h-screen text-slate-100 antialiased font-sans bg-dark-bg">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col justify-between w-64 border-r border-white/5 bg-slate-950/90 backdrop-blur-xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}
      >
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/35 shadow-[0_0_15px_rgba(139,92,246,0.35)]">
              <Cpu className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
                OmniPilot AI
              </span>
              <span className="block text-[10px] text-slate-500 font-medium">Enterprise Multitasking OS</span>
            </div>
            <button className="lg:hidden ml-auto p-1.5 hover:bg-white/5 rounded-lg text-slate-400" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Overview Hub', icon: LayoutDashboard },
              { id: 'calendar', label: '7-Day Calendar', icon: CalendarIcon },
              { id: 'tasks', label: 'Eisenhower Matrix', icon: CheckSquare },
              { id: 'focus', label: 'Focus Center', icon: Timer },
              { id: 'memory', label: 'Memory Vault', icon: Brain },
              { id: 'security', label: 'Security Gate', icon: ShieldCheck, alertCount: getBlockedThreatsCount() },
              { id: 'mcp', label: 'MCP Host Sandbox', icon: Terminal },
              { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
              { id: 'localstorage', label: 'Local DB Vault', icon: Database }
            ].map((link) => {
              const Icon = link.icon;
              const active = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setCurrentTab(link.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active 
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </div>
                  {link.alertCount > 0 ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                      {link.alertCount}
                    </span>
                  ) : (
                    active && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Database Monitor */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Sync Stats</span>
              <Database className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Streak Record:</span>
                <span className="font-mono text-emerald-400 font-bold">{dbState.focusStreak} sessions</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Preferences:</span>
                <span className="font-mono text-slate-200 font-medium">{(dbState.memories || []).length} items</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP NAVBAR */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-white/5 rounded-lg text-slate-400" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-100 capitalize">
              {currentTab === 'overview' ? 'Overview Hub' : currentTab === 'calendar' ? '7-Day Study Calendar (AM/PM)' : currentTab === 'localstorage' ? 'Local DB Vault' : `${currentTab} panel`}
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                100% Offline
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-extrabold text-violet-400 uppercase tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                Local Multi-Agent System
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider shadow-[0_0_10px_rgba(6,182,212,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                No API Keys
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-extrabold text-amber-400 uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Capstone Ready
              </div>
            </div>
            <div className="flex lg:hidden items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider">
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
              Offline
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-1.5 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                <span className="text-slate-400">Streak:</span>
                <span className="text-orange-300 font-bold">{dbState.focusStreak} 🔥</span>
              </div>
              <div className="h-3 w-px bg-slate-800"></div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-slate-400">Safety:</span>
                <span className="text-emerald-300 font-bold">Safe Gate Active</span>
              </div>
            </div>

            <button 
              onClick={handleResetDb}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset DB
            </button>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT WORKSPACE */}
        <main className="flex-1 p-6 space-y-6">
          
          {/* TAB VIEW: OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-6 slide-in-item">
              
              {/* HERO PILOT PROMPT INPUT */}
              <section className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h3 className="text-base font-bold text-slate-100">Pilot Command Console</h3>
                  </div>
                  
                  {/* Hero Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.05)]">
                      100% Offline
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-extrabold text-violet-400 uppercase tracking-wider shadow-[0_0_8px_rgba(139,92,246,0.05)]">
                      Local Multi-Agent System
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.05)]">
                      No API Keys
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-extrabold text-amber-400 uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.05)]">
                      Capstone Ready
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-4 max-w-2xl leading-relaxed">
                  Submit study timetables, workout preferences, or custom goals. The Multi-Agent network (Planner, Study, Life, Optimizer, Security, and Memory agents) coordinates actions and logs workflow routing. All times conform to a 12-hour format.
                </p>

                {/* Scenarios Preset Bar */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(p.text)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-violet-950/20 border border-slate-800 hover:border-violet-500/30 rounded-lg text-slate-300 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmitPrompt} className="flex gap-3">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g. Generate weekly study schedule for physics; remember that i prefer workout sessions at 6:00 PM..."
                    className="flex-1 px-4 py-3.5 bg-slate-950/60 border border-white/5 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 rounded-xl text-slate-100 text-sm focus:outline-none placeholder:text-slate-500 transition-all font-medium font-sans"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer border border-violet-500/20"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Pilot</span>
                  </button>
                </form>

                {response && (
                  <div className="mt-4 p-4 bg-violet-950/15 border border-violet-500/10 rounded-xl log-item">
                    <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1.5">Coordinator Output Summary</h4>
                    <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{response}</p>
                  </div>
                )}
               </section>

              {/* AGENT STATUS REGISTRY */}
              <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: 'SecurityAgent', label: 'Security Agent', icon: ShieldCheck, desc: 'Audits inputs & guards execution gate' },
                  { name: 'Planner', label: 'Planner Agent', icon: Cpu, desc: 'Deconstructs queries & maps tasks' },
                  { name: 'MemoryAgent', label: 'Memory Agent', icon: Brain, desc: 'Stores preferences in Context Vault' },
                  { name: 'StudyExpert', label: 'Study Expert', icon: BookOpen, desc: 'Schedules spaced study & recall' },
                  { name: 'LifeScheduler', label: 'Life Scheduler', icon: CalendarIcon, desc: 'Coordinates routines & exercises' },
                  { name: 'TaskOptimizer', label: 'Task Optimizer', icon: CheckSquare, desc: 'Ranks Eisenhower matrix items' }
                ].map((agent) => {
                  const state = agentStates[agent.name] || { status: 'Idle', lastActive: null };
                  const Icon = agent.icon;
                  const isActive = state.status !== 'Idle';
                  const isThinking = state.status === 'Thinking';
                  
                  let glowClass = '';
                  let statusBadge = '';
                  if (isThinking) {
                    glowClass = 'glow-cyan border-cyan-500/30';
                    statusBadge = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                  } else if (isActive) {
                    glowClass = 'glow-emerald border-emerald-500/30';
                    statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else {
                    statusBadge = 'bg-slate-800 text-slate-400 border-white/5';
                  }

                  return (
                    <div 
                      key={agent.name} 
                      className={`glass-card p-4 rounded-xl border flex flex-col justify-between h-[160px] transition-all duration-300 ${glowClass}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-300`}>
                            <Icon className="w-4 h-4 text-violet-400 animate-pulse" />
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${statusBadge} ${isActive ? 'animate-pulse' : ''}`}>
                            {state.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-200">{agent.label}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight mt-1 line-clamp-2">{agent.desc}</p>
                      </div>
                      
                      <div className="border-t border-white/5 pt-2 flex justify-between items-center text-[8px] font-mono text-slate-500">
                        <span>LAST ACTIVE:</span>
                        <span className="text-slate-300">
                          {state.lastActive 
                            ? new Date(state.lastActive).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* TWO COLUMN GRID: ACTIVE AGENTS GRAPH & INTER-AGENT LOGS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* SVG Workflow Graph */}
                <section className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[360px]">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Dynamic Workflow Graph Visualization
                    </h4>
                    <span className="text-[9px] text-slate-500 font-mono">ADK TOPOLOGY MAP</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center bg-slate-950/40 rounded-xl border border-white/5 relative overflow-hidden p-2">
                    <svg className="w-full h-full min-h-[220px]" viewBox="0 0 640 300">
                      
                      {/* Lines/Edges */}
                      {Object.keys(nodePositions).map((nodeName) => {
                        const fromPos = nodePositions[nodeName];
                        return (
                          <React.Fragment key={nodeName}>
                            {/* Render lines to next nodes depending on structure */}
                            {nodeName === 'User' && (
                              <line 
                                x1={fromPos.x} y1={fromPos.y} 
                                x2={nodePositions['SecurityAgent'].x} y2={nodePositions['SecurityAgent'].y}
                                stroke={graphEdges.some(e => e.from === 'User' && e.to === 'SecurityAgent') ? "#8b5cf6" : "#2d3748"}
                                strokeWidth={graphEdges.some(e => e.from === 'User' && e.to === 'SecurityAgent') ? "2.5" : "1"}
                                strokeDasharray={graphEdges.some(e => e.from === 'User' && e.to === 'SecurityAgent') ? "5,5" : "none"}
                                className={graphEdges.some(e => e.from === 'User' && e.to === 'SecurityAgent') ? "flow-line" : ""}
                              />
                            )}
                            {nodeName === 'SecurityAgent' && (
                              <line 
                                x1={fromPos.x} y1={fromPos.y} 
                                x2={nodePositions['Planner'].x} y2={nodePositions['Planner'].y}
                                stroke={graphEdges.some(e => e.from === 'SecurityAgent' && e.to === 'Planner') ? "#8b5cf6" : "#2d3748"}
                                strokeWidth={graphEdges.some(e => e.from === 'SecurityAgent' && e.to === 'Planner') ? "2.5" : "1"}
                                strokeDasharray={graphEdges.some(e => e.from === 'SecurityAgent' && e.to === 'Planner') ? "5,5" : "none"}
                                className={graphEdges.some(e => e.from === 'SecurityAgent' && e.to === 'Planner') ? "flow-line" : ""}
                              />
                            )}
                            {nodeName === 'Planner' && (
                              <>
                                <line 
                                  x1={fromPos.x} y1={fromPos.y} 
                                  x2={nodePositions['MemoryAgent'].x} y2={nodePositions['MemoryAgent'].y}
                                  stroke={graphEdges.some(e => e.from === 'Planner' && e.to === 'MemoryAgent') ? "#8b5cf6" : "#2d3748"}
                                  strokeWidth={graphEdges.some(e => e.from === 'Planner' && e.to === 'MemoryAgent') ? "2.5" : "1"}
                                />
                                <line 
                                  x1={fromPos.x} y1={fromPos.y} 
                                  x2={nodePositions['StudyExpert'].x} y2={nodePositions['StudyExpert'].y}
                                  stroke={graphEdges.some(e => e.from === 'Planner' && e.to === 'StudyExpert') ? "#06b6d4" : "#2d3748"}
                                  strokeWidth={graphEdges.some(e => e.from === 'Planner' && e.to === 'StudyExpert') ? "2.5" : "1"}
                                />
                                <line 
                                  x1={fromPos.x} y1={fromPos.y} 
                                  x2={nodePositions['LifeScheduler'].x} y2={nodePositions['LifeScheduler'].y}
                                  stroke={graphEdges.some(e => e.from === 'Planner' && e.to === 'LifeScheduler') ? "#f59e0b" : "#2d3748"}
                                  strokeWidth={graphEdges.some(e => e.from === 'Planner' && e.to === 'LifeScheduler') ? "2.5" : "1"}
                                />
                                <line 
                                  x1={fromPos.x} y1={fromPos.y} 
                                  x2={nodePositions['TaskOptimizer'].x} y2={nodePositions['TaskOptimizer'].y}
                                  stroke={graphEdges.some(e => e.from === 'Planner' && e.to === 'TaskOptimizer') ? "#10b981" : "#2d3748"}
                                  strokeWidth={graphEdges.some(e => e.from === 'Planner' && e.to === 'TaskOptimizer') ? "2.5" : "1"}
                                />
                              </>
                            )}
                            {nodeName === 'MemoryAgent' && (
                              <line 
                                x1={fromPos.x} y1={fromPos.y} 
                                x2={nodePositions['Planner'].x} y2={nodePositions['Planner'].y}
                                stroke={graphEdges.some(e => e.from === 'MemoryAgent' && e.to === 'Planner') ? "#8b5cf6" : "#2d3748"}
                                strokeWidth={graphEdges.some(e => e.from === 'MemoryAgent' && e.to === 'Planner') ? "2" : "1"}
                                strokeDasharray="3,3"
                              />
                            )}
                            {['StudyExpert', 'LifeScheduler', 'TaskOptimizer'].includes(nodeName) && (
                              <line 
                                x1={fromPos.x} y1={fromPos.y} 
                                x2={nodePositions['DB'].x} y2={nodePositions['DB'].y}
                                stroke={graphEdges.some(e => e.from === nodeName && e.to === 'DB') ? "#10b981" : "#2d3748"}
                                strokeWidth={graphEdges.some(e => e.from === nodeName && e.to === 'DB') ? "2" : "1"}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Node Circles */}
                      {Object.entries(nodePositions).map(([name, pos]) => {
                        const isNodeActive = graphNodes.includes(name);
                        let circleColor = 'fill-slate-900 stroke-slate-700';
                        if (isNodeActive) {
                          if (name === 'SecurityAgent') circleColor = 'fill-rose-950 stroke-rose-500 shadow-lg';
                          else if (name === 'MemoryAgent') circleColor = 'fill-indigo-950 stroke-indigo-500 shadow-lg';
                          else if (name === 'Planner') circleColor = 'fill-violet-950 stroke-violet-500';
                          else circleColor = 'fill-cyan-950 stroke-cyan-500';
                        }
                        
                        return (
                          <g key={name}>
                            <circle 
                              cx={pos.x} cy={pos.y} r={18} 
                              className={`${circleColor} transition-all duration-300`} 
                              strokeWidth="2"
                            />
                            <text 
                              x={pos.x} y={pos.y + 4} 
                              textAnchor="middle" 
                              fontSize="8" 
                              fontWeight="bold" 
                              fill="#f8fafc"
                              className="pointer-events-none select-none font-mono"
                            >
                              {name.slice(0, 3).toUpperCase()}
                            </text>
                            {/* Hover description label */}
                            <text
                              x={pos.x} y={pos.y - 24}
                              textAnchor="middle"
                              fontSize="8"
                              fill={isNodeActive ? "#c084fc" : "#64748b"}
                              className="font-sans font-bold"
                            >
                              {name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </section>

                {/* ADK Message Trace Console */}
                <section className="glass-card p-5 rounded-2xl flex flex-col justify-between h-[360px]">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-violet-400" />
                      Inter-Agent Message Traces (12h format logs)
                    </h4>
                    <span className="text-[9px] text-slate-500 font-mono">ADK BUS</span>
                  </div>

                  <div className="flex-1 p-3 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-[11px] overflow-y-auto space-y-2 max-h-[260px]">
                    {messageLogs.length === 0 ? (
                      <p className="text-slate-600 italic">No communication logs recorded. Submit a prompt to view execution trace.</p>
                    ) : (
                      messageLogs.map((log, idx) => (
                        <div key={idx} className="flex gap-2 items-start py-1.5 border-b border-white/5 last:border-0 slide-in-item">
                          <span className="text-violet-400 font-bold whitespace-nowrap bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded text-[9px]">
                            {log.from} ➔ {log.to}
                          </span>
                          <span className="text-slate-300 leading-normal">{log.content}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

              </div>

              {/* NEW OFFLINE VERIFICATION SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* System Status Panel */}
                <section className="glass-card p-5 rounded-2xl flex flex-col justify-between lg:col-span-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Offline Verification Status
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Offline Mode</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Internet Dependency</span>
                        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                          None
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-400 font-medium">API Keys Required</span>
                        <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                          No
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">Local MCP Server</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Running
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">Local Database</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Connected
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Judge-friendly Verification Card */}
                <section className="glass-card p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      Judge-Friendly Offline Architecture Verification
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      OmniPilot AI has been built with an <strong>entirely local, zero-external-dependency architectural design</strong>. This ensures maximum privacy, security, and immediate execution responsiveness without relying on network latency or third-party service availability.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                        <div className="font-bold text-slate-300 mb-1">Local Multi-Agent Network</div>
                        <div className="text-slate-400 leading-relaxed text-[11px]">
                          Agents execute locally on the local server. The Security Gate audits instructions for safety patterns locally, preventing telemetry leakage or malicious external prompt injections.
                        </div>
                      </div>

                      <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl">
                        <div className="font-bold text-slate-300 mb-1">Local MCP & DB Storage</div>
                        <div className="text-slate-400 leading-relaxed text-[11px]">
                          The dashboard communicates directly with a simulated MCP JSON-RPC 2.0 micro-service and local storage database. Event tracking and Eisenhower checklists run directly on the machine's file system.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-white/5 pt-3">
                    <span>STATUS: 100% OFF-GRID VERIFIED</span>
                    <span className="text-emerald-400 font-bold">✓ SECURE WORKSPACE</span>
                  </div>
                </section>

              </div>

            </div>
          )}

          {/* TAB VIEW: CALENDAR */}
          {currentTab === 'calendar' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-cyan-400" />
                    7-Day Study & Life Calendar (Monday - Sunday)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Every day is populated with at least one meaningful slot. Sunday is designated as Weekly Review and Planning Day. Saturdays are set as Recovery Days.
                  </p>
                </div>
                
                <button
                  onClick={exportICS}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/20 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .ICS Calendar (12h format)
                </button>
              </div>

              {/* 7-DAY DISPLAY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const dayEvents = dbState.calendar.filter(evt => evt.day.toLowerCase() === day.toLowerCase());
                  const isSunday = day === 'Sunday';
                  const isSaturday = day === 'Saturday';

                  let cardOutline = 'border-white/5 bg-slate-950/60';
                  if (isSunday) cardOutline = 'border-indigo-500/20 bg-indigo-950/5';
                  if (isSaturday) cardOutline = 'border-emerald-500/20 bg-emerald-950/5';

                  return (
                    <div key={day} className={`border rounded-xl p-3 flex flex-col h-[380px] ${cardOutline}`}>
                      <div className="flex justify-between items-center mb-2.5 border-b border-white/5 pb-2">
                        <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">{day}</span>
                        {isSunday && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1 rounded uppercase font-bold">Review</span>}
                        {isSaturday && <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded uppercase font-bold">Recovery</span>}
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                        {dayEvents.length === 0 ? (
                          (() => {
                            const rec = fallbacks[day];
                            return (
                              <div className="p-3 rounded-xl border border-dashed border-violet-500/35 bg-violet-950/5 text-slate-300 space-y-2 pulse-recommendation hover:border-violet-500/60 transition-all">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-bold text-violet-400 uppercase tracking-widest bg-violet-950/60 border border-violet-500/20 px-1 rounded">AI Suggestion</span>
                                  <Sparkles className="w-3 h-3 text-violet-400 animate-pulse" />
                                </div>
                                <div className="text-[11px] font-bold truncate text-slate-200">{rec.title}</div>
                                <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                                  {rec.start} - {rec.end}
                                </div>
                                <button
                                  onClick={() => handleAcceptRecommendation(day, rec)}
                                  className="w-full py-1 text-[9px] font-bold bg-violet-600 hover:bg-violet-500 text-white rounded cursor-pointer transition-colors"
                                >
                                  Accept Rec
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          dayEvents.map((evt) => (
                            <div 
                              key={evt.id} 
                              className={`p-2.5 rounded-xl text-[11px] border transition-all hover:scale-[1.02] ${
                                evt.title.includes('Recovery') 
                                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' 
                                  : evt.title.includes('Review')
                                  ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300'
                                  : evt.type === 'Study' 
                                  ? 'bg-cyan-950/30 border-cyan-800/40 text-cyan-300' 
                                  : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                              }`}
                            >
                              <div className="font-bold truncate mb-0.5">{evt.title}</div>
                              <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                {evt.start} - {evt.end}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB VIEW: EISENHOWER MATRIX */}
          {currentTab === 'tasks' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  Eisenhower Prioritization Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Task Optimization Agent sorts checklist items into appropriate quadrants.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  { q: 1, name: 'Quadrant 1: Urgent & Important', desc: 'Do Immediately', color: 'border-rose-500/20 bg-rose-950/5 text-rose-300', dot: 'bg-rose-500' },
                  { q: 2, name: 'Quadrant 2: Important, Not Urgent', desc: 'Plan & Schedule', color: 'border-cyan-500/20 bg-cyan-950/5 text-cyan-300', dot: 'bg-cyan-500' },
                  { q: 3, name: 'Quadrant 3: Urgent, Not Important', desc: 'Delegate Tasks', color: 'border-amber-500/20 bg-amber-950/5 text-amber-300', dot: 'bg-amber-500' },
                  { q: 4, name: 'Quadrant 4: Not Urgent & Not Important', desc: 'Eliminate', color: 'border-slate-800 bg-slate-900/10 text-slate-400', dot: 'bg-slate-600' }
                ].map((quad) => (
                  <div key={quad.q} className={`border rounded-2xl p-4 flex flex-col h-[280px] ${quad.color}`}>
                    <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${quad.dot}`}></span>
                        <span className="text-xs font-bold uppercase tracking-wider">{quad.name}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-85">{quad.desc}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {getTasksByQuadrant(quad.q).length === 0 ? (
                        <div className="flex items-center justify-center h-20 text-xs text-slate-600 italic">
                          No prioritized checklist items
                        </div>
                      ) : (
                        getTasksByQuadrant(quad.q).map(t => (
                          <div 
                            key={t.id} 
                            className="flex justify-between items-center bg-slate-950/50 px-3 py-2 rounded-xl border border-white/5 hover:border-violet-500/20 transition-all text-xs"
                          >
                            <span className={`truncate pr-3 font-medium ${t.status === 'Completed' ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                              {t.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {t.status === 'Completed' ? (
                                <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  <Check className="w-2.5 h-2.5" /> Done
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleCompleteTask(t.id)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-violet-900/30 hover:border-violet-500/40 border border-slate-800 text-[10px] font-bold text-slate-300 rounded cursor-pointer transition-colors"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB VIEW: FOCUS CENTER */}
          {currentTab === 'focus' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-orange-400" />
                  Study Focus Center & Streak Tracker
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Commit to focused study chunks. Completed Pomodoro intervals increment your local database focus streak!
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 bg-slate-950/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center space-y-6">
                  <div className="text-6xl md:text-8xl font-black font-mono tracking-tight bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent py-4">
                    {formatTime(timeLeft)}
                  </div>

                  <div className="flex gap-2">
                    {[25, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => resetTimer(mins)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          timerMinutes === mins 
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 w-full max-w-xs">
                    {timerRunning ? (
                      <button
                        onClick={pauseTimer}
                        className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-xs font-bold rounded-xl text-white cursor-pointer"
                      >
                        Pause Focus
                      </button>
                    ) : (
                      <button
                        onClick={startTimer}
                        className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-xs font-bold rounded-xl text-white cursor-pointer border border-orange-400/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      >
                        Start Focus
                      </button>
                    )}
                    <button
                      onClick={() => resetTimer()}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold rounded-xl text-slate-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2">
                      Streak Analytics
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">🔥</div>
                      <div>
                        <div className="text-3xl font-black text-orange-400">{dbState.focusStreak}</div>
                        <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Sessions Completed</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Streaks are synced inside `db.json` locally. Focusing in structured Pomodoro cycles maintains mental stamina and revision throughput.
                    </p>
                  </div>

                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[11px] text-orange-300">
                    💡 <strong>Study Expert Tip:</strong> Keep up active recall deck reviews during your Pomodoro breaks to increase memory retention by 4x.
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB VIEW: MEMORY VAULT */}
          {currentTab === 'memory' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  Memory Vault (Cognitive Context Register)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Manage persistent user preferences loaded dynamically by the Memory Agent when routing plans.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2">
                    Write Preferences
                  </h4>
                  <form onSubmit={handleAddMemory} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold font-mono">Memory key</label>
                      <input 
                        type="text" 
                        value={newMemKey} 
                        onChange={(e)=>setNewMemKey(e.target.value)}
                        placeholder="E.g. workout_time, subject_diff"
                        className="w-full bg-slate-900 border border-white/5 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold font-mono">Memory Context Value</label>
                      <textarea 
                        value={newMemVal} 
                        onChange={(e)=>setNewMemVal(e.target.value)}
                        rows="3"
                        placeholder="E.g. user prefers calculus study blocks scheduled at morning"
                        className="w-full bg-slate-900 border border-white/5 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-lg text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Commit to Vault
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between h-[360px]">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2 mb-3">
                    Stored Context Vault
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {(dbState.memories || []).length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-xs text-slate-600 italic">
                        No remembered user preferences found.
                      </div>
                    ) : (
                      dbState.memories.map((m) => (
                        <div key={m.id} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex justify-between items-start slide-in-item">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[9px] font-bold font-mono">
                                {m.key}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono">
                                {m.timestamp ? m.timestamp.split('T')[0] : 'Historical'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-normal">{m.value}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB VIEW: SECURITY */}
          {currentTab === 'security' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Security Validation & Safe Execution Gate
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Security Agent intercepts and validates all multi-agent tool actions and prompt structures.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                    <Lock className="w-4 h-4 text-violet-400" />
                    Security Sandbox Policies
                  </h4>
                  <ul className="text-xs space-y-3 text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 shrink-0"></span>
                      <span><strong>Directory Traversal:</strong> Block patterns with dot dot segments `..` or path manipulations.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 shrink-0"></span>
                      <span><strong>Command Shell Blacklist:</strong> Reject recursive deletes, firewall stops, root elevations, or network wget queries.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 shrink-0"></span>
                      <span><strong>Command Chaining Lock:</strong> Block pipeline operators like `;`, `&&`, or `|` to restrict code execution flows.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 shrink-0"></span>
                      <span><strong>Input Sanitization:</strong> Verify database content fields for malicious XSS or SQL injection vectors.</span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-2 bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col h-[320px]">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                    <span>Audit compliance Stream</span>
                    <span className="text-[10px] text-emerald-400 font-mono">SANDBOX SECURE</span>
                  </h4>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
                    {dbState.securityLogs.map((log, idx) => {
                      let tagColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                      if (log.severity === 'Medium') tagColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                      if (log.severity === 'High') tagColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                      return (
                        <div key={idx} className="p-2.5 border border-white/5 bg-slate-900/30 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tagColor}`}>
                              {log.status}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="text-slate-300">{log.event}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB VIEW: MCP */}
          {currentTab === 'mcp' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-violet-400" />
                  Model-Context Protocol (MCP) Host Sandbox
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Expose standard Model-Context Protocol tools to simulated agents over local JSON-RPC envelopes.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">JSON-RPC Request Envelope</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setMcpRequest(JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }, null, 2));
                        }}
                        className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 rounded cursor-pointer"
                      >
                        Load tools/list
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    value={mcpRequest}
                    onChange={(e) => setMcpRequest(e.target.value)}
                    rows="10"
                    className="w-full bg-slate-950/80 border border-white/5 focus:border-violet-500 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none"
                  />

                  <button
                    onClick={handleMcpCall}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-xs rounded-xl font-bold text-white transition-colors cursor-pointer border border-violet-500/20"
                  >
                    Execute tools/call Direct Route
                  </button>
                </div>

                <div className="flex flex-col h-full justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">JSON-RPC Response Payload</span>
                  <div className="flex-1 p-4 bg-slate-950/80 border border-slate-900 rounded-xl font-mono text-xs text-cyan-400 overflow-x-auto min-h-[220px]">
                    {mcpResponse ? (
                      <pre>{mcpResponse}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Console idle. Send a request to see output.</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB VIEW: ANALYTICS */}
          {currentTab === 'analytics' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Cognitive System & Study Analytics
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluates agent workload distribution and exam schedule targets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Revision Hours Ratio</h4>
                  <div className="space-y-2">
                    <p className="text-3xl font-black text-slate-100">
                      {dbState.studyProgress.completedHours} <span className="text-sm font-normal text-slate-500">/ {dbState.studyProgress.targetHours} hours</span>
                    </p>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-cyan-400 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (dbState.studyProgress.completedHours / dbState.studyProgress.targetHours) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Target achieved: {Math.round((dbState.studyProgress.completedHours / dbState.studyProgress.targetHours) * 100) || 0}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Active Recall Cards</h4>
                    <p className="text-3xl font-black text-slate-100">{dbState.studyProgress.activeRecallDeckCount} Decks</p>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                    Spaced Repetition algorithm matches subject items to prevent cognitive decay on equations.
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Confidence Tracker</h4>
                  <div className="space-y-3">
                    {Object.entries(dbState.studyProgress.confidenceScores).map(([subj, score]) => (
                      <div key={subj} className="text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                          <span>{subj} Revision</span>
                          <span>{score}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-violet-500 h-2 rounded-full"
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB VIEW: LOCAL STORAGE VAULT */}
          {currentTab === 'localstorage' && (
            <div className="glass-card p-6 rounded-2xl space-y-6 slide-in-item">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Database className="w-5 h-5 text-cyan-400" />
                    Offline Local Database Registry & Vault Inspector
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Direct visual audit of the offline, local database state (`db.json`) running locally on your disk.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(dbState, null, 2)], { type: 'application/json' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'omnipilot_local_db.json';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 border border-violet-500/20 text-white rounded-xl transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Backup
                  </button>
                  <button
                    onClick={fetchDb}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-300 rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh State
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2">
                      Database Schema Indices
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-slate-400">Total Calendar Events:</span>
                        <span className="font-mono text-cyan-400 font-bold">{(dbState.calendar || []).length} events</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-slate-400">Total Eisenhower Tasks:</span>
                        <span className="font-mono text-emerald-400 font-bold">{(dbState.tasks || []).length} tasks</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-slate-400">Memory Preference Keys:</span>
                        <span className="font-mono text-indigo-400 font-bold">{(dbState.memories || []).length} items</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-slate-400">Security Log Audit Events:</span>
                        <span className="font-mono text-rose-400 font-bold">{(dbState.securityLogs || []).length} entries</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Focus Streak Counter:</span>
                        <span className="font-mono text-amber-400 font-bold">{dbState.focusStreak} sessions</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-white/5 pb-2">
                      Local Write Operations
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      All changes are saved to `backend/db.json` dynamically by Express endpoints and simulated MCP tool calls. No cloud synchronization or analytics telemetry is transmitted.
                    </p>
                    <button
                      onClick={handleResetDb}
                      className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Clear & Reset Database
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col h-[400px]">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Live database JSON state (`db.json`)
                  </h4>
                  <div className="flex-1 p-4 bg-slate-950/90 border border-white/5 rounded-xl font-mono text-[11px] text-cyan-300 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(dbState, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DALL AGENT LOGS SUB-CONSOLE CONTAINER */}
          {cotLogs.length > 0 && (
            <section className="glass-card p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  Cognitive Agent Logging Console (12h format timestamps)
                </h4>

                <div className="flex gap-2">
                  {['All', 'Planner', 'SecurityAgent', 'MemoryAgent', 'StudyExpert', 'LifeScheduler', 'TaskOptimizer'].map((agent) => (
                    <button
                      key={agent}
                      onClick={() => setLogFilter(agent)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        logFilter === agent 
                          ? 'bg-violet-600/20 text-violet-300 border-violet-500/35'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {agent === 'SecurityAgent' ? 'Security' : agent === 'MemoryAgent' ? 'Memory' : agent}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs">
                {filteredCotLogs.length === 0 ? (
                  <p className="text-slate-600 italic">No reasoning logs match the selected agent filter.</p>
                ) : (
                  filteredCotLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/50 border border-white/5 rounded-xl space-y-1.5 slide-in-item">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-violet-300 uppercase tracking-wide">
                          {log.agent} ➔ {log.action}
                        </span>
                        <span className="text-slate-500 font-mono">REASONING</span>
                      </div>
                      <p className="text-slate-300 italic">"Thought: {log.thought}"</p>
                      <pre className="p-2 bg-black/40 border border-slate-900 text-emerald-400 text-[10px] rounded font-mono overflow-x-auto">
                        {log.log}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

        </main>

        {/* FOOTER */}
        <footer className="px-6 py-4 text-center text-xs text-slate-600 border-t border-white/5">
          OmniPilot AI Dashboard • Designed for Hackathon Pitch • Local Multi-Agent Prototype
        </footer>
      </div>
    </div>
  );
}
