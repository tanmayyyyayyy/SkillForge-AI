import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { AiCoachMessage } from '../types/index.js';
import {
  Bot,
  Send,
  Sparkles
} from 'lucide-react';

export const AiCoachPage: React.FC = () => {
  const { profile } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<AiCoachMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [currentEngine, setCurrentEngine] = useState<string>('Detecting...');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true);
      const res = await api.ai.getMessages();
      setMessages(res.messages);
      if (res.messages.length > 0) {
        setCurrentEngine(res.messages[res.messages.length - 1].engineUsed);
      } else {
        setCurrentEngine('Not started');
      }
    } catch (err: any) {
      setCurrentEngine('Unavailable');
      toast.error(err.message || 'Failed to load coach messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isSending) return;

    setInputPrompt('');
    setIsSending(true);

    try {
      const res = await api.ai.chat(query.trim());
      setMessages(prev => [...prev, res.message]);
      setCurrentEngine(res.engineUsed);
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive coach response.');
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    'What should I learn next and why?',
    'Which project will best prove my missing skills?',
    `How should I structure my ${profile?.weeklyHours || 14} hours this week?`,
    'How should I prepare for technical interviews for this role?',
    'What is blocking my progress right now?'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: 600 }}>
      {/* Coach Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #D38A19 0%, #F5A623 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(211, 138, 25, 0.3)'
            }}
          >
            <Bot size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              SkillForge AI Career Coach
            </h1>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tailored specifically to your {profile?.targetRole ? profile.targetRole.toUpperCase() : 'target'} roadmap and verified skills.
            </div>
          </div>
        </div>

        {/* Engine Transparency Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-paper-light)',
            border: '1px solid var(--border-medium)',
            fontSize: '0.78rem',
            color: 'var(--text-primary)'
          }}
          title="Each reply is labeled with the engine that actually generated it: the live Gemini API when it responds successfully, or the internal deterministic engine as a fallback."
        >
          <Sparkles size={14} color="var(--color-accent)" />
          <span>Engine: <strong style={{ color: 'var(--color-accent)' }}>{currentEngine}</strong></span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        role="log"
        aria-label="Coach conversation"
        aria-live="polite"
        style={{
          flex: 1,
          padding: '1.5rem',
          background: 'var(--bg-main)',
          borderLeft: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {isLoadingMessages && (
          <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div className="spin" aria-hidden="true" style={{ width: 16, height: 16, border: '2px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} />
            <span>Loading your conversation...</span>
          </div>
        )}

        {!isLoadingMessages && messages.length === 0 && (
          <div role="status" style={{ textAlign: 'center', margin: 'auto', maxWidth: 520, color: 'var(--text-secondary)' }}>
            <Bot size={34} color="var(--color-accent)" style={{ marginBottom: '0.6rem' }} />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Start a conversation with your coach
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              Ask about which skills to learn next, which project to build, how to structure your week, or how to prepare for interviews.
            </p>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.74rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.3rem',
                  padding: '0 0.2rem'
                }}
              >
                {isUser ? 'You' : `SkillForge Coach (${msg.engineUsed})`} &bull;{' '}
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>

              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: isUser ? 'var(--primary)' : 'var(--bg-card)',
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  border: isUser ? 'none' : '1px solid var(--border-medium)',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {msg.content}
              </div>

              {/* Suggested Follow-ups */}
              {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.65rem' }}>
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(action)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', background: 'var(--bg-surface)' }}
                    >
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div className="spin" aria-hidden="true" style={{ width: 16, height: 16, border: '2px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} />
            <span>Analyzing career requirements and formulating response...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          padding: '0.6rem 1.5rem',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Sparkles size={13} color="var(--color-accent)" /> Quick Ask:
        </span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(p)}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.76rem', padding: '0.2rem 0.55rem', border: '1px solid var(--border-subtle)' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box Footer */}
      <div
        style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
        }}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <input
            type="text"
            className="form-input"
            aria-label="Message your coach"
            placeholder="Ask your coach anything about skills, roadmaps, interview prep, or weekly schedules..."
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            disabled={isSending}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={isSending || !inputPrompt.trim()}
            className="btn btn-primary"
            style={{ padding: '0 1.25rem' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
