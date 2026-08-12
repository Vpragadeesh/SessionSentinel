import axios from 'axios';

// API Configuration
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface DashboardStats {
  total_sessions: number;
  total_patterns: number;
  high_risk_count: number;
}

export interface Pattern {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  affected_sessions: number;
  affected_agents: number;
  common_tools: string[];
  common_actions: string[];
  llm_explanation: string | null;
  detected_at: string;
  risk_score: number | null;
  cluster_id: number | null;
}

export interface Alert {
  id: string;
  agent_id: string;
  technique: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  risk_score: number;
  summary: string;
  evidence: any;
  created_at: string;
  status: string;
}

export interface ActorRisk {
  id: string;
  name: string;
  type: string;
  current_risk_score: number;
  last_risk_update_at: string | null;
  first_seen_at?: string;
  last_seen_at?: string;
  status?: string;
}

export interface Agent extends ActorRisk {}

export interface EventItem {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  tool?: string;
  action?: string;
  resource?: string;
  status: string;
  guardrail_outcome?: string;
  guardrail_rule?: string;
}

export interface SessionItem {
  id: string;
  agent_id: string;
  started_at: string;
  ended_at?: string | null;
  event_count: number;
  fingerprint?: string | null;
  events?: EventItem[];
}

export interface ExplainResponse {
  pattern_id: string;
  pattern_name: string;
  provider: string;
  explanation: string;
}

// API Methods
export const api = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },

  getAlerts: async (status?: string): Promise<Alert[]> => {
    const url = status ? `/alerts?status=${status}` : '/alerts';
    const res = await apiClient.get<Alert[]>(url);
    return res.data;
  },

  getTopRiskyAgents: async (): Promise<ActorRisk[]> => {
    const res = await apiClient.get('/agents/top-risk');
    return res.data;
  },
  
  getAgents: async (): Promise<Agent[]> => {
    const res = await apiClient.get('/agents');
    return res.data;
  },

  getAgent: async (id: string): Promise<Agent> => {
    const res = await apiClient.get(`/agents/${id}`);
    return res.data;
  },

  getAgentSessions: async (id: string): Promise<SessionItem[]> => {
    const res = await apiClient.get(`/agents/${id}/sessions`);
    return res.data;
  },

  getAgentAlerts: async (id: string): Promise<Alert[]> => {
    const res = await apiClient.get(`/agents/${id}/alerts`);
    return res.data;
  },

  getSessions: async (skip: number = 0, limit: number = 50): Promise<SessionItem[]> => {
    const res = await apiClient.get<SessionItem[]>(`/sessions?skip=${skip}&limit=${limit}`);
    return res.data;
  },

  getSession: async (id: string): Promise<SessionItem> => {
    const res = await apiClient.get<SessionItem>(`/sessions/${id}`);
    return res.data;
  },

  runAnalysis: async (): Promise<{ message: string; alerts_processed: number }> => {
    const res = await apiClient.post('/analysis/run');
    return res.data;
  },

  injectAttack: async (): Promise<{ message: string }> => {
    const res = await apiClient.post('/analysis/sessions/inject-attack');
    return res.data;
  },

  resetDemo: async (): Promise<{ message: string }> => {
    const res = await apiClient.post('/analysis/demo/reset');
    return res.data;
  },

  getPatterns: async (limit: number = 100): Promise<Pattern[]> => {
    const res = await apiClient.get<Pattern[]>(`/patterns?limit=${limit}`);
    return res.data;
  },

  getPattern: async (id: string): Promise<Pattern> => {
    const res = await apiClient.get<Pattern>(`/patterns/${id}`);
    return res.data;
  },

  explainPattern: async (id: string): Promise<ExplainResponse> => {
    const res = await apiClient.post<ExplainResponse>(`/analysis/patterns/${id}/explain`);
    return res.data;
  },

  streamChatMessage: async (
    sessionId: string,
    messages: { role: string; content: string | null; tool_calls?: any[] }[],
    provider: string,
    onChunk: (type: string, data: any) => void
  ) => {
    const response = await fetch('http://localhost:8000/api/v1/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, messages, provider }),
    });

    if (!response.body) throw new Error('No body returned from stream');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            onChunk(parsed.type, parsed.data);
          } catch (e) {}
        }
      }
    }
  }

};
