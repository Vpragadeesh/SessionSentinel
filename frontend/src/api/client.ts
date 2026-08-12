import axios from 'axios';

// API Configuration
// Vite proxies /api to http://localhost:8000
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

export interface AgentRisk {
  id: string;
  name: string;
  type: string;
  current_risk_score: number;
  last_risk_update_at: string | null;
}

export interface EventItem {
  id: string;
  session_id: string;
  timestamp: string;
  type: string;
  tool?: string;
  action?: string;
  resource?: string;
  status: string;
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

  getPatterns: async (limit: number = 100): Promise<Pattern[]> => {
    const res = await apiClient.get<Pattern[]>(`/patterns?limit=${limit}`);
    return res.data;
  },

  getPattern: async (id: string): Promise<Pattern> => {
    const res = await apiClient.get<Pattern>(`/patterns/${id}`);
    return res.data;
  },

  explainPattern: async (id: string): Promise<ExplainResponse> => {
    const res = await apiClient.post<ExplainResponse>(`/patterns/${id}/explain`);
    return res.data;
  },

  getLLMStatus: async (): Promise<{ status: string; primary_provider: string }> => {
    const res = await apiClient.get('/patterns/llm/status');
    return res.data;
  },

  getTopRiskyAgents: async (): Promise<AgentRisk[]> => {
    const res = await apiClient.get('/agents/top-risk');
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

  runAnalysis: async (): Promise<{ message: string; patterns_detected: number }> => {
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

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const dataStr = line.substring(6).trim();
            if (dataStr === '[DONE]') continue;
            
            const data = JSON.parse(dataStr);
            onChunk(data.type, data);
          } catch (e) {
            console.error('Failed to parse SSE chunk:', line, e);
          }
        }
      }
    }
  }
};
