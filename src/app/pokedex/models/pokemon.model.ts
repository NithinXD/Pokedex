export interface Pokemon {
  id: number;
  name: string;
  types?: string[];
  stats?: { name: string; value: number }[];
  abilities?: string[];
  description?: string;
}
