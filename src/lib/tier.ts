import { Tier } from '@/types';

export const tierLimits: Record<Tier, number | null> = {
  [Tier.Infinite]: null,
  [Tier.Premium]: 50,
  [Tier.Impression]: 12,
  [Tier.Honor]: null,
  [Tier.Fame]: 50,
  [Tier.Classic]: 25,
  [Tier.Archive]: 12,
  [Tier.Opus]: 3,
};

export function isOverloaded(tier: Tier, videoCount: number): boolean {
  const limit = tierLimits[tier];
  return limit !== null && videoCount > limit;
}
