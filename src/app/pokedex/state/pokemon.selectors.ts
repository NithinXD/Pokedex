import { map, distinctUntilChanged, shareReplay } from 'rxjs';
import { PokemonStore } from './pokemon.store';

export class PokemonSelectors {
  static selectFilteredPokemon(store: PokemonStore) {
    return store.rawState$.pipe(
      map(state => {
        const { pokemonList, searchQuery, selectedType, sortBy, sortOrder } = state;

        return pokemonList
          // 1. Search Filter
          .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || p.id.toString().includes(searchQuery.trim()))
          // 2. Type Filter
          .filter(p => !selectedType || (p.types && p.types.includes(selectedType)))
          // 3. Sorting Logic
          .sort((a, b) => {
            const query = searchQuery ? searchQuery.toLowerCase().trim() : '';
            if (query) {
              const aStarts = a.name.toLowerCase().startsWith(query) || a.id.toString() === query ? 0 : 1;
              const bStarts = b.name.toLowerCase().startsWith(query) || b.id.toString() === query ? 0 : 1;
              if (aStarts !== bStarts) return aStarts - bStarts;
            }

            let res = 0;
            if (sortBy === 'name') {
              res = a.name.localeCompare(b.name);
            } else if (sortBy === 'id') {
              res = a.id - b.id;
            }
            return sortOrder === 'desc' ? -res : res;
          });
      }),
      distinctUntilChanged(),
      shareReplay(1) // Avoid duplicate computations across template subscribers
    );
  }
}
