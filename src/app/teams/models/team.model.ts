export interface Team {
  id: number;
  trainer_id: number;
  name: string;
  pokemon_ids: number[];
  created_at?: string;
}

export interface Trainer {
  id: number;
  name: string;
  region: string;
  avatar_url?: string;
}
