import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { PokedexApiService } from '../services/pokedex-graphql.service';
import { Pokemon } from '../models/pokemon.model';

export interface PokemonState {
  pokemonList: Pokemon[];
  selectedPokemon: Pokemon | null;
  detailPanelPokemon: Pokemon | null;
  searchQuery: string;
  selectedType: string | null;
  sortBy: 'id' | 'name';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
}

const initialState: PokemonState = {
  pokemonList: [],
  selectedPokemon: null,
  detailPanelPokemon: null,
  searchQuery: '',
  selectedType: null,
  sortBy: 'id',
  sortOrder: 'asc',
  isLoading: false,
  error: null
};

@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly apiService = inject(PokedexApiService);
  private readonly state$ = new BehaviorSubject<PokemonState>(initialState);

  readonly rawState$: Observable<PokemonState> = this.state$.asObservable();

  constructor() {
    this.loadPokemonList();
  }

  /**
   * Fetches Pokémon list from PokéAPI GraphQL endpoint.
   */
  loadPokemonList(): void {
    this.patchState({ isLoading: true, error: null });

    this.apiService.getPokemonList$().pipe(
      tap((data) => this.patchState({ pokemonList: data, isLoading: false })),
      catchError((err: Error) => {
        this.patchState({
          error: err.message || 'Failed to load Pokémon data.',
          isLoading: false
        });
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Sets search query in store state.
   */
  setSearchQuery(query: string): void {
    this.patchState({ searchQuery: query });
  }

  /**
   * Sets type filter.
   */
  setTypeFilter(type: string | null): void {
    this.patchState({ selectedType: type });
  }

  /**
   * Sets sorting criteria.
   */
  setSortBy(sortBy: 'id' | 'name'): void {
    this.patchState({ sortBy });
  }

  /**
   * Toggles or sets sort order.
   */
  setSortOrder(sortOrder: 'asc' | 'desc'): void {
    this.patchState({ sortOrder });
  }

  /**
   * Highlights a single Pokémon in the Pokédex list view (without opening side panel).
   */
  selectPokemon(pokemon: Pokemon | null): void {
    this.patchState({ selectedPokemon: pokemon });
  }

  /**
   * Explicitly opens/closes the side-panel base stats radar chart modal.
   */
  openDetailPanel(pokemon: Pokemon | null): void {
    this.patchState({ detailPanelPokemon: pokemon });
  }

  private patchState(partial: Partial<PokemonState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}
