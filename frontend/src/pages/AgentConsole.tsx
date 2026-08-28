import React, { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import { Send, Bot, User, HelpCircle, Terminal } from "lucide-react";

interface Message {
  id: string;
  sender: "merchant" | "agent";
  text: string;
  timestamp: Date;
}

export const AgentConsole: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: "Hello! I am RecoverAI, your Revenue Recovery Agent. I can help you monitor at-risk revenue, list outstanding opportunities, or initiate automated recovery workflows. What would you like to do?",
      timestamp: new Date()
    }
  ]);
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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4 mb-6">
        <Terminal className="w-5 h-5 text-sky-500" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Agent Orchestration Console</h2>
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
                ? "bg-sky-50 text-sky-950 border border-sky-100 rounded-tr-none"
                : "bg-slate-50 border border-slate-200 text-slate-600 rounded-tl-none"
            }`}>
              <div className="font-mono whitespace-pre-wrap">{m.text}</div>
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
          placeholder="Ask RecoverAI to query metrics, find opportunities, or start recovery..."
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
