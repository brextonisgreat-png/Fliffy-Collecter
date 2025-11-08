// Fix: Import `ReactElement` to resolve JSX type error.
import type { ReactElement } from 'react';

export enum Rarity {
  Common = 'Common',
  Uncommon = 'Uncommon',
  Rare = 'Rare',
  Epic = 'Epic',
  Legendary = 'Legendary',
}

export interface FliffyColor {
  name: string;
  hex: string;
  rarity: Rarity;
}

export interface FliffyPattern {
  name: string;
  id: string;
  rarity: Rarity;
}

export interface Fliffy {
  id: string;
  color: FliffyColor;
  pattern: FliffyPattern;
  rarity: Rarity;
  income: number;
}

export interface HuntingLocation {
  id: string;
  name: string;
  cost: number;
  rarityChances: Record<Rarity, number>;
  // Fix: Use `ReactElement` instead of `JSX.Element`.
  icon: ReactElement;
}

export enum UpgradeType {
  IncomeMultiplier = 'INCOME_MULTIPLIER',
  HuntCostReduction = 'HUNT_COST_REDUCTION',
  RareFliffyChance = 'RARE_FLIFFY_CHANCE',
}

export interface Upgrade {
  id: UpgradeType;
  name: string;
  description: string;
  baseCost: number;
  level: number;
  maxLevel: number;
  costMultiplier: number;
}

export enum RebirthUpgradeType {
  PermanentIncomeBoost = 'PERMANENT_INCOME_BOOST',
  StartingFliffBucks = 'STARTING_FLIFF_BUCKS',
  FluffPointGain = 'FLUFF_POINT_GAIN',
}

export interface RebirthUpgrade {
  id: RebirthUpgradeType;
  name: string;
  description: string;
  baseCost: number;
  level: number;
  maxLevel: number;
  costMultiplier: number;
}

export interface TradeListing {
  listingId: string;
  fliffy: Fliffy;
  price: number;
}

export type ActiveTab = 'collection' | 'hunt' | 'upgrades' | 'rebirth' | 'trading';