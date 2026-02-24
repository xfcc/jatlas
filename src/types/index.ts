export enum Status {
  Active = 'Active',
  Retired = 'Retired',
}

export enum Tier {
  Infinite = 'Infinite',
  Premium = 'Premium',
  Impression = 'Impression',
  Honor = 'Honor',
  Fame = 'Fame',
  Classic = 'Classic',
  Archive = 'Archive',
  Opus = 'Opus',
}

export type Actress = {
  id: number;
  name: string;
  status: Status;
  tier: Tier;
  video_count: number;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};
