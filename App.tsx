import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Fliffy, HuntingLocation, Upgrade, RebirthUpgrade, ActiveTab, FliffyColor, FliffyPattern, TradeListing } from './types';
import { Rarity, UpgradeType, RebirthUpgradeType } from './types';
import { HUNTING_LOCATIONS, UPGRADES_DATA, REBIRTH_UPGRADES_DATA, FLIFFY_COLORS, FLIFFY_PATTERNS, RARITY_DATA } from './constants';

// --- HELPER COMPONENTS (defined outside App to prevent re-renders) ---

const formatNumber = (num: number): string => {
  if (num < 1e3) return num.toFixed(2);
  if (num < 1e6) return `${(num / 1e3).toFixed(2)}K`;
  if (num < 1e9) return `${(num / 1e6).toFixed(2)}M`;
  if (num < 1e12) return `${(num / 1e9).toFixed(2)}B`;
  return `${(num / 1e12).toFixed(2)}T`;
};

const FliffyVisual: React.FC<{ fliffy: Fliffy }> = ({ fliffy }) => {
  const patternId = `pattern-${fliffy.pattern.id}-${fliffy.color.hex.slice(1)}`;

  const getPattern = () => {
    switch (fliffy.pattern.id) {
      case 'spotted':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="4" fill={fliffy.color.hex} fillOpacity="0.5" />
          </pattern>
        );
      case 'striped':
        return (
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <rect width="5" height="10" fill={fliffy.color.hex} fillOpacity="0.5" />
          </pattern>
        );
      case 'swirl':
        return (
           <pattern id={patternId} patternUnits="userSpaceOnUse" width="100" height="100">
             <path d="M 50,50 m -40,0 a 40,40 0 1,0 80,0 a 40,40 0 1,0 -80,0" stroke={fliffy.color.hex} strokeWidth="10" strokeOpacity="0.3" fill="none" />
             <path d="M 50,50 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0" stroke={fliffy.color.hex} strokeWidth="8" strokeOpacity="0.4" fill="none" />
           </pattern>
        );
      case 'stardust':
          return (
             <pattern id={patternId} patternUnits="userSpaceOnUse" width="50" height="50">
                {[...Array(20)].map((_, i) => <circle key={i} cx={Math.random()*50} cy={Math.random()*50} r={Math.random()*1.5} fill={fliffy.color.hex} fillOpacity={Math.random()*0.5 + 0.5}/>)}
             </pattern>
          )
      default:
        return null;
    }
  };

  return (
    <div className="relative w-24 h-24 flex items-center justify-center animate-float">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>{getPattern()}</defs>
        <circle cx="50" cy="50" r="45" fill={fliffy.color.hex} stroke="#000" strokeOpacity="0.1" strokeWidth="2"/>
        {fliffy.pattern.id !== 'solid' && (
          <circle cx="50" cy="50" r="45" fill={`url(#${patternId})`} />
        )}
      </svg>
    </div>
  );
};

const FliffyCard: React.FC<{ fliffy: Fliffy; onSell?: () => void }> = ({ fliffy, onSell }) => (
  <div className="bg-fliffy-bg-dark rounded-xl p-4 flex flex-col items-center shadow-md animate-pop-in">
    <FliffyVisual fliffy={fliffy} />
    <p className="font-bold text-lg mt-2 text-center break-words w-full">{fliffy.pattern.name} {fliffy.color.name}</p>
    <p className={`${RARITY_DATA[fliffy.rarity].color} font-semibold`}>{fliffy.rarity}</p>
    <p className="text-fliffy-text-light text-sm mt-1">+${formatNumber(fliffy.income)}/s</p>
    {onSell && (
        <button 
            onClick={onSell} 
            className="mt-2 w-full bg-fliffy-accent text-white text-sm font-bold py-1 px-2 rounded-md hover:bg-amber-600 transition-colors">
            Sell
        </button>
    )}
  </div>
);

const HuntModal: React.FC<{ fliffy: Fliffy | null; onClose: () => void }> = ({ fliffy, onClose }) => {
    if (!fliffy) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-fliffy-panel rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-extrabold text-fliffy-primary mb-4">You caught a new Fliffy!</h2>
                <FliffyCard fliffy={fliffy} />
                <button onClick={onClose} className="mt-6 w-full bg-fliffy-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                    Awesome!
                </button>
            </div>
        </div>
    );
};

interface RebirthModalProps {
  pointsToGain: number;
  onConfirm: () => void;
  onCancel: () => void;
  requirements: { fliffBucks: number; rarity: Rarity };
  checks: { hasEnoughBucks: boolean; hasRequiredRarity: boolean; canRebirth: boolean };
}

const RebirthModal: React.FC<RebirthModalProps> = ({ pointsToGain, onConfirm, onCancel, requirements, checks }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
    <div className="bg-fliffy-panel rounded-2xl p-8 max-w-md w-full text-center shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
      <h2 className="text-3xl font-extrabold text-fliffy-secondary mb-2">Rebirth?</h2>
      <p className="text-fliffy-text-light mb-4">
        Reset your progress to gain permanent boosts. You must meet the requirements below.
      </p>

      <div className="bg-fliffy-bg-dark p-4 rounded-lg mb-6 text-left space-y-2">
         <h3 className="font-bold text-lg text-center mb-3">Requirements</h3>
         <div className={`flex justify-between items-center p-2 rounded ${checks.hasEnoughBucks ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className={checks.hasEnoughBucks ? 'text-green-800' : 'text-red-800'}>
                {`Reach ${formatNumber(requirements.fliffBucks)} Fliff Bucks`}
            </span>
            <span className="font-bold text-2xl">{checks.hasEnoughBucks ? '✓' : '✗'}</span>
         </div>
         <div className={`flex justify-between items-center p-2 rounded ${checks.hasRequiredRarity ? 'bg-green-100' : 'bg-red-100'}`}>
            <span className={checks.hasRequiredRarity ? 'text-green-800' : 'text-red-800'}>
                {`Own a ${requirements.rarity} Fliffy`}
            </span>
             <span className="font-bold text-2xl">{checks.hasRequiredRarity ? '✓' : '✗'}</span>
         </div>
      </div>
      
      <div className="bg-fliffy-bg-dark p-4 rounded-lg mb-6">
        <p className="text-lg">You will gain</p>
        <p className="text-4xl font-extrabold text-fliffy-secondary">{formatNumber(pointsToGain)}</p>
        <p className="text-lg">Fluff Points!</p>
      </div>
      <div className="flex justify-around">
        <button onClick={onCancel} className="bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg hover:bg-gray-400 transition-colors">
          Not yet
        </button>
        <button 
            onClick={onConfirm}
            disabled={!checks.canRebirth}
            className="bg-fliffy-secondary text-white font-bold py-3 px-8 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Rebirth!
        </button>
      </div>
    </div>
  </div>
);

const SellModal: React.FC<{ fliffy: Fliffy | null; onClose: () => void; onConfirm: (price: number) => void }> = ({ fliffy, onClose, onConfirm }) => {
    const [price, setPrice] = useState('');
    if (!fliffy) return null;

    const handleConfirm = () => {
        const priceNum = parseInt(price, 10);
        if (!isNaN(priceNum) && priceNum > 0) {
            onConfirm(priceNum);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-fliffy-panel rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-extrabold text-fliffy-primary mb-4">Sell Your Fliffy</h2>
                <FliffyCard fliffy={fliffy} />
                <div className="mt-6">
                    <label htmlFor="price" className="block text-sm font-medium text-fliffy-text-light text-left">Set Price (Fliff Bucks)</label>
                    <input
                        type="number"
                        id="price"
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        className="mt-1 block w-full px-3 py-2 bg-fliffy-bg-dark border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-fliffy-primary focus:border-fliffy-primary sm:text-sm"
                        placeholder="e.g., 1000"
                        min="1"
                    />
                </div>
                 <div className="mt-6 flex justify-around gap-4">
                    <button onClick={onClose} className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className="flex-1 bg-fliffy-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={!price || parseInt(price, 10) <= 0}>
                        List for Sale
                    </button>
                </div>
            </div>
        </div>
    );
};

const OfflineEarningsModal: React.FC<{ earnings: number; onClose: () => void }> = ({ earnings, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-fliffy-panel rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-extrabold text-fliffy-accent mb-4">Welcome Back!</h2>
            <p className="text-fliffy-text-light mb-4">You earned some Fliff Bucks while you were away.</p>
            <div className="bg-fliffy-bg-dark p-4 rounded-lg mb-6">
                <p className="text-4xl font-extrabold text-fliffy-accent">+{formatNumber(earnings)}</p>
                <p className="text-lg">Fliff Bucks!</p>
            </div>
            <button onClick={onClose} className="mt-6 w-full bg-fliffy-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-colors">
                Collect
            </button>
        </div>
    </div>
);

// --- MINIGAME COMPONENT ---
const MINIGAME_GRID_SIZE = 10;
const MINIGAME_TIME_LIMIT = 20;
const MINIGAME_PENALTY = 30;
const MINIGAME_OBSTACLES = 8;

interface Position {
  x: number;
  y: number;
}

const MinigameModal: React.FC<{
  onWin: (reward: number) => void;
  onLose: (penalty: number) => void;
  onClose: () => void;
  baseReward: number;
}> = ({ onWin, onLose, onClose, baseReward }) => {
  const [fliffyPos, setFliffyPos] = useState<Position>({ x: 0, y: 0 });
  const [housePos, setHousePos] = useState<Position>({ x: 0, y: 0 });
  const [obstacles, setObstacles] = useState<Position[]>([]);
  const [timeLeft, setTimeLeft] = useState(MINIGAME_TIME_LIMIT);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const gameBoardRef = useRef<HTMLDivElement>(null);
  
  // Initialize game
  useEffect(() => {
    const newObstacles: Position[] = [];
    const occupied = new Set<string>();

    const randomPos = () => {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * MINIGAME_GRID_SIZE),
                y: Math.floor(Math.random() * MINIGAME_GRID_SIZE),
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        occupied.add(`${pos.x},${pos.y}`);
        return pos;
    };
    
    const startPos = randomPos();
    setFliffyPos(startPos);

    let endPos;
    do {
       endPos = randomPos();
    } while (Math.abs(startPos.x - endPos.x) + Math.abs(startPos.y - endPos.y) < MINIGAME_GRID_SIZE / 2); // Ensure house isn't too close
    setHousePos(endPos);

    for (let i = 0; i < MINIGAME_OBSTACLES; i++) {
        newObstacles.push(randomPos());
    }
    setObstacles(newObstacles);

    gameBoardRef.current?.focus();
  }, []);

  // Game loop (timer)
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    if (timeLeft <= 0) {
      setGameStatus('lost');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameStatus]);
  
  // Game end handler
  useEffect(() => {
    if (gameStatus === 'won') {
        setTimeout(() => onWin(baseReward), 2000);
    } else if (gameStatus === 'lost') {
        setTimeout(() => onLose(MINIGAME_PENALTY), 2000);
    }
  }, [gameStatus, baseReward, onWin, onLose]);

  const moveFliffy = useCallback((dx: number, dy: number) => {
      if (gameStatus !== 'playing') return;

      setFliffyPos(prevPos => {
          const newPos = { x: prevPos.x + dx, y: prevPos.y + dy };
          
          if (newPos.x < 0 || newPos.x >= MINIGAME_GRID_SIZE || newPos.y < 0 || newPos.y >= MINIGAME_GRID_SIZE) {
              return prevPos;
          }

          if (obstacles.some(o => o.x === newPos.x && o.y === newPos.y)) {
              return prevPos;
          }

          if (newPos.x === housePos.x && newPos.y === housePos.y) {
              setGameStatus('won');
          }

          return newPos;
      });
  }, [gameStatus, obstacles, housePos]);

  // Keyboard controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          e.preventDefault();
          switch (e.key) {
              case 'ArrowUp': case 'w': moveFliffy(0, -1); break;
              case 'ArrowDown': case 's': moveFliffy(0, 1); break;
              case 'ArrowLeft': case 'a': moveFliffy(-1, 0); break;
              case 'ArrowRight': case 'd': moveFliffy(1, 0); break;
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveFliffy]);

  const renderCellContent = (x: number, y: number) => {
    if (fliffyPos.x === x && fliffyPos.y === y) return <div className="w-full h-full text-2xl flex items-center justify-center animate-float">🦋</div>;
    if (housePos.x === x && housePos.y === y) return <div className="w-full h-full text-2xl flex items-center justify-center">🏠</div>;
    if (obstacles.some(o => o.x === x && o.y === y)) return <div className="w-full h-full text-2xl flex items-center justify-center">🌲</div>;
    return null;
  };
  
  const getStatusMessage = () => {
    switch (gameStatus) {
        case 'won': return `You Win! +${formatNumber(baseReward)}!`;
        case 'lost': return `Out of Time! -${MINIGAME_PENALTY} Fliff Bucks.`;
        default: return '';
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-fliffy-panel rounded-2xl p-6 max-w-lg w-full text-center shadow-2xl animate-pop-in relative" onClick={e => e.stopPropagation()}>
         <h2 className="text-2xl font-extrabold text-fliffy-primary mb-2">Guide the Fliffy Home!</h2>
         <p className="text-fliffy-text-light mb-4">Use arrow keys or WASD to move.</p>

         <div className="flex justify-between items-center bg-fliffy-bg-dark p-2 rounded-lg mb-4">
            <div className="font-bold text-lg">Time Left: <span className="text-fliffy-secondary">{timeLeft}s</span></div>
            <button onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-md hover:bg-gray-400">&times;</button>
         </div>

         <div ref={gameBoardRef} tabIndex={-1} className="grid grid-cols-10 gap-1 bg-green-200 p-2 rounded-lg aspect-square outline-none">
            {[...Array(MINIGAME_GRID_SIZE * MINIGAME_GRID_SIZE)].map((_, i) => {
                const x = i % MINIGAME_GRID_SIZE;
                const y = Math.floor(i / MINIGAME_GRID_SIZE);
                return (
                    <div key={i} className="bg-green-400/50 rounded aspect-square flex items-center justify-center">
                        {renderCellContent(x,y)}
                    </div>
                );
            })}
         </div>

         {gameStatus !== 'playing' && (
            <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center animate-fade-in">
                <p className={`text-4xl font-extrabold ${gameStatus === 'won' ? 'text-fliffy-accent' : 'text-fliffy-secondary'}`}>
                    {getStatusMessage()}
                </p>
            </div>
         )}
      </div>
    </div>
  );
};


const TabButton: React.FC<{
  tabId: ActiveTab;
  label: string;
  icon: React.ReactElement;
  activeTab: ActiveTab;
  onClick: (tabId: ActiveTab) => void;
}> = ({ tabId, label, icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(tabId)}
    className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 p-3 sm:p-4 rounded-t-lg transition-all duration-300 ${
      activeTab === tabId
        ? 'bg-fliffy-panel shadow-inner -translate-y-1'
        : 'bg-fliffy-bg-dark hover:bg-white/70'
    }`}
  >
    {icon}
    <span className="font-bold">{label}</span>
  </button>
);

const UpgradeCard: React.FC<{
  upgrade: Upgrade | RebirthUpgrade;
  onBuy: () => void;
  currency: number;
  currencySymbol: string;
  isRebirth?: boolean;
}> = ({ upgrade, onBuy, currency, currencySymbol, isRebirth = false }) => {
  const cost = upgrade.baseCost * upgrade.costMultiplier ** upgrade.level;
  const canAfford = currency >= cost;
  const isMaxLevel = upgrade.level >= upgrade.maxLevel;
  const colorClass = isRebirth ? 'fliffy-secondary' : 'fliffy-primary';

  return (
    <div
      className={`bg-fliffy-bg-dark rounded-xl p-4 shadow-md transition-all ${
        isMaxLevel ? 'opacity-60' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`font-extrabold text-lg text-${colorClass}`}>{upgrade.name}</h3>
          <p className="text-fliffy-text-light text-sm mt-1">{upgrade.description}</p>
        </div>
        <div
          className={`text-center ml-4 px-3 py-1 rounded-full font-bold bg-${colorClass}/20 text-${colorClass}`}
        >
          Lvl {upgrade.level}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="font-semibold">
          <p>Cost: {formatNumber(cost)} {currencySymbol}</p>
        </div>
        <button
          onClick={onBuy}
          disabled={!canAfford || isMaxLevel}
          className={`px-6 py-2 rounded-lg font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRebirth
              ? 'bg-fliffy-secondary hover:bg-pink-700'
              : 'bg-fliffy-primary hover:bg-indigo-700'
          }`}
        >
          {isMaxLevel ? 'Maxed' : 'Buy'}
        </button>
      </div>
    </div>
  );
};

const TradeCard: React.FC<{ listing: TradeListing; onBuy: () => void; canAfford: boolean }> = ({
  listing,
  onBuy,
  canAfford,
}) => (
  <div className="bg-fliffy-bg-dark rounded-xl p-4 flex flex-col items-center shadow-md animate-pop-in">
    <FliffyVisual fliffy={listing.fliffy} />
    <p className="font-bold text-lg mt-2 text-center break-words w-full">
      {listing.fliffy.pattern.name} {listing.fliffy.color.name}
    </p>
    <p className={`${RARITY_DATA[listing.fliffy.rarity].color} font-semibold`}>
      {listing.fliffy.rarity}
    </p>
    <p className="text-fliffy-text-light text-sm mt-1">+${formatNumber(listing.fliffy.income)}/s</p>
    <div className="mt-4 w-full flex-grow flex flex-col justify-end">
      <p className="text-center font-bold text-lg text-fliffy-primary">
        ${formatNumber(listing.price)}
      </p>
      <button
        onClick={onBuy}
        disabled={!canAfford}
        className="mt-2 w-full bg-fliffy-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Buy
      </button>
    </div>
  </div>
);


// --- MAIN APP COMPONENT ---

export default function App() {
    const [fliffBucks, setFliffBucks] = useState(0);
    const [fluffPoints, setFluffPoints] = useState(0);
    const [rebirthCount, setRebirthCount] = useState(0);
    const [collectedFliffys, setCollectedFliffys] = useState<Fliffy[]>([]);
    const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES_DATA.map(u => ({...u})));
    const [rebirthUpgrades, setRebirthUpgrades] = useState<RebirthUpgrade[]>(REBIRTH_UPGRADES_DATA.map(ru => ({...ru})));
    const [unlockedLocations, setUnlockedLocations] = useState<string[]>(['meadow']);
    const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
    const [fliffyToSell, setFliffyToSell] = useState<Fliffy | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>('hunt');
    const [lastCaughtFliffy, setLastCaughtFliffy] = useState<Fliffy | null>(null);
    const [showRebirthModal, setShowRebirthModal] = useState(false);
    const [offlineEarnings, setOfflineEarnings] = useState<number | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [isMinigameAvailable, setIsMinigameAvailable] = useState(false);
    const [showMinigame, setShowMinigame] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    
    const SAVE_KEY = 'fliffyCollectorSave';

     // Feedback Message Timeout
    useEffect(() => {
        if (feedbackMessage) {
            const timer = setTimeout(() => setFeedbackMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

    // Close settings dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [settingsRef]);

    // Game Calculations
    const permanentIncomeMultiplier = useMemo(() => {
        const upgrade = rebirthUpgrades.find(ru => ru.id === RebirthUpgradeType.PermanentIncomeBoost);
        return 1 + (upgrade ? upgrade.level * 0.25 : 0);
    }, [rebirthUpgrades]);

    const incomePerSecond = useMemo(() => {
        const baseIncome = collectedFliffys.reduce((sum, fliffy) => sum + fliffy.income, 0);
        const upgradeMultiplier = 1 + (upgrades.find(u => u.id === UpgradeType.IncomeMultiplier)?.level ?? 0) * 0.1;
        return baseIncome * upgradeMultiplier * permanentIncomeMultiplier;
    }, [collectedFliffys, upgrades, permanentIncomeMultiplier]);

    const rebirthPointsToGain = useMemo(() => {
      const points = Math.floor(Math.log10(fliffBucks + 1) ** 2);
      const multiplier = 1 + (rebirthUpgrades.find(ru => ru.id === RebirthUpgradeType.FluffPointGain)?.level ?? 0) * 0.1;
      return Math.max(0, Math.floor(points * multiplier));
    }, [fliffBucks, rebirthUpgrades]);

    // Rebirth Requirements Calculation
    const currentRebirthRequirements = useMemo(() => {
        const rarityOrder: Rarity[] = [Rarity.Rare, Rarity.Epic, Rarity.Legendary];
        const requiredRarity = rarityOrder[Math.min(rebirthCount, rarityOrder.length - 1)];
        const fliffBucks = 1e6 * (100 ** rebirthCount);
        return { fliffBucks, rarity: requiredRarity };
    }, [rebirthCount]);
    
    const canRebirthChecks = useMemo(() => {
        const rarityOrder: Rarity[] = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Epic, Rarity.Legendary];
        const requiredRarityIndex = rarityOrder.indexOf(currentRebirthRequirements.rarity);
        
        const hasRequiredRarity = collectedFliffys.some(f => {
            const fliffyRarityIndex = rarityOrder.indexOf(f.rarity);
            return fliffyRarityIndex >= requiredRarityIndex;
        });

        const hasEnoughBucks = fliffBucks >= currentRebirthRequirements.fliffBucks;
        const willGainPoints = rebirthPointsToGain > 0;

        return {
            hasEnoughBucks,
            hasRequiredRarity,
            canRebirth: hasEnoughBucks && hasRequiredRarity && willGainPoints,
        };
    }, [fliffBucks, collectedFliffys, rebirthPointsToGain, currentRebirthRequirements]);

     // Load Game
    useEffect(() => {
        const savedDataString = localStorage.getItem(SAVE_KEY);
        if (savedDataString) {
            const savedData = JSON.parse(savedDataString);

            const loadedUpgrades = UPGRADES_DATA.map(u => ({
                ...u,
                level: savedData.upgradeLevels?.[u.id] ?? 0,
            }));
            const loadedRebirthUpgrades = REBIRTH_UPGRADES_DATA.map(ru => ({
                ...ru,
                level: savedData.rebirthUpgradeLevels?.[ru.id] ?? 0,
            }));
            const loadedFliffys = savedData.collectedFliffys || [];
            
            const lastSaveTime = savedData.lastSaveTime || Date.now();
            const offlineTimeInSeconds = (Date.now() - lastSaveTime) / 1000;
            
            const permMultiplier = 1 + (loadedRebirthUpgrades.find(ru => ru.id === RebirthUpgradeType.PermanentIncomeBoost)?.level ?? 0) * 0.25;
            const baseInc = loadedFliffys.reduce((sum, fliffy) => sum + fliffy.income, 0);
            const upgradeMult = 1 + (loadedUpgrades.find(u => u.id === UpgradeType.IncomeMultiplier)?.level ?? 0) * 0.1;
            const offlineIncomePerSecond = baseInc * upgradeMult * permMultiplier;
            const earnedOffline = Math.max(0, offlineIncomePerSecond * offlineTimeInSeconds);

            setFliffBucks((savedData.fliffBucks || 0) + earnedOffline);
            if (earnedOffline > 1) {
                setOfflineEarnings(earnedOffline);
            }

            setFluffPoints(savedData.fluffPoints || 0);
            setRebirthCount(savedData.rebirthCount || 0);
            setCollectedFliffys(loadedFliffys);
            setUpgrades(loadedUpgrades);
            setRebirthUpgrades(loadedRebirthUpgrades);
            setUnlockedLocations(savedData.unlockedLocations || ['meadow']);
        }
        setIsLoaded(true);
    }, []);

    // Save Game
    const saveGame = useCallback(() => {
        if (!isLoaded) return; 

        const upgradeLevels = upgrades.reduce((acc, upg) => ({ ...acc, [upg.id]: upg.level }), {} as Record<UpgradeType, number>);
        const rebirthUpgradeLevels = rebirthUpgrades.reduce((acc, upg) => ({ ...acc, [upg.id]: upg.level }), {} as Record<RebirthUpgradeType, number>);

        const saveData = {
            fliffBucks,
            fluffPoints,
            rebirthCount,
            collectedFliffys,
            unlockedLocations,
            upgradeLevels,
            rebirthUpgradeLevels,
            lastSaveTime: Date.now(),
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    }, [isLoaded, fliffBucks, fluffPoints, rebirthCount, collectedFliffys, unlockedLocations, upgrades, rebirthUpgrades]);

    // Autosave Effect
    useEffect(() => {
        const saveInterval = setInterval(saveGame, 5000);
        window.addEventListener('beforeunload', saveGame);
        return () => {
            clearInterval(saveInterval);
            window.removeEventListener('beforeunload', saveGame);
        };
    }, [saveGame]);


    // Game Loop
    useEffect(() => {
        if (!isLoaded) return;
        const timer = setInterval(() => {
            setFliffBucks(prev => prev + incomePerSecond / 10);
        }, 100);
        return () => clearInterval(timer);
    }, [incomePerSecond, isLoaded]);

    const generateRandomFliffy = useCallback((rarityOverride?: Rarity): Fliffy => {
        const rarityOrder: Rarity[] = [Rarity.Common, Rarity.Uncommon, Rarity.Rare, Rarity.Epic, Rarity.Legendary];
        const chosenRarity = rarityOverride ?? rarityOrder[Math.floor(Math.random() ** 2 * rarityOrder.length)];

        const possibleColors = FLIFFY_COLORS.filter(c => c.rarity === chosenRarity);
        const possiblePatterns = FLIFFY_PATTERNS.filter(p => p.rarity === chosenRarity);
        
        const chosenColor = possibleColors[Math.floor(Math.random() * possibleColors.length)] || FLIFFY_COLORS[0];
        const chosenPattern = possiblePatterns[Math.floor(Math.random() * possiblePatterns.length)] || FLIFFY_PATTERNS[0];
        
        const rarityValue = (RARITY_DATA[chosenColor.rarity].multiplier + RARITY_DATA[chosenPattern.rarity].multiplier) / 2;
        
        return {
            id: crypto.randomUUID(),
            color: chosenColor,
            pattern: chosenPattern,
            rarity: chosenRarity,
            income: (1 + Math.random()) * rarityValue,
        };
    }, []);

     // Market Simulation Effect
    useEffect(() => {
        const initialListings: TradeListing[] = [];
        for (let i = 0; i < 8; i++) {
            const fliffy = generateRandomFliffy();
            initialListings.push({
                listingId: crypto.randomUUID(),
                fliffy: fliffy,
                price: Math.floor(fliffy.income * (1000 + Math.random() * 2000))
            });
        }
        setTradeListings(initialListings);

        const marketInterval = setInterval(() => {
            setTradeListings(prev => {
                let newListings = [...prev];
                if (newListings.length > 15) { // Prevent list from getting too long
                     newListings.splice(Math.floor(Math.random() * newListings.length), 1);
                }
                const fliffy = generateRandomFliffy();
                newListings.push({
                    listingId: crypto.randomUUID(),
                    fliffy: fliffy,
                    price: Math.floor(fliffy.income * (1000 + Math.random() * 2000))
                });
                return newListings;
            });
        }, 20000); 

        return () => clearInterval(marketInterval);
    }, [generateRandomFliffy]);

    // Minigame availability timer
    useEffect(() => {
        const initialTimer = setTimeout(() => setIsMinigameAvailable(true), 30000); // 30 seconds for first time
        const recurringTimer = setInterval(() => {
            if (!showRebirthModal && !lastCaughtFliffy && !fliffyToSell && !offlineEarnings && !showMinigame) {
                setIsMinigameAvailable(true);
            }
        }, 180000); // 3 minutes
        return () => {
            clearTimeout(initialTimer);
            clearInterval(recurringTimer);
        };
    }, [showRebirthModal, lastCaughtFliffy, fliffyToSell, offlineEarnings, showMinigame]);


    // Game Actions
    const handleHunt = useCallback((location: HuntingLocation) => {
        const costReduction = 1 - (upgrades.find(u => u.id === UpgradeType.HuntCostReduction)?.level ?? 0) * 0.05;
        const finalCost = location.cost * costReduction;
        if (fliffBucks < finalCost) return;

        setFliffBucks(prev => prev - finalCost);
        if (!unlockedLocations.includes(location.id)) {
            setUnlockedLocations(prev => [...prev, location.id]);
        }
        
        const random = Math.random();
        let cumulativeChance = 0;
        const rarityBoost = (upgrades.find(u => u.id === UpgradeType.RareFliffyChance)?.level ?? 0) * 0.005;

        const rarityOrder: Rarity[] = [Rarity.Legendary, Rarity.Epic, Rarity.Rare, Rarity.Uncommon, Rarity.Common];
        let chosenRarity: Rarity = Rarity.Common;

        for (const rarity of rarityOrder) {
            const baseChance = location.rarityChances[rarity] ?? 0;
            const boost = rarity !== Rarity.Common ? rarityBoost / 4 : -rarityBoost;
            const finalChance = baseChance * (1 + boost);
            cumulativeChance += Math.max(0, finalChance);
            if (random < cumulativeChance) {
                chosenRarity = rarity;
                break;
            }
        }
        
        const newFliffy = generateRandomFliffy(chosenRarity);
        
        setCollectedFliffys(prev => [...prev, newFliffy]);
        setLastCaughtFliffy(newFliffy);
    }, [fliffBucks, upgrades, unlockedLocations, generateRandomFliffy]);

    const handleBuyUpgrade = (upgradeId: UpgradeType) => {
        const upgrade = upgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return;

        const cost = upgrade.baseCost * (upgrade.costMultiplier ** upgrade.level);
        if (fliffBucks < cost) return;

        setFliffBucks(prev => prev - cost);
        setUpgrades(prev => prev.map(u => u.id === upgradeId ? { ...u, level: u.level + 1 } : u));
    };

    const handleBuyRebirthUpgrade = (upgradeId: RebirthUpgradeType) => {
        const upgrade = rebirthUpgrades.find(ru => ru.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return;

        const cost = upgrade.baseCost * (upgrade.costMultiplier ** upgrade.level);
        if (fluffPoints < cost) return;

        setFluffPoints(prev => prev - cost);
        setRebirthUpgrades(prev => prev.map(ru => ru.id === upgradeId ? { ...ru, level: ru.level + 1 } : ru));
    };

    const handleRebirth = () => {
        if (!canRebirthChecks.canRebirth) return;

        setFluffPoints(prev => prev + rebirthPointsToGain);
        setRebirthCount(prev => prev + 1);
        
        const startingBucksUpgrade = rebirthUpgrades.find(ru => ru.id === RebirthUpgradeType.StartingFliffBucks);
        setFliffBucks(startingBucksUpgrade ? startingBucksUpgrade.level * 100 : 0);

        setCollectedFliffys([]);
        setUpgrades(UPGRADES_DATA.map(u => ({...u, level: 0})));
        setUnlockedLocations(['meadow']);
        setShowRebirthModal(false);
        setActiveTab('collection');
    };

    const handleListFliffyForSale = (price: number) => {
        if (!fliffyToSell || price <= 0) return;
        setCollectedFliffys(prev => prev.filter(f => f.id !== fliffyToSell.id));

        const newListing: TradeListing = {
            listingId: crypto.randomUUID(),
            fliffy: fliffyToSell,
            price: price,
        };
        setTradeListings(prev => [newListing, ...prev]);
        setFliffyToSell(null);
    };

    const handleBuyFliffy = (listingId: string) => {
        const listing = tradeListings.find(l => l.listingId === listingId);
        if (!listing || fliffBucks < listing.price) return;

        setFliffBucks(prev => prev - listing.price);
        setCollectedFliffys(prev => [...prev, listing.fliffy]);
        setTradeListings(prev => prev.filter(l => l.listingId !== listingId));
    };

    // Settings Actions
    const handleManualSave = () => {
        saveGame();
        setFeedbackMessage({ text: 'Game Saved!', type: 'success' });
        setShowSettings(false);
    };

    const handleExportSave = () => {
        const saveData = localStorage.getItem(SAVE_KEY);
        if (saveData) {
            navigator.clipboard.writeText(saveData);
            setFeedbackMessage({ text: 'Save data copied to clipboard!', type: 'success' });
        } else {
            setFeedbackMessage({ text: 'No save data found to export.', type: 'error' });
        }
        setShowSettings(false);
    };

    const handleImportSave = () => {
        const saveData = window.prompt("Paste your save data below:");
        if (saveData) {
            try {
                const parsed = JSON.parse(saveData);
                if (typeof parsed.fliffBucks !== 'number') throw new Error("Invalid data");
                
                localStorage.setItem(SAVE_KEY, saveData);
                setFeedbackMessage({ text: 'Save imported successfully! Reloading...', type: 'success' });
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                setFeedbackMessage({ text: 'Invalid save data!', type: 'error' });
            }
        }
        setShowSettings(false);
    };

    const handleWipeSave = () => {
        const confirmed = window.confirm("Are you sure you want to wipe all your progress? This cannot be undone!");
        if (confirmed) {
            localStorage.removeItem(SAVE_KEY);
            setFeedbackMessage({ text: 'Save data wiped! Reloading...', type: 'success' });
            setTimeout(() => window.location.reload(), 1000);
        }
        setShowSettings(false);
    };
    
    // Minigame handlers
    const handleStartMinigame = () => {
        if (!isMinigameAvailable) return;
        setShowMinigame(true);
        setIsMinigameAvailable(false);
    };

    const handleMinigameWin = (reward: number) => {
        setFliffBucks(prev => prev + reward);
        setFeedbackMessage({ text: `Minigame won! +${formatNumber(reward)}!`, type: 'success' });
        setShowMinigame(false);
    };

    const handleMinigameLose = (penalty: number) => {
        setFliffBucks(prev => Math.max(0, prev - penalty));
        setFeedbackMessage({ text: `Minigame lost! -${formatNumber(penalty)}.`, type: 'error' });
        setShowMinigame(false);
    };


    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-fliffy-bg">
                <p className="text-2xl font-bold text-fliffy-primary animate-pulse">Loading Your Fliffys...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col p-2 sm:p-4 lg:p-6">
            <header className="bg-fliffy-panel rounded-2xl shadow-lg p-4 mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-extrabold text-fliffy-primary">Fliffy Collector</h1>
                <div className="flex gap-4 items-center">
                    <div className="text-right bg-fliffy-bg-dark p-2 rounded-lg">
                        <p className="font-bold text-xl text-fliffy-text">{formatNumber(fliffBucks)}</p>
                        <p className="text-xs text-fliffy-text-light font-semibold">Fliff Bucks (+{formatNumber(incomePerSecond)}/s)</p>
                    </div>
                    <div className="text-right bg-fliffy-bg-dark p-2 rounded-lg">
                        <p className="font-bold text-xl text-fliffy-secondary">{formatNumber(fluffPoints)}</p>
                        <p className="text-xs text-fliffy-text-light font-semibold">Fluff Points</p>
                    </div>
                    {isMinigameAvailable && (
                        <button
                            onClick={handleStartMinigame}
                            className="bg-fliffy-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-transform hover:scale-105 animate-glow"
                        >
                            Minigame!
                        </button>
                    )}
                     <button 
                        onClick={() => setShowRebirthModal(true)}
                        disabled={!canRebirthChecks.canRebirth}
                        className="bg-fliffy-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Rebirth
                    </button>
                    <div ref={settingsRef} className="relative">
                        <button 
                            onClick={() => setShowSettings(prev => !prev)}
                            className="p-3 bg-fliffy-bg-dark rounded-lg hover:bg-fliffy-bg-dark/80 transition-colors"
                            aria-label="Settings"
                        >
                            <SettingsIcon />
                        </button>
                        {showSettings && (
                             <div className="absolute right-0 top-full mt-2 w-48 bg-fliffy-panel rounded-lg shadow-xl py-2 z-50 animate-fade-in">
                                <button onClick={handleManualSave} className="w-full text-left px-4 py-2 text-sm text-fliffy-text hover:bg-fliffy-bg-dark transition-colors">Save Game</button>
                                <button onClick={handleExportSave} className="w-full text-left px-4 py-2 text-sm text-fliffy-text hover:bg-fliffy-bg-dark transition-colors">Export Save</button>
                                <button onClick={handleImportSave} className="w-full text-left px-4 py-2 text-sm text-fliffy-text hover:bg-fliffy-bg-dark transition-colors">Import Save</button>
                                <div className="border-t my-1 border-fliffy-bg-dark"></div>
                                <button onClick={handleWipeSave} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 transition-colors">Wipe Save</button>
                             </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col">
                <div className="flex gap-1">
                    <TabButton tabId="collection" label="Collection" icon={<CollectionIcon />} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabId="hunt" label="Hunt" icon={<HuntIcon />} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabId="trading" label="Trading" icon={<TradeIcon />} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabId="upgrades" label="Upgrades" icon={<UpgradeIcon />} activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabId="rebirth" label="Rebirth" icon={<RebirthIcon />} activeTab={activeTab} onClick={setActiveTab} />
                </div>
                <div className="bg-fliffy-panel flex-grow p-4 sm:p-6 rounded-b-2xl rounded-tr-2xl shadow-lg">
                    {activeTab === 'collection' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {collectedFliffys.length > 0 ? (
                                collectedFliffys.map(fliffy => <FliffyCard key={fliffy.id} fliffy={fliffy} onSell={() => setFliffyToSell(fliffy)} />)
                            ) : (
                                <p className="col-span-full text-center text-fliffy-text-light py-10">Your collection is empty. Go hunt some Fliffys!</p>
                            )}
                        </div>
                    )}
                    {activeTab === 'hunt' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {HUNTING_LOCATIONS.map(loc => {
                                const costReduction = 1 - (upgrades.find(u => u.id === UpgradeType.HuntCostReduction)?.level ?? 0) * 0.05;
                                const finalCost = loc.cost * costReduction;
                                const canAfford = fliffBucks >= finalCost;
                                const isLocked = !unlockedLocations.includes(loc.id) && loc.cost > 0;
                                
                                return (
                                    <div key={loc.id} className={`bg-fliffy-bg-dark rounded-xl p-4 flex items-center justify-between shadow-md transition-all ${isLocked && !canAfford ? 'opacity-50' : ''}`}>
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">{loc.icon} {loc.name}</h3>
                                            <p className="text-fliffy-text-light">Cost: ${formatNumber(finalCost)}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleHunt(loc)}
                                            disabled={!canAfford}
                                            className="bg-fliffy-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {isLocked ? 'Unlock' : 'Hunt'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'trading' && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                             {tradeListings.length > 0 ? (
                                tradeListings.map(listing => <TradeCard key={listing.listingId} listing={listing} onBuy={() => handleBuyFliffy(listing.listingId)} canAfford={fliffBucks >= listing.price} />)
                             ) : (
                                <p className="col-span-full text-center text-fliffy-text-light py-10">The marketplace is currently empty. Check back later!</p>
                             )}
                         </div>
                    )}
                    {activeTab === 'upgrades' && (
                        <div className="space-y-4">
                            {upgrades.map(upg => (
                                <UpgradeCard 
                                    key={upg.id} 
                                    upgrade={upg} 
                                    onBuy={() => handleBuyUpgrade(upg.id)}
                                    currency={fliffBucks} 
                                    currencySymbol="$"
                                />
                            ))}
                        </div>
                    )}
                     {activeTab === 'rebirth' && (
                        <div className="space-y-4">
                            {rebirthUpgrades.map(rupg => (
                                <UpgradeCard 
                                    key={rupg.id} 
                                    upgrade={rupg} 
                                    onBuy={() => handleBuyRebirthUpgrade(rupg.id)}
                                    currency={fluffPoints} 
                                    currencySymbol="FP"
                                    isRebirth
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {feedbackMessage && (
                 <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-lg text-white font-bold animate-pop-in ${feedbackMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {feedbackMessage.text}
                 </div>
            )}

            <HuntModal fliffy={lastCaughtFliffy} onClose={() => setLastCaughtFliffy(null)} />
            {showRebirthModal && (
                <RebirthModal 
                    pointsToGain={rebirthPointsToGain} 
                    onConfirm={handleRebirth} 
                    onCancel={() => setShowRebirthModal(false)}
                    requirements={currentRebirthRequirements}
                    checks={canRebirthChecks}
                />
            )}
             <SellModal
                fliffy={fliffyToSell}
                onClose={() => setFliffyToSell(null)}
                onConfirm={handleListFliffyForSale}
            />
            {offlineEarnings && (
                <OfflineEarningsModal earnings={offlineEarnings} onClose={() => setOfflineEarnings(null)} />
            )}
            {showMinigame && (
                <MinigameModal
                    onWin={handleMinigameWin}
                    onLose={handleMinigameLose}
                    onClose={() => setShowMinigame(false)}
                    baseReward={incomePerSecond * 60}
                />
            )}
        </div>
    );
}

// ICONS
const CollectionIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>;
const HuntIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const UpgradeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>;
const RebirthIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.312 11.291l-2.032.017-3.483 3.483a1 1 0 01-1.414-1.414l3.483-3.483-2.05-2.05a1 1 0 011.414-1.414l2.05 2.05 3.483-3.483a1 1 0 011.414 1.414l-3.483 3.483 2.016.033a1 1 0 11-.033 2zM9.418 5.672a1 1 0 01-1.414-1.414l-3.483 3.483-2.016-.033a1 1 0 11.033-2l2.032-.017 3.483-3.483a1 1 0 011.414 1.414l-3.483 3.483 2.05 2.05a1 1 0 01-1.414 1.414l-2.05-2.05-3.483 3.483a1 1 0 11-1.414-1.414l3.483-3.483z" clipRule="evenodd" /></svg>;
const TradeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>;