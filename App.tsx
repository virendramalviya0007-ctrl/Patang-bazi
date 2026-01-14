
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, CommentaryMessage } from './types';
import { MANJHA_TYPES, KITE_TYPES, KITE_DESIGNS, LEVEL_DESIGNS, CHAKRI_DESIGNS, OUTFIT_DESIGNS } from './constants';
import { getCommentary, playVoiceCommentary } from './services/geminiService';
import { soundManager } from './services/soundManager';

const ChakriComponent = ({ active, tension, design }: { active: boolean, tension: number, design: any }) => {
  const [rotation, setRotation] = useState(0);
  const requestRef = useRef<number>(0);
  useEffect(() => {
    const animate = () => { if (active) setRotation(prev => (prev + 1.2 + (tension/12)) % 360); requestRef.current = requestAnimationFrame(animate); };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [active, tension]);
  return (
    <div className="relative w-20 h-20 flex items-center justify-center pointer-events-none drop-shadow-2xl">
      <div className="relative w-full h-full rounded-full flex items-center justify-center border-4 border-slate-900/20 overflow-hidden shadow-2xl"
        style={{ transform: `rotate(${rotation}deg)`, backgroundColor: design.color, backgroundImage: `conic-gradient(from 0deg, ${design.color} 0deg, ${design.secondary} 180deg, ${design.color} 360deg)` }}>
        <div className="w-6 h-6 rounded-full bg-white/50 backdrop-blur-md z-20 border border-black/10" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,transparent_20%,rgba(0,0,0,0.4)_100%)]" />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shopTab, setShopTab] = useState<'kites' | 'manjha' | 'gear'>('kites');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => parseInt(localStorage.getItem('patang_coins_v2') || '500'));
  const [currentLevelIndex, setCurrentLevelIndex] = useState(() => parseInt(localStorage.getItem('patang_current_level_v2') || '0'));
  const [tension, setTension] = useState(0);
  const [health, setHealth] = useState(100);
  const [selectedKite, setSelectedKite] = useState(KITE_TYPES[0]);
  const [selectedDesign, setSelectedDesign] = useState(KITE_DESIGNS[0]);
  const [selectedManjha, setSelectedManjha] = useState(MANJHA_TYPES[0]);
  const [selectedChakri, setSelectedChakri] = useState(CHAKRI_DESIGNS[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFIT_DESIGNS[0]);
  const [unlockedItems, setUnlockedItems] = useState<string[]>(() => JSON.parse(localStorage.getItem('patang_unlocked_v2') || '["k1", "m1", "c1", "o1", "kt1"]'));
  const [commentary, setCommentary] = useState<CommentaryMessage[]>([]);
  const [controls, setControls] = useState({ up: false, down: false, left: false, right: false, dheel: false, kheech: false, glide: false });
  
  // Quick Settings State
  const [masterVolume, setMasterVolume] = useState(50);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const touchStartPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    localStorage.setItem('patang_coins_v2', coins.toString());
    localStorage.setItem('patang_current_level_v2', currentLevelIndex.toString());
    localStorage.setItem('patang_unlocked_v2', JSON.stringify(unlockedItems));
  }, [coins, currentLevelIndex, unlockedItems]);

  useEffect(() => {
    soundManager.setMasterVolume(masterVolume / 100);
  }, [masterVolume]);

  const addCommentary = (text: string, type: 'success' | 'danger' | 'info' | 'combo') => {
    const msg = { text, type, timestamp: Date.now() };
    setCommentary(prev => [msg, ...prev.slice(0, 1)]);
    setTimeout(() => {
      setCommentary(prev => prev.filter(m => m.timestamp !== msg.timestamp));
    }, 2500);
  };

  const handleKiteCut = async (isPlayer: boolean, isBoss?: boolean) => {
    if (isPlayer) { 
      setGameState(GameState.GAME_OVER); 
      if (voiceEnabled) await playVoiceCommentary("Oh ho! Teri patang kat gayi!", "Kore"); 
    }
    else {
      setCoins(c => c + (isBoss ? 25000 : 5000)); 
      addCommentary(isBoss ? "KING DEFEATED!" : "KAI PO CHE!", 'success');
      const reaction = await getCommentary(isBoss ? "Defeated boss kite" : "Cut opponent kite", score);
      if (voiceEnabled) await playVoiceCommentary(reaction, "Kore");
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== GameState.PLAYING) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    if (clientX < window.innerWidth / 2) {
      touchStartPos.current = { x: clientX, y: clientY };
    } else {
      if (clientY < window.innerHeight / 2) setControls(prev => ({ ...prev, kheech: true, dheel: false }));
      else setControls(prev => ({ ...prev, dheel: true, kheech: false }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== GameState.PLAYING || !touchStartPos.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const dx = clientX - touchStartPos.current.x;
    const dy = clientY - touchStartPos.current.y;
    const threshold = 10;
    setControls(prev => ({ ...prev, left: dx < -threshold, right: dx > threshold, up: dy < -threshold, down: dy > threshold }));
  };

  const handleTouchEnd = () => {
    setControls({ up: false, down: false, left: false, right: false, dheel: false, kheech: false, glide: false });
    touchStartPos.current = null;
  };

  const buyOrEquip = (item: any, setSelected: Function) => {
    if (unlockedItems.includes(item.id)) {
      setSelected(item);
    } else if (coins >= item.cost) {
      setCoins(c => c - item.cost);
      setUnlockedItems(u => [...u, item.id]);
      setSelected(item);
      soundManager.playPurchase();
    } else {
      // Small shake feedback or similar could go here
    }
  };

  const currentLevel = LEVEL_DESIGNS[currentLevelIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-200 select-none font-sans touch-none"
         onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
         onMouseDown={handleTouchStart} onMouseMove={handleTouchMove} onMouseUp={handleTouchEnd}>
         
      <GameCanvas gameState={gameState} setGameState={setGameState} onKiteCut={handleKiteCut} playerKiteType={selectedKite} playerKiteDesign={selectedDesign}
        playerManjha={selectedManjha} playerOutfit={selectedOutfit} currentLevel={currentLevel} setScore={setScore}
        setTension={setTension} setHealth={setHealth} setGlideEnergy={() => {}} controls={controls} />

      {/* Quick Settings Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
        className="absolute top-4 right-4 z-[60] w-10 h-10 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center text-xl hover:bg-white/40 transition-all active:scale-90"
      >
        ⚙️
      </button>

      {/* Settings Overlay */}
      {showSettings && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md" onClick={() => setShowSettings(false)}>
          <div className="max-w-xs w-full bg-white rounded-[2rem] p-8 shadow-2xl border-4 border-white animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bangers text-slate-800 tracking-tight">SETTINGS</h2>
              <button onClick={() => setShowSettings(false)} className="text-2xl opacity-50 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="space-y-8">
              <section>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Volume</p>
                  <p className="text-xs font-bold text-slate-800">{masterVolume}%</p>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={masterVolume} 
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </section>

              <section className="flex justify-between items-center">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voice Commentary</p>
                  <p className="text-[10px] text-slate-400">AI Rooftop Banter</p>
                </div>
                <button 
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${voiceEnabled ? 'bg-orange-500' : 'bg-slate-200'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </section>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-700 transition-colors mt-4"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === GameState.START && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl">
          {!showShop ? (
            <div className="max-w-sm w-full bg-white/95 rounded-[3rem] p-10 shadow-2xl flex flex-col items-center border-4 border-white transition-all transform hover:scale-[1.02]">
              <div className="absolute -top-12 bg-orange-500 text-white px-10 py-4 rounded-full font-bangers text-6xl shadow-2xl rotate-[-2deg]">PATANG</div>
              
              <div className="mt-8 mb-8 relative group cursor-pointer" onClick={() => setShowShop(true)}>
                <div className="absolute inset-0 bg-orange-200 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-[120px] relative drop-shadow-xl block animate-bounce" style={{ color: selectedDesign.color }}>🪁</span>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">CUSTOMIZE</div>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-100 p-3 rounded-2xl text-center border-b-4 border-slate-300">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Bazar Coins</p>
                  <p className="text-xl font-bold text-slate-800">₹{coins}</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl text-center border-b-4 border-slate-300">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sky Level</p>
                  <p className="text-xl font-bold text-slate-800">{currentLevelIndex + 1}</p>
                </div>
              </div>

              <button onClick={(e) => { e.stopPropagation(); soundManager.init(); setGameState(GameState.LAUNCHING); }}
                className="w-full bg-gradient-to-b from-orange-400 to-orange-600 text-white font-bangers text-5xl py-6 rounded-2xl shadow-xl border-b-8 border-orange-800 active:translate-y-2 active:border-b-0 mb-6 transition-all hover:scale-105">
                KHELO!
              </button>
              
              <div className="flex w-full gap-4">
                <button onClick={(e) => { e.stopPropagation(); setShowShop(true); }} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-slate-700 transition-colors">Bazaar 🛒</button>
                <button className="flex-1 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl font-black text-xs tracking-widest uppercase opacity-50 cursor-not-allowed">Global 🏆</button>
              </div>
            </div>
          ) : (
            <div className="max-w-md w-full bg-white rounded-[3rem] p-8 h-[85vh] flex flex-col shadow-2xl border-4 border-white animate-in slide-in-from-bottom duration-500">
              <div className="flex justify-between items-center mb-6">
                <button onClick={(e) => { e.stopPropagation(); setShowShop(false); }} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl hover:bg-slate-200 transition-colors">⬅️</button>
                <h1 className="text-4xl font-bangers text-orange-500 tracking-wider">BAZAAR</h1>
                <div className="bg-orange-100 px-4 py-2 rounded-full font-bold text-sm text-orange-700">₹{coins}</div>
              </div>

              {/* Shop Tabs */}
              <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl">
                {(['kites', 'manjha', 'gear'] as const).map(tab => (
                  <button key={tab} onClick={() => setShopTab(tab)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shopTab === tab ? 'bg-white shadow-md text-orange-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                {shopTab === 'kites' && (
                  <>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-b pb-1">Kite Types (Performance)</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {KITE_TYPES.map(kt => (
                          <div key={kt.id} className={`p-4 border-2 rounded-2xl flex justify-between items-center transition-all ${selectedKite.id === kt.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">{kt.name}</p>
                              <p className="text-[9px] text-slate-500 leading-none mb-2">{kt.description}</p>
                              <div className="flex gap-4">
                                <span className="text-[9px] font-black text-blue-500 uppercase">Speed: {kt.speed}x</span>
                                <span className="text-[9px] font-black text-orange-500 uppercase">Agil: {kt.agility}x</span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase">HP: {kt.healthBonus > 0 ? '+' : ''}{kt.healthBonus}</span>
                              </div>
                            </div>
                            <button onClick={() => buyOrEquip(kt, setSelectedKite)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest min-w-[80px] transition-all ${unlockedItems.includes(kt.id) ? (selectedKite.id === kt.id ? 'bg-orange-500 text-white scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                              {unlockedItems.includes(kt.id) ? (selectedKite.id === kt.id ? 'EQUIPPED' : 'SELECT') : `₹${kt.cost}`}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-b pb-1">Kite Skins (Visual)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {KITE_DESIGNS.map(d => (
                          <div key={d.id} className={`p-5 border-2 rounded-[2rem] flex flex-col items-center bg-slate-50 transition-all ${selectedDesign.id === d.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'hover:border-slate-200'}`}>
                            <span className="text-6xl mb-4 drop-shadow-md transform transition-transform group-hover:scale-110" style={{ color: d.color }}>🪁</span>
                            <p className="text-[10px] font-black text-slate-800 mb-2 uppercase text-center">{d.name}</p>
                            <button onClick={() => buyOrEquip(d, setSelectedDesign)}
                              className={`w-full py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${unlockedItems.includes(d.id) ? (selectedDesign.id === d.id ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100') : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                              {unlockedItems.includes(d.id) ? (selectedDesign.id === d.id ? 'EQUIPPED' : 'SELECT') : `₹${d.cost}`}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {shopTab === 'manjha' && (
                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-b pb-1">String Selection</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {MANJHA_TYPES.map(m => (
                        <div key={m.id} className={`p-5 border-2 rounded-2xl flex justify-between items-center transition-all ${selectedManjha.id === m.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full border-4 shadow-inner flex items-center justify-center" style={{ backgroundColor: m.color, borderColor: 'rgba(0,0,0,0.05)' }}>
                               <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{m.name}</p>
                              <div className="flex gap-3">
                                <span className="text-[9px] font-black text-rose-500 uppercase">Power: {m.strength}x</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase">Durability: {m.durability}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => buyOrEquip(m, setSelectedManjha)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest min-w-[90px] transition-all ${unlockedItems.includes(m.id) ? (selectedManjha.id === m.id ? 'bg-orange-500 text-white scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                            {unlockedItems.includes(m.id) ? (selectedManjha.id === m.id ? 'EQUIPPED' : 'SELECT') : `₹${m.cost}`}
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {shopTab === 'gear' && (
                  <>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-b pb-1">Chakri Reel</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {CHAKRI_DESIGNS.map(c => (
                          <div key={c.id} className={`p-4 border-2 rounded-3xl flex flex-col items-center transition-all ${selectedChakri.id === c.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className="text-5xl mb-3 transform hover:rotate-12 transition-transform">{c.emoji}</div>
                            <p className="text-[10px] font-black text-slate-800 mb-3 uppercase">{c.name}</p>
                            <button onClick={() => buyOrEquip(c, setSelectedChakri)}
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${unlockedItems.includes(c.id) ? (selectedChakri.id === c.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                              {unlockedItems.includes(c.id) ? (selectedChakri.id === c.id ? 'EQUIPPED' : 'SELECT') : `₹${c.cost}`}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest border-b pb-1">Flyer Outfits</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {OUTFIT_DESIGNS.map(o => (
                          <div key={o.id} className={`p-4 border-2 rounded-2xl flex justify-between items-center transition-all ${selectedOutfit.id === o.id ? 'border-orange-400 bg-orange-50 shadow-md' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full shadow-inner border-2" style={{ backgroundColor: o.color, borderColor: o.secondary }} />
                              <p className="text-sm font-bold text-slate-800">{o.name}</p>
                            </div>
                            <button onClick={() => buyOrEquip(o, setSelectedOutfit)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest min-w-[90px] transition-all ${unlockedItems.includes(o.id) ? (selectedOutfit.id === o.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                              {unlockedItems.includes(o.id) ? (selectedOutfit.id === o.id ? 'EQUIPPED' : 'SELECT') : `₹${o.cost}`}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.LAUNCHING) && (
        <>
          <div className="absolute top-8 left-8 right-8 flex justify-between pointer-events-none z-10">
            <div className="bg-white/30 backdrop-blur-xl p-5 rounded-[2rem] border-2 border-white/40 shadow-2xl">
              <p className="text-[9px] font-black text-white mix-blend-difference uppercase mb-1 tracking-widest">Score</p>
              <p className="text-4xl font-bangers text-white mix-blend-difference leading-none">{score}</p>
            </div>
            
            <div className="flex flex-col items-end gap-3 w-40">
              <div className="w-full bg-white/20 backdrop-blur-lg p-3 rounded-2xl border border-white/30 shadow-xl">
                <div className="flex justify-between text-[10px] font-black text-white mix-blend-difference mb-1 tracking-tighter"><span>HEALTH</span><span>{Math.round(health)}%</span></div>
                <div className="h-2.5 bg-black/10 rounded-full overflow-hidden border border-white/20"><div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300" style={{ width: `${health}%` }} /></div>
              </div>
              <div className="w-full bg-white/20 backdrop-blur-lg p-3 rounded-2xl border border-white/30 shadow-xl">
                <div className="flex justify-between text-[10px] font-black text-white mix-blend-difference mb-1 tracking-tighter"><span>TENSION</span><span>{Math.round(tension)}%</span></div>
                <div className="h-2.5 bg-black/10 rounded-full overflow-hidden border border-white/20"><div className="h-full bg-gradient-to-r from-blue-400 to-rose-600 transition-all duration-300" style={{ width: `${Math.min(100, tension)}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 right-12 z-20 hover:scale-110 transition-transform cursor-pointer">
            <ChakriComponent active={true} tension={tension} design={selectedChakri} />
          </div>

          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-sm px-8 pointer-events-none flex flex-col gap-4">
            {commentary.map(c => (
              <div key={c.timestamp} className={`p-8 bg-white/10 backdrop-blur-2xl text-white rounded-[3rem] text-center font-bangers text-7xl animate-in fade-in zoom-in slide-in-from-top duration-700 shadow-2xl border-4 border-white/20 tracking-widest italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]`}>
                {c.text}
              </div>
            ))}
          </div>

          {gameState === GameState.LAUNCHING && (
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <p className="text-white font-bangers text-5xl italic drop-shadow-2xl animate-pulse uppercase">DHIL DE... DHIL DE!</p>
            </div>
          )}
        </>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-rose-950/50 backdrop-blur-2xl">
          <div className="bg-white rounded-[4rem] p-12 max-w-sm w-full text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-8 border-rose-500 animate-in zoom-in duration-300">
            <h2 className="text-7xl font-bangers text-rose-600 mb-4 tracking-tighter italic">KAT GAI!</h2>
            <p className="text-slate-500 font-black text-xs uppercase mb-10 tracking-[0.3em]">Patang Katwaya Hai!</p>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10 border-b-4 border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Final Score</p>
              <p className="text-5xl font-bangers text-slate-800 tracking-wider">{score}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setScore(0); setGameState(GameState.START); }} 
              className="w-full bg-rose-600 text-white font-bangers text-4xl py-6 rounded-2xl shadow-xl hover:bg-rose-700 active:scale-95 transition-all border-b-8 border-rose-900">
              PHIR SE TRY KARO
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.LEVEL_UP && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-emerald-950/50 backdrop-blur-2xl">
          <div className="bg-white rounded-[4rem] p-12 max-w-sm w-full text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-8 border-emerald-500 animate-in zoom-in duration-300">
            <h2 className="text-7xl font-bangers text-emerald-600 mb-4 italic tracking-widest">KATA HAI!</h2>
            <p className="text-slate-500 font-black text-xs uppercase mb-10 tracking-[0.3em]">You Cleared the Sky!</p>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10 border-b-4 border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Location Unlocked</p>
              <p className="text-3xl font-bangers text-slate-800 tracking-wider">{LEVEL_DESIGNS[Math.min(LEVEL_DESIGNS.length-1, currentLevelIndex+1)]?.location || 'Final Champion'}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setCurrentLevelIndex(p => Math.min(LEVEL_DESIGNS.length - 1, p+1)); setGameState(GameState.LAUNCHING); }} 
              className="w-full bg-emerald-600 text-white font-bangers text-4xl py-6 rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all border-b-8 border-emerald-900">
              AGLA LEVEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
