export const SCORPION_THEME = {
  primary: '#d97706', // Amber-600
  secondary: '#1f2937', // Gray-800
  accent: '#f59e0b', // Amber-500
  danger: '#ef4444', // Red-500
  success: '#10b981', // Emerald-500
  bg: '#050505',
};

export const INITIAL_TELEMETRY = {
  batteryLevel: 87,
  signalStrength: 92,
  speed: 0,
  pitch: 2,
  roll: -1,
  temperature: -45,
};

export const MOCK_DATA_HISTORY = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  power: 50 + Math.random() * 20,
  temp: -45 + Math.random() * 5,
  traction: 80 + Math.random() * 15,
}));
