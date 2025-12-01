export interface RoverTelemetry {
  batteryLevel: number;
  signalStrength: number;
  speed: number;
  pitch: number;
  roll: number;
  temperature: number;
}

export interface ArmState {
  baseRotation: number;
  shoulderAngle: number;
  elbowAngle: number;
  wristAngle: number;
  gripperOpen: boolean;
}

export interface TailState {
  pitch: number;
  yaw: number;
  sensorActive: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  CONTROLS = 'CONTROLS',
  ENGINEERING_LOG = 'ENGINEERING_LOG',
  AI_ASSISTANT = 'AI_ASSISTANT',
}