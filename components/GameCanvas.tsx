
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Kite, Vector2D, GameState, Particle, AIDifficulty, LevelConfig, Outfit, Cloud } from '../types';
import { soundManager } from '../services/soundManager';
import { 
  KITE_SIZE, 
  GRAVITY, 
  KITE_COLORS,
  TENSION_GROWTH,
  TENSION_RECOVERY,
  MAX_TENSION_LIMIT,
  TRAIL_BASE_LENGTH,
  TRAIL_SPEED_IMPACT,
  TRAIL_MAX_LIMIT
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  onKiteCut: (isPlayer: boolean, isBoss?: boolean) => void;
  playerKiteType: any;
  playerKiteDesign: any;
  playerManjha: any;
  playerOutfit: Outfit;
  currentLevel: LevelConfig;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setTension: (val: number) => void;
  setHealth: (val: number) => void;
  setGlideEnergy: (val: number) => void;
  controls: { up: boolean, down: boolean, left: boolean, right: boolean, dheel: boolean, kheech: boolean, glide: boolean };
}

interface Building {
  x: number; y: number; w: number; h: number; color: string; depth: number;
  windows: {x: number, y: number}[]; isPlayerHome?: boolean;
}

interface WindState {
  angle: number; strength: number; targetAngle: number; targetStrength: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, setGameState, onKiteCut, playerKiteType, playerKiteDesign, playerManjha, 
  playerOutfit, currentLevel, setScore, setTension, setHealth, setGlideEnergy, controls
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [kites, setKites] = useState<Kite[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const launchProgress = useRef<number>(0);
  const buildingsRef = useRef<Building[]>([]);
  const cameraShake = useRef<number>(0);
  const windRef = useRef<WindState>({
    angle: 0, strength: 0.5, targetAngle: 0, targetStrength: 0.5
  });

  // Reference to store player's motion history for the "trail" effect
  const playerTrailRef = useRef<Vector2D[]>([]);

  // Use a ref for controls to avoid recreating the update loop on every input change
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const hudSyncRef = useRef({ tension: 0, health: 100, glideEnergy: 100 });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
    // Generate Buildings
    const buildings: Building[] = [];
    const buildingColors = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#fff7ed', '#fee2e2'];
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    for (let i = -1000; i < sw + 1000; i += 240) {
      const isCenter = Math.abs(i - sw/2) < 200;
      const w = isCenter ? 320 : 180 + Math.random() * 140;
      const h = isCenter ? 420 : 250 + Math.random() * 400;
      const windows = [];
      for(let r=0; r<6; r++) for(let c=0; c<3; c++) windows.push({x: 40 + c*90, y: 70 + r*100});
      buildings.push({
        x: i, y: sh - h, w, h,
        color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
        depth: 70 + Math.random() * 100, windows, isPlayerHome: isCenter
      });
    }
    buildingsRef.current = buildings;

    // Generate Clouds
    const clouds: Cloud[] = [];
    for(let i=0; i<8; i++) {
      clouds.push({
        x: Math.random() * sw,
        y: Math.random() * (sh * 0.4),
        scale: 0.5 + Math.random() * 2,
        speed: 0.2 + Math.random() * 0.8,
        opacity: 0.3 + Math.random() * 0.5
      });
    }
    cloudsRef.current = clouds;

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initGame = useCallback(() => {
    soundManager.init();
    playerTrailRef.current = [];
    const playerBaseHealth = (playerManjha.durability + playerKiteType.healthBonus + 250) * (currentLevel.durabilityMult || 1.0);
    
    const initialKites: Kite[] = [{
      id: 'player', pos: { x: dimensions.width / 2, y: dimensions.height - 420 },
      targetPos: { x: dimensions.width / 2, y: dimensions.height / 2 },
      velocity: { x: 0, y: 0 }, angle: 0,
      color: playerKiteDesign.color, patternType: playerKiteDesign.pattern,
      secondaryColor: playerKiteDesign.secondary, size: KITE_SIZE,
      health: playerBaseHealth, maxHealth: playerBaseHealth,
      tension: 0, isPlayer: true, score: 0, active: true, isDrifting: false,
      type: playerKiteType.name, manjhaStrength: playerManjha.strength * 1.6,
      cuttingPower: 0, tailSegments: Array(16).fill({ x: dimensions.width / 2, y: dimensions.height - 420 }),
      comboCount: 0
    }];

    for (let i = 0; i < currentLevel.enemies; i++) {
      const difficulty = currentLevel.difficulty;
      const hpBase = [400, 800, 1500][Object.values(AIDifficulty).indexOf(difficulty)];
      initialKites.push({
        id: `opp-${i}`, pos: { x: Math.random() * dimensions.width, y: -300 - Math.random() * 500 },
        targetPos: { x: Math.random() * dimensions.width, y: Math.random() * 400 },
        velocity: { x: 0, y: 0 }, angle: 0,
        color: KITE_COLORS[Math.floor(Math.random() * KITE_COLORS.length)],
        patternType: (['standard', 'striped', 'star', 'dual', 'neon'][Math.floor(Math.random() * 5)]) as any,
        size: KITE_SIZE, health: hpBase, maxHealth: hpBase, tension: 25, isPlayer: false,
        score: 0, active: true, isDrifting: false, type: 'Opponent',
        manjhaStrength: 1.8 + (i * 0.4), cuttingPower: 0, difficulty: difficulty,
        tailSegments: Array(12).fill({ x: 0, y: 0 })
      });
    }
    setKites(initialKites);
    launchProgress.current = 0;
  }, [playerKiteType, playerKiteDesign, playerManjha, currentLevel, dimensions]);

  useEffect(() => { if (gameState === GameState.LAUNCHING) initGame(); }, [gameState, initGame]);

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for(let i=0; i<count; i++) {
      particlesRef.current.push({
        x, y, vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
        life: 1.0, color, size: 2 + Math.random()*4
      });
    }
  };

  const update = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.LAUNCHING) return;
    if (cameraShake.current > 0) cameraShake.current *= 0.9;

    const wind = windRef.current;
    if (Math.random() > 0.99) {
      wind.targetAngle = (Math.random() - 0.5) * Math.PI * 0.4;
      wind.targetStrength = (0.4 + Math.random() * 2.0) * (currentLevel.windMult || 1.0);
    }
    wind.angle += (wind.targetAngle - wind.angle) * 0.02;
    wind.strength += (wind.targetStrength - wind.strength) * 0.02;

    // Update Clouds
    cloudsRef.current.forEach(c => {
      c.x += c.speed * wind.strength;
      if (c.x > dimensions.width + 100) c.x = -200;
    });

    setKites(prevKites => {
      let playerKite = prevKites.find(k => k.isPlayer && !k.isDrifting);
      
      const updatedKites = prevKites.map(kite => {
        const k = { ...kite, pos: { ...kite.pos }, velocity: { ...kite.velocity } };
        
        if (k.isDrifting) {
          k.velocity.x += Math.cos(wind.angle) * wind.strength * 0.3;
          k.velocity.y += GRAVITY * 0.5;
          k.angle += 0.08;
          k.pos.x += k.velocity.x;
          k.pos.y += k.velocity.y;
          k.velocity.x *= 0.99;
          k.velocity.y *= 0.99;
          return k;
        }

        if (!k.active) return k;

        const windForceX = Math.cos(wind.angle) * wind.strength * 0.1;
        const windForceY = Math.sin(wind.angle) * wind.strength * 0.1;

        if (k.isPlayer) {
          if (gameState === GameState.LAUNCHING) {
            launchProgress.current = Math.min(1, launchProgress.current + 0.008);
            k.pos.y = dimensions.height - 420 - (launchProgress.current * 550);
            if (launchProgress.current >= 1) {
              setGameState(GameState.PLAYING);
            }
          } else {
            const agility = (playerKiteType.agility || 1.0) * 1.2; // Slightly reduced agility impact
            const moveSpeed = 1.2 * playerKiteType.speed; // Reduced base move multiplier from 1.8 to 1.2
            const ctrl = controlsRef.current;
            
            if (ctrl.left) k.velocity.x -= moveSpeed * agility;
            if (ctrl.right) k.velocity.x += moveSpeed * agility;
            if (ctrl.up) k.velocity.y -= moveSpeed * agility;
            if (ctrl.down) k.velocity.y += moveSpeed * agility;

            k.velocity.x += windForceX;
            k.velocity.y += windForceY;

            if (ctrl.kheech) {
              k.velocity.y += 1.8; // Reduced from 3.2
              k.tension = Math.min(MAX_TENSION_LIMIT + 50, k.tension + TENSION_GROWTH * 3.0);
              k.cuttingPower = k.manjhaStrength * 18.0;
            } else if (ctrl.dheel) {
              k.velocity.y -= 2.2; // Reduced from 4.0
              k.tension = Math.max(0, k.tension - TENSION_RECOVERY * 4.5);
              k.cuttingPower = k.manjhaStrength * 0.2;
            } else {
              k.velocity.y += GRAVITY * 1.5; 
              k.tension = Math.max(0, k.tension - TENSION_RECOVERY * 0.8);
              k.cuttingPower = k.manjhaStrength * 2.0;
            }
            k.velocity.x *= 0.88; k.velocity.y *= 0.88; // Increased damping from 0.92 to 0.88 for more control
            if (k.tension > MAX_TENSION_LIMIT) k.health -= 2.0;
          }

          // Update player motion history for trails with dynamic length
          if (playerManjha.trail) {
            playerTrailRef.current.unshift({ ...k.pos });
            const speedMagnitude = Math.sqrt(k.velocity.x**2 + k.velocity.y**2);
            // Dynamic controllable length calculation
            const targetTrailLength = Math.floor(
              TRAIL_BASE_LENGTH + 
              (speedMagnitude * TRAIL_SPEED_IMPACT) + 
              (k.tension / 10)
            );
            const finalTrailLimit = Math.min(TRAIL_MAX_LIMIT, targetTrailLength);
            
            if (playerTrailRef.current.length > finalTrailLimit) {
              playerTrailRef.current.splice(finalTrailLimit);
            }
          }

          hudSyncRef.current = { tension: k.tension, health: (k.health / k.maxHealth) * 100, glideEnergy: 100 };
        } else {
          if (gameState === GameState.PLAYING && playerKite) {
            const dx = playerKite.pos.x - k.pos.x;
            const dy = (playerKite.pos.y - 120) - k.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 600) {
              const skill = k.difficulty === AIDifficulty.PRO ? 0.12 : 0.05; // Slightly slower AI pursuit
              k.velocity.x += dx * skill + Math.sin(time / 300) * 1.5 + windForceX;
              k.velocity.y += dy * skill + GRAVITY * 1.2 + windForceY;
            } else {
              k.velocity.x += (Math.random() - 0.5) * 1.0 + windForceX;
              k.velocity.y += (Math.random() - 0.5) * 1.0 + windForceY;
            }
          }
          k.velocity.x *= 0.88; k.velocity.y *= 0.88;
          k.cuttingPower = k.manjhaStrength * 3.5;
        }

        k.pos.x += k.velocity.x; k.pos.y += k.velocity.y;
        k.pos.x = Math.max(k.size, Math.min(dimensions.width - k.size, k.pos.x));
        k.pos.y = Math.max(50, Math.min(dimensions.height - 420, k.pos.y));
        k.angle = Math.atan2(k.velocity.y, k.velocity.x) + Math.PI / 2;
        
        k.size = KITE_SIZE * (0.4 + (k.pos.y / dimensions.height) * 1.1);

        const newSegments = [k.pos, ...k.tailSegments.slice(0, -1)];
        k.tailSegments = newSegments.map((seg, i) => {
          if (i === 0) return seg;
          const prev = newSegments[i-1];
          return { 
            x: seg.x + (prev.x - seg.x) * 0.4 + Math.sin(time/120 + i)*1.5 + windForceX * 4, 
            y: seg.y + (prev.y - seg.y) * 0.4 + 1.5 + windForceY * 4 
          };
        });
        return k;
      });

      // Collision System
      for (let i = 0; i < updatedKites.length; i++) {
        for (let j = i + 1; j < updatedKites.length; j++) {
          const k1 = updatedKites[i]; const k2 = updatedKites[j];
          if (!k1.active || !k2.active || k1.isDrifting || k2.isDrifting) continue;
          
          const dist = Math.sqrt((k1.pos.x - k2.pos.x)**2 + (k1.pos.y - k2.pos.y)**2);
          if (dist < (k1.size + k2.size) * 0.8) {
            const dmg1 = (k2.cuttingPower / k1.manjhaStrength) * (k1.tension / 50 + 0.6);
            const dmg2 = (k1.cuttingPower / k2.manjhaStrength) * (k2.tension / 50 + 0.6);
            k1.health -= dmg1; k2.health -= dmg2;
            
            if (Math.random() > 0.8) createParticles((k1.pos.x + k2.pos.x)/2, (k1.pos.y + k2.pos.y)/2, '#FFF', 2);

            if (k1.health <= 0) { 
              k1.isDrifting = true;
              k1.velocity = { x: (Math.random() - 0.5) * 8, y: -4 };
              cameraShake.current = 15;
              soundManager.playCut();
              onKiteCut(k1.isPlayer, k1.patternType === 'golden'); 
            }
            if (k2.health <= 0) { 
              k2.isDrifting = true;
              k2.velocity = { x: (Math.random() - 0.5) * 8, y: -4 };
              cameraShake.current = 20;
              soundManager.playCut();
              if (k1.isPlayer) { 
                setScore(s => s + 5000); 
                soundManager.playSuccess(); 
              }
              onKiteCut(k2.isPlayer, k2.patternType === 'golden'); 
            }
          }
        }
      }

      const filteredKites = updatedKites.filter(k => 
        k.pos.y < dimensions.height + 600 && k.pos.x > -600 && k.pos.x < dimensions.width + 600
      );

      if (filteredKites.filter(k => !k.isPlayer && !k.isDrifting && k.active).length === 0 && gameState === GameState.PLAYING) {
        setGameState(GameState.LEVEL_UP);
      }
      return filteredKites;
    });

    particlesRef.current = particlesRef.current.filter(p => { 
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02; return p.life > 0; 
    });
    draw(time);
    requestRef.current = requestAnimationFrame(update);
  }, [gameState, dimensions, onKiteCut, setGameState, playerKiteType, currentLevel, setScore]);

  useEffect(() => {
    const sync = setInterval(() => {
      setTension(hudSyncRef.current.tension); 
      setHealth(hudSyncRef.current.health);
      setGlideEnergy(hudSyncRef.current.glideEnergy);
    }, 50);
    return () => clearInterval(sync);
  }, [setTension, setHealth, setGlideEnergy]);

  const drawCloud = (ctx: CanvasRenderingContext2D, c: Cloud) => {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20 * c.scale, 0, Math.PI * 2);
    ctx.arc(c.x + 15 * c.scale, c.y - 10 * c.scale, 15 * c.scale, 0, Math.PI * 2);
    ctx.arc(c.x + 30 * c.scale, c.y, 18 * c.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw3DBuilding = (ctx: CanvasRenderingContext2D, b: Building) => {
    const dx = b.depth * 0.7; const dy = b.depth * 0.35;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.beginPath(); ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w + dx, b.y - dy); ctx.lineTo(b.x + b.w + dx, b.y + b.h - dy); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.fill();
    ctx.fillStyle = b.isPlayerHome ? '#cbd5e1' : '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + dx, b.y - dy); ctx.lineTo(b.x + b.w + dx, b.y - dy); ctx.lineTo(b.x + b.w, b.y); ctx.fill();
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    b.windows.forEach(w => ctx.fillRect(b.x + w.x, b.y + w.y, 15, 25));
  };

  const drawPattern = (ctx: CanvasRenderingContext2D, kite: Kite, size: number) => {
    const primary = kite.color;
    const secondary = kite.secondaryColor || '#FFFFFF';
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath();
    ctx.clip();

    switch (kite.patternType) {
      case 'striped':
        ctx.fillStyle = primary; ctx.fillRect(-size, -size, size*2, size*2);
        ctx.strokeStyle = secondary; ctx.lineWidth = size * 0.2;
        ctx.beginPath(); for (let i = -size*2; i <= size*2; i += size * 0.5) { ctx.moveTo(i, -size*2); ctx.lineTo(i + size, size*2); } ctx.stroke();
        break;
      case 'star':
        ctx.fillStyle = primary; ctx.fillRect(-size, -size, size*2, size*2);
        ctx.fillStyle = secondary; ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          ctx.lineTo(Math.cos(angle) * size * 0.6, Math.sin(angle) * size * 0.6);
          ctx.lineTo(Math.cos(angle + Math.PI/5) * size * 0.25, Math.sin(angle + Math.PI/5) * size * 0.25);
        }
        ctx.closePath(); ctx.fill();
        break;
      case 'neon':
        ctx.fillStyle = '#000000'; ctx.fillRect(-size, -size, size*2, size*2);
        ctx.shadowBlur = 10; ctx.shadowColor = primary;
        ctx.strokeStyle = primary; ctx.lineWidth = size * 0.1;
        ctx.strokeRect(-size*0.7, -size*0.7, size*1.4, size*1.4);
        break;
      case 'dual':
        ctx.fillStyle = primary; ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.closePath(); ctx.fill();
        ctx.fillStyle = secondary; ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(-size, 0); ctx.lineTo(0, size); ctx.closePath(); ctx.fill();
        break;
      case 'dragon':
        ctx.fillStyle = primary; ctx.fillRect(-size, -size, size*2, size*2);
        ctx.fillStyle = secondary;
        ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(0, -size/2); ctx.lineTo(size, 0); ctx.lineTo(0, size/2); ctx.closePath(); ctx.fill();
        break;
      default:
        ctx.fillStyle = primary; ctx.fillRect(-size, -size, size*2, size*2);
        break;
    }
    ctx.restore();
  };

  const draw = (time: number) => {
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    ctx.save();
    if (cameraShake.current > 0) ctx.translate((Math.random()-0.5)*cameraShake.current, (Math.random()-0.5)*cameraShake.current);
    ctx.clearRect(-50, -50, dimensions.width+100, dimensions.height+100);
    
    const sky = ctx.createLinearGradient(0, 0, 0, dimensions.height); 
    sky.addColorStop(0, '#38bdf8'); sky.addColorStop(0.5, '#7dd3fc'); sky.addColorStop(1, '#bae6fd');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    
    cloudsRef.current.forEach(c => drawCloud(ctx, c));
    buildingsRef.current.forEach(b => draw3DBuilding(ctx, b));

    kites.forEach(kite => {
      if (!kite.active && !kite.isDrifting) return;
      
      // Draw Motion Trail for Premium Manjha
      // Condition: Only draw if the kite is the player, has trail enabled, is active, and NOT drifting (cut).
      if (kite.isPlayer && playerManjha.trail && kite.active && !kite.isDrifting && playerTrailRef.current.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(playerTrailRef.current[0].x, playerTrailRef.current[0].y);
        for (let i = 1; i < playerTrailRef.current.length; i++) {
          const seg = playerTrailRef.current[i];
          ctx.lineTo(seg.x, seg.y);
        }
        ctx.strokeStyle = playerManjha.color;
        ctx.lineWidth = 18; // Controllable visibility
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.25; 
        ctx.shadowBlur = 20; 
        ctx.shadowColor = playerManjha.color;
        ctx.stroke();
        
        // Inner core glow line for a "streak" effect
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.restore();
      }

      if (!kite.isDrifting) {
        const sx = kite.isPlayer ? dimensions.width/2 : kite.pos.x + 50; 
        const sy = dimensions.height - 420;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx, (sy+kite.pos.y)/2, kite.pos.x + Math.sin(time/200)*20, (sy+kite.pos.y)/2, kite.pos.x, kite.pos.y);
        ctx.strokeStyle = kite.isPlayer ? (controlsRef.current.kheech ? '#ef4444' : playerManjha.color) : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = kite.isPlayer ? 2.5 : 1.2;
        if (kite.isPlayer && playerManjha.trail) {
          ctx.shadowBlur = 10; ctx.shadowColor = playerManjha.color;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      ctx.save(); ctx.translate(kite.pos.x, kite.pos.y); ctx.rotate(kite.angle);
      const size = kite.size;
      drawPattern(ctx, kite, size);

      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = size*0.06; 
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-size, 0); ctx.quadraticCurveTo(0, -size*0.7, size, 0); ctx.stroke();
      
      // Tail
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(kite.pos.x, kite.pos.y);
      kite.tailSegments.forEach(seg => ctx.lineTo(seg.x, seg.y));
      ctx.strokeStyle = kite.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    particlesRef.current.forEach(p => { 
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color; 
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI*2); ctx.fill(); 
    });
    ctx.restore();
  };

  useEffect(() => { 
    requestRef.current = requestAnimationFrame(update); 
    return () => cancelAnimationFrame(requestRef.current); 
  }, [update]);

  return <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="absolute inset-0" />;
};
export default GameCanvas;
