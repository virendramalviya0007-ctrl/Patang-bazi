
export enum GameState {
  START = 'START',
  LAUNCHING = 'LAUNCHING',
  PLAYING = 'PLAYING',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  BOSS_INCOMING = 'BOSS_INCOMING'
}

export interface Vector2D {
  x: number;
  y: number;
}

export enum AIDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  PRO = 'PRO'
}

export interface Outfit {
  name: string;
  color: string;
  secondary: string;
  cost: number;
  id: string;
}

export interface Kite {
  id: string;
  pos: Vector2D;
  targetPos: Vector2D;
  velocity: Vector2D;
  angle: number;
  color: string;
  patternType: 'standard' | 'striped' | 'star' | 'dual' | 'golden' | 'royal' | 'neon' | 'tribal' | 'gradient' | 'geometric' | 'abstract' | 'dragon';
  secondaryColor?: string;
  size: number;
  health: number;
  maxHealth: number;
  tension: number;
  isPlayer: boolean;
  score: number;
  active: boolean;
  isDrifting?: boolean;
  type: string;
  manjhaStrength: number;
  cuttingPower: number;
  difficulty?: AIDifficulty;
  tailSegments: Vector2D[];
  comboCount?: number;
  lastCutTime?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  isCoin?: boolean;
  size?: number;
}

export interface CommentaryMessage {
  text: string;
  type: 'success' | 'danger' | 'info' | 'combo';
  timestamp: number;
}

export interface LevelConfig {
  number: number;
  title: string;
  enemies: number;
  difficulty: AIDifficulty;
  windMult: number;
  durabilityMult: number;
  boss?: boolean;
  location: string;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
}
