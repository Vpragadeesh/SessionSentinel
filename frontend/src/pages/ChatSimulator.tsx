import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Send, ShieldAlert, TerminalSquare, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type MessageRole = 'user' | 'assistant' | 'tool';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | null;
  tool_calls?: any[];
  tool_name?: string;
  tool_args?: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
}

export const ChatSimulator: React.FC = () => {
  const navigate = useNavigate();
  
  // State for sidebar sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  // State for current chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [provider, setProvider] = useState('nvidia_nim');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from local storage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        loadSession(parsed[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      localStorage.setItem(`chat_messages_${activeSessionId}`, JSON.stringify(messages));
      
      // Update session title if it's the first user message
      setSessions(prev => {
        const updated = [...prev];
        const sessionIndex = updated.findIndex(s => s.id === activeSessionId);
        if (sessionIndex >= 0) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg && firstUserMsg.content && updated[sessionIndex].title === 'New Chat') {
            updated[sessionIndex].title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
          updated[sessionIndex].updatedAt = Date.now();
          // Sort by newest
          updated.sort((a, b) => b.updatedAt - a.updatedAt);
          localStorage.setItem('chat_sessions', JSON.stringify(updated));
        }
        return updated;
      });
    }
  }, [messages, activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewSession = () => {
    const newId = `session_chat_${uuidv4().substring(0, 8)}`;
    const newSession: ChatSession = { id: newId, title: 'New Chat', updatedAt: Date.now() };
    
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
    
    setActiveSessionId(newId);
    setMessages([]);
  };

  const loadSession = (id: string) => {
    setActiveSessionId(id);
    const savedMessages = localStorage.getItem(`chat_messages_${id}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([]);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
    localStorage.removeItem(`chat_messages_${id}`);
    
    if (activeSessionId === id) {
      if (updatedSessions.length > 0) {
        loadSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const validMessages = [...messages, userMessage].filter(m => m.role === 'user' || m.role === 'assistant');
    const apiMessages = validMessages.map(m => ({
      role: m.role,
      content: m.content || ''
    }));

    const assistantId = uuidv4();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await api.streamChatMessage(activeSessionId, apiMessages, provider, (type, data) => {
        if (type === 'content') {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: (msg.content || '') + data.content } 
                : msg
            )
          );
        } else if (type === 'tool') {
          const toolMsg: ChatMessage = {
            id: uuidv4(),
            role: 'tool',
            content: null,
            tool_name: data.tool,
            tool_args: data.args
          };
          setMessages(prev => [...prev, toolMsg]);
        }
      });
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: (msg.content || '') + '\n[Error: Failed to fetch response]' } 
            : msg
        )
      );
    } finally {
      setIsTyping(false);
      setMessages(finalMessages => {
        localStorage.setItem(`chat_history_${activeSessionId}`, JSON.stringify(finalMessages));
        
        // Update session title if first message
        setSessions(prevSessions => {
          const updated = prevSessions.map(s => {
            if (s.id === activeSessionId && s.title === 'New Chat') {
              return { ...s, title: userMessage.content?.substring(0, 20) || 'Chat', updatedAt: Date.now() };
            }
            return s;
          });
          localStorage.setItem('session_sentinel_chat_sessions', JSON.stringify(updated));
          return updated;
        });

        return finalMessages;
      });
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setRunningAnalysis(true);
      await api.runAnalysis();
      navigate('/');
    } catch (err) {
      console.error(err);
      setRunningAnalysis(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--accent-purple)" />
            Chat Simulator
          </h1>
          <p className="page-subtitle">Send live prompts to the LLM and observe tool interception telemetry</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              padding: '0.45rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              fontSize: '0.82rem',
              fontFamily: 'inherit',
            }}
          >
            <option value="nvidia_nim">NVIDIA NIM (Llama 3.1 8B)</option>
            <option value="groq">Groq (Llama 3 8B)</option>
            <option value="nemotron-3-120b">NVIDIA (nemotron-3-120b)</option>
            <option value="nemotron-3-9b">NVIDIA (nemotron-3-9b)</option>
            <option value="gpt-oss-120b">GPT-oss-120B</option>
            <option value="gpt-oss-20b">GPT-oss-20B</option>
          </select>
          
          <button 
            className="btn btn-sm btn-primary" 
            onClick={handleRunAnalysis}
            disabled={runningAnalysis || isTyping || messages.length === 0}
          >
            {runningAnalysis ? 'Running Detection…' : 'End Chat & Run Analysis'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar */}
        <div className="glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', padding: '1rem', gap: '1rem' }}>
          <button 
            className="btn" 
            onClick={createNewSession}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Plus size={16} /> New Chat
          </button>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => loadSession(session.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: activeSessionId === session.id ? 'var(--bg-subtle)' : 'transparent',
                  border: `1px solid ${activeSessionId === session.id ? 'var(--accent-blue)' : 'transparent'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <MessageSquare size={16} color={activeSessionId === session.id ? 'var(--accent-blue)' : 'var(--text-secondary)'} />
                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {session.title}
                  </span>
                </div>
                <button 
                  onClick={(e) => deleteSession(e, session.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-panel-inner)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Session ID:</strong> <code style={{ color: 'var(--accent-blue)' }}>{activeSessionId}</code> <br/>
              Act as an attacker or normal user. Any tools the AI uses to fulfill your request are logged to SessionSentinel in real-time.
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', color: 'var(--text-secondary)' }}>
                Send a message to start the simulation. Try asking for a customer's email or password reset link!
              </div>
            )}

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                {msg.role === 'tool' ? (
                  <div style={{ 
                    background: 'rgba(139, 92, 246, 0.12)', 
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--accent-purple)',
                    margin: '0.5rem 0'
                  }}>
                    <TerminalSquare size={16} />
                    <span>Agent triggered backend tool: <strong>{msg.tool_name}</strong></span>
                  </div>
                ) : (
                  <div style={{
                    maxWidth: '75%',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '1.25rem',
                    background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-panel-inner)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '1.25rem',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '1.25rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content || <span style={{ opacity: 0.5 }}>Thinking...</span>}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', background: 'var(--bg-panel-inner)', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={isTyping}
              rows={Math.min(5, input.split('\n').length)}
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: '1.25rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: '45px'
              }}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ borderRadius: '9999px', padding: '0.75rem', aspectRatio: '1', height: '45px' }}
              disabled={!input.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
