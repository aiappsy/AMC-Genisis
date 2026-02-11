
import React, { useState } from 'react';

interface ChatInterfaceProps {
  onStart: (idea: string) => void;
  isGenerating: boolean;
  logs: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onStart, isGenerating, logs }) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onStart(input);
      setInput("");
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">AI Architect</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Describe your business idea in detail. The DGBP pipeline will generate a strategy, brand kit, website structure, marketing assets, and social packs.
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4 scroll-smooth">
        <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none self-start max-w-[90%] border border-slate-700">
          <p className="text-sm">Hello! I'm your Business Genesis Architect. What disruptive concept are we building today?</p>
        </div>

        {isGenerating && (
          <div className="bg-indigo-600/10 p-4 rounded-2xl rounded-tl-none self-start max-w-[90%] border border-indigo-500/20">
            <div className="flex gap-1 mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
            <p className="text-sm text-indigo-300">Processing your idea through the 6-stage genesis pipeline...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. A high-end subscription coffee service for digital nomads..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] resize-none disabled:opacity-50"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute bottom-4 right-4 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
