import React, { useState, useEffect } from 'react';
import { INITIAL_TELEMETRY, SCORPION_THEME } from './constants';
import { ArmState, TailState, TabView, RoverTelemetry } from './types';
import { Dashboard } from './components/Dashboard';
import { ControlPanel } from './components/ControlPanel';
import { AIAssistant } from './components/AIAssistant';
import { DesignSpecs } from './components/DesignSpecs';
import { LayoutDashboard, Gamepad2, FileText, MessageSquareText, Settings } from 'lucide-react';
import { initGemini } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  
  // Rover State
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(INITIAL_TELEMETRY);
  const [armState, setArmState] = useState<ArmState>({
    baseRotation: 0,
    shoulderAngle: 0,
    elbowAngle: 45,
    wristAngle: 0,
    gripperOpen: false,
  });
  const [tailState, setTailState] = useState<TailState>({
    pitch: 0,
    yaw: 0,
    sensorActive: false,
  });

  // Initialize Services
  useEffect(() => {
    initGemini();
  }, []);

  // Simulate Telemetry Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        batteryLevel: Math.max(0, prev.batteryLevel - 0.01),
        speed: activeTab === TabView.CONTROLS ? Math.random() * 0.5 : 0, // Idle unless in control mode
        pitch: prev.pitch + (Math.random() - 0.5),
        roll: prev.roll + (Math.random() - 0.5),
        temperature: -45 + (Math.random() * 2),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const navItemClass = (tab: TabView) => `
    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer
    ${activeTab === tab 
      ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50 border border-amber-500' 
      : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
  `;

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-gray-800 bg-[#0a0a0c] flex flex-col z-10">
        <div className="p-6 border-b border-gray-800">
           <h1 className="text-2xl font-bold font-mono tracking-tighter text-white">
             SCORPION<span className="text-amber-600">.OS</span>
           </h1>
           <p className="text-xs text-gray-500 font-mono mt-1">PLANETARY ROVER INTERFACE</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab(TabView.DASHBOARD)} className={navItemClass(TabView.DASHBOARD)}>
            <LayoutDashboard size={20} />
            <span className="font-mono text-sm tracking-wide">TELEMETRY</span>
          </button>
          
          <button onClick={() => setActiveTab(TabView.CONTROLS)} className={navItemClass(TabView.CONTROLS)}>
            <Gamepad2 size={20} />
            <span className="font-mono text-sm tracking-wide">ROBOTICS CONTROL</span>
          </button>

          <button onClick={() => setActiveTab(TabView.ENGINEERING_LOG)} className={navItemClass(TabView.ENGINEERING_LOG)}>
            <FileText size={20} />
            <span className="font-mono text-sm tracking-wide">TECHNICAL REPORT</span>
          </button>

          <button onClick={() => setActiveTab(TabView.AI_ASSISTANT)} className={navItemClass(TabView.AI_ASSISTANT)}>
            <MessageSquareText size={20} />
            <span className="font-mono text-sm tracking-wide">AI ASSISTANT</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
           <div className="flex items-center gap-3 text-gray-500 text-xs font-mono">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             SYSTEM NORMAL
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
             style={{ 
               backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
             }}>
        </div>

        {/* Top Bar */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-[#0a0a0c]/80 backdrop-blur z-10">
          <h2 className="text-gray-300 font-mono text-lg uppercase tracking-widest">
            {activeTab === TabView.ENGINEERING_LOG ? 'TECHNICAL REPORT & SPECS' : activeTab.replace('_', ' ')}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-amber-600 border border-amber-900 bg-amber-900/20 px-2 py-1 rounded">
               REV 2.4-BETA
            </span>
            <Settings className="text-gray-500 hover:text-white cursor-pointer" size={20} />
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0">
          {activeTab === TabView.DASHBOARD && <Dashboard telemetry={telemetry} />}
          
          {activeTab === TabView.CONTROLS && (
            <ControlPanel 
              armState={armState} 
              setArmState={setArmState}
              tailState={tailState}
              setTailState={setTailState}
            />
          )}

          {activeTab === TabView.ENGINEERING_LOG && <DesignSpecs />}

          {activeTab === TabView.AI_ASSISTANT && (
             <div className="max-w-4xl mx-auto">
               <AIAssistant />
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;