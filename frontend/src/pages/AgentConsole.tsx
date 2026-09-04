import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import { Send, Bot, User, HelpCircle, Terminal, Trash2 } from "lucide-react";

interface Message {
  id: string;
  sender: "merchant" | "agent";
  text: string;
  timestamp: Date;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  sender: "agent",
  text: "Hello! I am Recoup, your Revenue Recovery Agent. I can help you monitor at-risk revenue, list outstanding opportunities, or initiate automated recovery workflows. What would you like to do?",
  timestamp: new Date()
};

// Helper to render markdown-style tokens (bold, code, italics, bullets)
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const segments = text.split(tokenRegex);

  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    if (seg.startsWith("`") && seg.endsWith("`")) {
      return (
        <code key={i} className="bg-slate-200/80 text-sky-700 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
          {seg.slice(1, -1)}
        </code>
      );
    }
    if (seg.startsWith("*") && seg.endsWith("*")) {
      return (
        <em key={i} className="italic text-slate-600">
          {seg.slice(1, -1)}
        </em>
      );
    }
    return seg;
  });
};

const renderFormattedMessage = (text: string) => {
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
    const content = isBullet ? line.trim().substring(2) : line;
    const parts = parseInlineMarkdown(content);

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-0.5 ml-1">
          <span className="text-sky-500 font-bold">•</span>
          <span className="flex-1">{parts}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    return (
      <div key={lineIdx} className="leading-relaxed">
        {parts}
      </div>
    );
  });
};

export const AgentConsole: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("recoup_agent_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load chat history from localStorage", e);
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "How much revenue is at risk today?",
    "What should I recover first?",
    "Start recovery for Case #2",
  ];

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("recoup_agent_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
  }, [messages]);

  const handleClearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    try {
      localStorage.removeItem("recoup_agent_chat_history");
    } catch (e) {
      console.error("Failed to clear chat history from localStorage", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "merchant",
      text: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendChatMessage(text);
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: res.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (e) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "agent",
        text: "I apologize, but I encountered an error communicating with the backend. Please ensure the FastAPI server is running.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50/50 min-h-screen text-slate-800 flex flex-col h-[calc(100vh-4rem)]">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Agent Orchestration Console</h2>
        </div>

        {messages.length > 1 && (
          <button
            onClick={handleClearHistory}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 px-2.5 py-1 rounded-md border border-slate-200 hover:border-rose-200 bg-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Clear conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-xl p-6 space-y-4 mb-6 shadow-sm scrollbar-thin">
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex items-start gap-3.5 max-w-[80%] ${
              m.sender === "merchant" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar Icon */}
            <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
              m.sender === "merchant" 
                ? "bg-slate-100 text-slate-500 border border-slate-200" 
                : "bg-sky-50 text-sky-500 border border-sky-100"
            }`}>
              {m.sender === "merchant" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div className={`p-4 rounded-xl text-xs leading-relaxed ${
              m.sender === "merchant"
                ? "bg-sky-50 text-sky-950 border border-sky-100 rounded-tr-none font-medium"
                : "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-none"
            }`}>
              <div>{renderFormattedMessage(m.text)}</div>
              <span className="block text-[8px] text-slate-400 text-right mt-1.5 font-mono">
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3.5 mr-auto">
            <div className="p-2 rounded-lg bg-sky-50 text-sky-500 border border-sky-100 shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl rounded-tl-none flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-mono text-slate-400">Agent is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}></div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono uppercase font-bold">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          Suggested:
        </span>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleSendMessage(s)}
            className="text-[10px] bg-white border border-slate-200 hover:border-sky-300 text-slate-500 hover:text-sky-600 px-3 py-1.5 rounded-full font-bold transition-all shadow-sm cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex items-center gap-3"
      >
        <input
          type="text"
          placeholder="Ask Recoup to query metrics, find opportunities, or start recovery..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
        />
        <button
          type="submit"
          className="bg-sky-500 hover:bg-sky-600 text-white p-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
        >
          <Send className="w-4 h-4 fill-white" />
        </button>
      </form>
    </div>
  );
};
export default AgentConsole;
