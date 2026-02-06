import fs from "fs";
import path from "path";
import os from "os";
import { TokenData } from "../types.js";
import { tokenStore } from "./token-store.js";

// Session storage path
const SESSION_DIR = path.join(os.homedir(), '.ifs-mcp');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Load existing sessions from file
export function loadSessions(): Map<string, any> {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      const sessions = JSON.parse(data);
      return new Map(Object.entries(sessions));
    } catch (error) {
      return new Map();
    }
  }
  return new Map();
}

// Save session to file
export function saveSession(sessionId: string, sessionData: TokenData) {
  try {
    const sessions = loadSessions();
    sessions.set(sessionId, sessionData);

    const sessionsObj = Object.fromEntries(sessions);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionsObj, null, 2));
  } catch (error) {
    // Silent fail - session will still work in memory
  }
}

// Get the current/latest session ID
export function getCurrentSessionId(): string | null {
  const sessions = loadSessions();
  if (sessions.size === 0) return null;

  // Return the most recent session (last added)
  const sessionIds = Array.from(sessions.keys());
  return sessionIds[sessionIds.length - 1];
}

// Initialize token store from saved sessions
export function initializeTokenStore() {
  const sessions = loadSessions();
  for (const [sessionId, sessionData] of sessions.entries()) {
    tokenStore.set(sessionId, sessionData as TokenData);
  }
}
