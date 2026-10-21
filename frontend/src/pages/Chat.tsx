import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { askCodebaseChat, getChatHistory, getChatInitialContext } from '../services/api';
import type { ChatMessage } from '../types';
import { 
  Send, Sparkles, BookOpen, ShieldCheck, HelpCircle, 
  FileCode, Terminal, RefreshCw, User, Bot
} from 'lucide-react';

const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'agent',
      data: {
        summary: "Analyzing codebase repository and indexing deterministic knowledge layer...",
        evidence: [],
        analysis: [],
        hypothesis: []
      }
    }
  ]);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>([
    "What is the overarching architecture of this codebase?",
    "Which components and services form the primary workflow?",
    "What data schemas and models are defined?",
    "What are the key migration considerations and risks?"
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const initChat = async () => {
      try {
        const initData = await getChatInitialContext(id);
        if (initData) {
          setMessages([
            {
              sender: 'agent',
              data: {
                summary: initData.summary,
                evidence: initData.evidence || [],
                analysis: initData.analysis || [],
                hypothesis: initData.hypothesis || []
              }
            }
          ]);
          if (initData.suggested_questions && initData.suggested_questions.length > 0) {
            setSampleQuestions(initData.suggested_questions);
          }
        }
      } catch (e) {
        console.error("Could not load initial chat context", e);
      }
    };
    initChat();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || !id || loading) return;

    const userMsg: ChatMessage = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askCodebaseChat(id, query);
      const agentMsg: ChatMessage = {
        sender: 'agent',
        data: res
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          data: {
            summary: "Error querying RAG codebase layer. Please verify backend connectivity.",
            evidence: [],
            analysis: [],
            hypothesis: []
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-950 text-zinc-100 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Evidence-Backed Codebase Chat
          </h2>
          <p className="text-xs text-zinc-400">
            Every answer is anchored by deterministic AST evidence, dependency graph analysis, and cited line ranges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            RAG + Knowledge Graph Active
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4">
        {messages.map((m, idx) => (
          <div key={idx} className="space-y-3">
            {m.sender === 'user' ? (
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-2xl bg-zinc-800 text-zinc-100 px-4 py-3 rounded-2xl rounded-tr-sm text-xs leading-relaxed">
                  {m.text}
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 max-w-3xl space-y-3 bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl rounded-tl-sm">
                  {/* Summary Text */}
                  <div className="text-xs leading-relaxed text-zinc-200">
                    {m.data?.summary}
                  </div>

                  {/* Badged Evidence Section */}
                  {m.data?.evidence && m.data.evidence.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Evidence (Directly Observed from Code & Tests)
                      </div>
                      {m.data.evidence.map((ev, i) => (
                        <div key={i} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-zinc-300 flex items-start justify-between gap-2">
                          <span>{ev.text}</span>
                          {ev.file && (
                            <span className="font-mono text-[10px] text-emerald-400 shrink-0">
                              {ev.file}:{ev.lines || 'L1'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badged Analysis Section */}
                  {m.data?.analysis && m.data.analysis.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 font-semibold uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" />
                        Analysis (Derived from Graph Relationships)
                      </div>
                      {m.data.analysis.map((an, i) => (
                        <div key={i} className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-zinc-300">
                          {an.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Badged Hypothesis Section */}
                  {m.data?.hypothesis && m.data.hypothesis.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Hypothesis & Migration Recommendation
                      </div>
                      {m.data.hypothesis.map((hyp, i) => (
                        <div key={i} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300">
                          {hyp.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citations Box */}
                  {m.data?.citations && m.data.citations.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/50">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Citations</span>
                      <div className="flex flex-wrap gap-2">
                        {m.data.citations.map((c, i) => (
                          <div key={i} className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                            <FileCode className="w-3 h-3 text-zinc-500" />
                            <span className="text-zinc-300">{c.file}</span>
                            <span className="text-emerald-500">{c.lines}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {sampleQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ask about business logic, database queries, authentication, or dependencies..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default Chat;
