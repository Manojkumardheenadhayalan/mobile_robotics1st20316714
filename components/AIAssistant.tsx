import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { sendMessageToRoverAI } from '../services/geminiService';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      text: 'SCORPION-AI Online. I can explain the engineering transition from biological scorpion legs to the rocker-bogie wheel system, or detail the 4-DOF manipulator specs. How can I assist?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToRoverAI(input);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header */}
      <div className="bg-gray-800/80 p-4 border-b border-gray-700 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-amber-600/20 flex items-center justify-center border border-amber-600/50">
            <Bot className="text-amber-500" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white">SCORPION-AI SUPPORT</h3>
            <p className="text-xs text-amber-500/80 font-mono tracking-wider">BIOMIMETIC DATABASE LOADED</p>
          </div>
        </div>
        <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-75"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-150"></div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              msg.role === 'user' 
                ? 'bg-amber-600/20 border border-amber-600/30 text-white rounded-br-none' 
                : 'bg-gray-800/80 border border-gray-700 text-gray-200 rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-2 opacity-50 text-xs font-mono uppercase">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span>{msg.role === 'user' ? 'OPERATOR' : 'SYSTEM'}</span>
                <span>{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 rounded-bl-none flex items-center gap-3">
               <Loader2 className="animate-spin text-amber-500" size={20} />
               <span className="text-sm text-gray-400 font-mono">PROCESSING QUERY...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-800/50 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about design choices (e.g., 'Why wheels instead of legs?')"
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-amber-600 text-black px-6 rounded font-bold hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};