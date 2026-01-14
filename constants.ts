
import { AIDifficulty, LevelConfig, Outfit } from './types';

export const KITE_COLORS = ['#FF5733', '#C70039', '#900C3F', '#FFC300', '#DAF7A6', '#33FF57', '#3357FF', '#9C27B0', '#00BCD4'];
export const CANVAS_WIDTH = window.innerWidth;
export const CANVAS_HEIGHT = window.innerHeight;
export const KITE_SIZE = 32;
export const GRAVITY = 0.05;
export const WIND_BASE = 0.03;
export const TENSION_GROWTH = 1.2;
export const TENSION_RECOVERY = 1.6;
export const MAX_TENSION_LIMIT = 100;

export const LEVEL_DESIGNS: LevelConfig[] = [
  { number: 1, title: 'Chandni Chowk Rooftops', enemies: 1, difficulty: AIDifficulty.EASY, windMult: 0.6, durabilityMult: 1.5, location: 'Old Delhi' },
  { number: 2, title: 'Pink City Breeze', enemies: 2, difficulty: AIDifficulty.EASY, windMult: 1.1, durabilityMult: 1.3, location: 'Jaipur' },
  { number: 3, title: 'Sabarmati Skyline', enemies: 3, difficulty: AIDifficulty.MEDIUM, windMult: 1.8, durabilityMult: 1.1, location: 'Ahmedabad' },
  { number: 4, title: 'Narrow Gali Duel', enemies: 4, difficulty: AIDifficulty.MEDIUM, windMult: 1.3, durabilityMult: 1.0, location: 'Lucknow' },
  { number: 5, title: 'Kashi Ghats', enemies: 3, difficulty: AIDifficulty.MEDIUM, windMult: 1.2, durabilityMult: 0.8, location: 'Varanasi' },
  { number: 6, title: 'Monsoon Winds', enemies: 5, difficulty: AIDifficulty.MEDIUM, windMult: 2.2, durabilityMult: 1.0, location: 'Mumbai' },
  { number: 7, title: 'Basant Festival', enemies: 6, difficulty: AIDifficulty.MEDIUM, windMult: 1.5, durabilityMult: 1.0, location: 'Amritsar' },
  { number: 8, title: 'Glass Thread Storm', enemies: 4, difficulty: AIDifficulty.PRO, windMult: 1.4, durabilityMult: 0.6, location: 'Surat' },
  { number: 9, title: 'The Sky Hunters', enemies: 7, difficulty: AIDifficulty.PRO, windMult: 1.8, durabilityMult: 0.8, location: 'Agra' },
  { number: 10, title: 'THE EMPEROR OF SKY', enemies: 1, difficulty: AIDifficulty.PRO, windMult: 2.8, durabilityMult: 1.2, boss: true, location: 'Lal Qila' },
];

export const MANJHA_TYPES = [
  { id: 'm1', name: 'Saddi (Cotton)', strength: 1.0, durability: 100, color: '#FFFFFF', cost: 0, trail: false },
  { id: 'm2', name: 'Panda 8-Cord', strength: 2.8, durability: 250, color: '#FFEB3B', cost: 800, trail: false },
  { id: 'm3', name: 'Steel Wire', strength: 5.5, durability: 500, color: '#00E5FF', cost: 3500, trail: true },
  { id: 'm4', name: 'Dragon Silk', strength: 9.0, durability: 800, color: '#FF1744', cost: 10000, trail: true },
];

export const KITE_DESIGNS = [
  { id: 'k1', name: 'Standard Guddi', pattern: 'standard' as const, color: '#FF5733', cost: 0 },
  { id: 'k2', name: 'Yellow Stripe', pattern: 'striped' as const, color: '#FFC300', secondary: '#C70039', cost: 300 },
  { id: 'k3', name: 'Midnight Star', pattern: 'star' as const, color: '#1A237E', secondary: '#FFD600', cost: 1200 },
  { id: 'k4', name: 'Royal Dual', pattern: 'dual' as const, color: '#4A148C', secondary: '#FFD700', cost: 2500 },
  { id: 'k5', name: 'Neon Cyber', pattern: 'neon' as const, color: '#00E676', secondary: '#F50057', cost: 5000 },
  { id: 'k11', name: 'Imperial Gold', pattern: 'golden' as const, color: '#FFD700', secondary: '#FFFFFF', cost: 15000 },
  { id: 'k17', name: 'Phoenix Wing', pattern: 'tribal' as const, color: '#B71C1C', secondary: '#FFEB3B', cost: 40000 },
];

export const KITE_TYPES = [
  { name: 'Guddi', speed: 1.0, agility: 1.3, healthBonus: 0, description: 'Balanced for beginners' },
  { name: 'Patang', speed: 1.4, agility: 1.0, healthBonus: 50, description: 'Heavy & powerful' },
  { name: 'Pari', speed: 1.2, agility: 2.2, healthBonus: -40, description: 'Unmatched agility' },
  { name: 'Tukkal', speed: 0.8, agility: 0.7, healthBonus: 120, description: 'Tank of the sky' },
];

export const CHAKRI_DESIGNS = [
  { id: 'c1', name: 'Wood Chakri', color: '#795548', secondary: '#A1887F', emoji: '🪵', cost: 0 },
  { id: 'c2', name: 'Festival Red', color: '#D32F2F', secondary: '#FFCDD2', emoji: '🏮', cost: 2000 },
  { id: 'c3', name: 'Golden Reel', color: '#FFD700', secondary: '#FFF9C4', emoji: '✨', cost: 8000 },
];

export const OUTFIT_DESIGNS: Outfit[] = [
  { id: 'o1', name: 'Rooftop Champion', color: '#4fc3f7', secondary: '#0288d1', cost: 0 },
  { id: 'o2', name: 'Festival Kurta', color: '#ffeb3b', secondary: '#fbc02d', cost: 1500 },
  { id: 'o3', name: 'Sky Warrior', color: '#ef5350', secondary: '#b71c1c', cost: 6000 },
];
