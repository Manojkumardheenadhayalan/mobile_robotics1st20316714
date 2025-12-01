import React, { useState } from 'react';
import { ArmState, TailState } from '../types';
import { Lock, Unlock, Zap, MousePointer2, Move3d, BrainCircuit, Activity } from 'lucide-react';

interface ControlPanelProps {
  armState: ArmState;
  setArmState: React.Dispatch<React.SetStateAction<ArmState>>;
  tailState: TailState;
  setTailState: React.Dispatch<React.SetStateAction<TailState>>;
}

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  unit?: string;
  disabled?: boolean;
}> = ({ label, value, min, max, onChange, unit = '°', disabled }) => (
  <div className="mb-4 opacity-100 transition-opacity aria-disabled:opacity-50" aria-disabled={disabled}>
    <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
      <span>{label.toUpperCase()}</span>
      <span className="text-amber-500">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-600 hover:accent-amber-500 disabled:cursor-not-allowed disabled:accent-gray-600"
    />
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({
  armState,
  setArmState,
  tailState,
  setTailState,
}) => {
  const [bioMode, setBioMode] = useState(false);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Control Mode Selector */}
      <div className="bg-gray-900/80 border border-gray-700 p-4 rounded-xl flex items-center justify-between backdrop-blur">
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${bioMode ? 'bg-emerald-900/20 text-emerald-500' : 'bg-gray-800 text-gray-500'}`}>
              <BrainCircuit size={24} />
            </div>
            <div>
               <h3 className="text-white font-bold">Bio-Mimetic Control System</h3>
               <p className="text-xs text-gray-400 font-mono">
                 {bioMode 
                   ? 'AI ALGORITHMS ACTIVE: CPG OSCILLATORS & SUBSUMPTION ARCHITECTURE' 
                   : 'MANUAL OVERRIDE ACTIVE'}
               </p>
            </div>
         </div>
         <button 
           onClick={() => setBioMode(!bioMode)}
           className={`px-6 py-2 rounded font-bold font-mono transition-all ${
             bioMode 
             ? 'bg-emerald-600 text-black hover:bg-emerald-500' 
             : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
           }`}
         >
           {bioMode ? 'DISABLE AI' : 'ENABLE AI'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Arm Controls */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600/30"></div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MousePointer2 className="text-amber-500" />
              MANIPULATOR ARM (4-DOF)
            </h2>
            <div className="px-2 py-1 rounded bg-amber-900/20 border border-amber-900/50 text-xs text-amber-500 font-mono">
              {bioMode ? 'AI GUIDED' : 'SERVO ACTIVE'}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <SliderControl
                label="Base Rotation"
                value={armState.baseRotation}
                min={-180}
                max={180}
                disabled={bioMode}
                onChange={(v) => setArmState(prev => ({ ...prev, baseRotation: v }))}
              />
              <SliderControl
                label="Shoulder Elevation"
                value={armState.shoulderAngle}
                min={-45}
                max={90}
                disabled={bioMode}
                onChange={(v) => setArmState(prev => ({ ...prev, shoulderAngle: v }))}
              />
              <SliderControl
                label="Elbow Flexion"
                value={armState.elbowAngle}
                min={0}
                max={135}
                disabled={bioMode}
                onChange={(v) => setArmState(prev => ({ ...prev, elbowAngle: v }))}
              />
              <SliderControl
                label="Wrist Pitch"
                value={armState.wristAngle}
                min={-90}
                max={90}
                disabled={bioMode}
                onChange={(v) => setArmState(prev => ({ ...prev, wristAngle: v }))}
              />
            </div>

            {bioMode && (
               <div className="bg-emerald-900/10 border border-emerald-900/30 p-3 rounded text-xs text-emerald-400 font-mono flex items-center gap-2">
                  <Activity size={14} className="animate-pulse" />
                  INVERSE KINEMATICS SOLVER RUNNING...
               </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400 font-mono">END EFFECTOR STATE</span>
              <button
                onClick={() => setArmState(prev => ({ ...prev, gripperOpen: !prev.gripperOpen }))}
                className={`flex items-center gap-2 px-6 py-2 rounded font-bold transition-all ${
                  armState.gripperOpen 
                    ? 'bg-red-900/30 text-red-500 border border-red-800 hover:bg-red-900/50' 
                    : 'bg-emerald-900/30 text-emerald-500 border border-emerald-800 hover:bg-emerald-900/50'
                }`}
              >
                {armState.gripperOpen ? <Unlock size={16} /> : <Lock size={16} />}
                {armState.gripperOpen ? 'OPEN' : 'CLAMPED'}
              </button>
            </div>
          </div>
        </div>

        {/* Tail Controls */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-600/30"></div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Move3d className="text-amber-500" />
              SENSOR TAIL (2-DOF)
            </h2>
            <div className="px-2 py-1 rounded bg-blue-900/20 border border-blue-900/50 text-xs text-blue-400 font-mono">
              {tailState.sensorActive ? 'SCANNING' : 'IDLE'}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-center h-full pb-4">
             {/* Visual Representation of Tail Joystick */}
             <div className="relative w-40 h-40 bg-gray-800 rounded-full border-4 border-gray-700 shadow-inner flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-700/50 to-transparent"></div>
                {/* Stick */}
                <div 
                  className={`w-12 h-12 rounded-full shadow-lg border-2 transform transition-all duration-200 ${
                     bioMode ? 'bg-emerald-600 border-emerald-400 animate-pulse' : 'bg-amber-600 border-amber-400'
                  }`}
                  style={{ 
                      transform: bioMode ? 'scale(1.1)' : `translate(${tailState.yaw / 2}px, ${tailState.pitch / -2}px)`
                  }}
                ></div>
                {/* Crosshairs */}
                <div className="absolute w-full h-px bg-gray-600/50 pointer-events-none"></div>
                <div className="absolute h-full w-px bg-gray-600/50 pointer-events-none"></div>
             </div>

             <div className="flex-1 w-full space-y-4">
               <p className="text-sm text-gray-400 mb-4 italic">
                  Simulated hyper-redundant control mapped to 2-axis vector.
               </p>
               <SliderControl
                label="Tail Pitch (Elevation)"
                value={tailState.pitch}
                min={-45}
                max={90}
                disabled={bioMode}
                onChange={(v) => setTailState(prev => ({ ...prev, pitch: v }))}
              />
              <SliderControl
                label="Tail Yaw (Azimuth)"
                value={tailState.yaw}
                min={-90}
                max={90}
                disabled={bioMode}
                onChange={(v) => setTailState(prev => ({ ...prev, yaw: v }))}
              />
              
              <button
                 onClick={() => setTailState(prev => ({ ...prev, sensorActive: !prev.sensorActive }))}
                 className={`w-full mt-4 py-3 rounded font-mono font-bold flex items-center justify-center gap-2 transition-all ${
                   tailState.sensorActive 
                   ? 'bg-amber-600 text-black hover:bg-amber-500' 
                   : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                 }`}
              >
                <Zap size={18} className={tailState.sensorActive ? 'fill-black' : ''} />
                {tailState.sensorActive ? 'DEACTIVATE SENSORS' : 'ACTIVATE SENSORS'}
              </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};