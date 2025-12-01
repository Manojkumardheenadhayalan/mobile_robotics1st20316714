import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Battery, Signal, Thermometer, Activity, Compass, Wind } from 'lucide-react';
import { RoverTelemetry } from '../types';
import { MOCK_DATA_HISTORY, SCORPION_THEME } from '../constants';

interface DashboardProps {
  telemetry: RoverTelemetry;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; sub?: string }> = ({ title, value, icon, sub }) => (
  <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg backdrop-blur-sm hover:border-amber-600/50 transition-colors">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-gray-400 text-sm font-mono tracking-wider">{title}</h3>
      <div className="text-amber-500">{icon}</div>
    </div>
    <div className="text-2xl font-bold text-white font-mono">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ telemetry }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="BATTERY" 
          value={`${telemetry.batteryLevel}%`} 
          icon={<Battery size={20} />} 
          sub="Li-Ion Array A/B"
        />
        <StatCard 
          title="COMMS" 
          value={`${telemetry.signalStrength}%`} 
          icon={<Signal size={20} />} 
          sub="High-Gain Antenna"
        />
        <StatCard 
          title="AMBIENT" 
          value={`${telemetry.temperature}°C`} 
          icon={<Thermometer size={20} />} 
          sub="External Sensor Array"
        />
        <StatCard 
          title="VELOCITY" 
          value={`${telemetry.speed.toFixed(1)} m/s`} 
          icon={<Wind size={20} />} 
          sub="Rocker-Bogie Drive"
        />
      </div>

      {/* Main Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* Power Draw Chart */}
        <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex flex-col h-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-amber-500 font-bold tracking-widest flex items-center gap-2">
              <Activity size={16} /> POWER CONSUMPTION LOG
            </h3>
            <span className="text-xs bg-amber-900/30 text-amber-500 px-2 py-1 rounded border border-amber-900">LIVE</span>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_DATA_HISTORY}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SCORPION_THEME.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SCORPION_THEME.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="time" stroke="#6b7280" tick={{fontSize: 12}} />
                <YAxis stroke="#6b7280" tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#f3f4f6' }} 
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Area type="monotone" dataKey="power" stroke={SCORPION_THEME.primary} fillOpacity={1} fill="url(#colorPower)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orientation/Gyro */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 h-80 flex flex-col relative overflow-hidden">
          <h3 className="text-amber-500 font-bold tracking-widest flex items-center gap-2 mb-4">
             <Compass size={16} /> ATTITUDE
          </h3>
          <div className="flex-1 flex items-center justify-center relative">
            {/* Simulated Artificial Horizon */}
            <div className="w-40 h-40 rounded-full border-2 border-gray-700 relative overflow-hidden bg-gray-800">
               <div 
                 className="absolute inset-0 bg-gradient-to-b from-sky-900/50 to-amber-900/50 transition-transform duration-500"
                 style={{ transform: `rotate(${telemetry.roll}deg) translateY(${telemetry.pitch * 2}px)` }}
               >
                 <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white shadow-lg"></div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                 <div className="w-24 h-0.5 bg-amber-500/30 absolute"></div>
                 <div className="h-24 w-0.5 bg-amber-500/30 absolute"></div>
               </div>
            </div>
            <div className="absolute top-4 right-4 text-right font-mono text-xs text-gray-400">
              <div>PITCH: {telemetry.pitch}°</div>
              <div>ROLL: {telemetry.roll}°</div>
            </div>
          </div>
        </div>

        {/* Traction/Terrain Chart */}
         <div className="lg:col-span-3 bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex flex-col h-64">
           <div className="flex justify-between items-center mb-4">
            <h3 className="text-amber-500 font-bold tracking-widest uppercase">Terrain Traction Analysis</h3>
           </div>
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={MOCK_DATA_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                <Line type="stepAfter" dataKey="traction" stroke="#10b981" strokeWidth={2} dot={false} />
             </LineChart>
           </ResponsiveContainer>
         </div>

      </div>
    </div>
  );
};