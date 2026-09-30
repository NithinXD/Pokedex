import { Injectable, inject, DestroyRef } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PokedexApiService } from '../services/pokedex-graphql.service';
import { Pokemon } from '../models/pokemon.model';

export interface PokemonState {
  pokemonList: Pokemon[];
  selectedPokemon: Pokemon | null;
  detailPanelPokemon: Pokemon | null;
  searchQuery: string;
  selectedType: string | null;
  sortBy: 'id' | 'name' | 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'total';
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
  private readonly destroyRef = inject(DestroyRef);
  
  private readonly state$ = new BehaviorSubject<PokemonState>(initialState);
  private readonly searchSubject = new Subject<string>();

  readonly rawState$: Observable<PokemonState> = this.state$.asObservable();

  constructor() {
    this.initSearchPipeline();
    this.loadPokemonList();
  }

  private initSearchPipeline(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        // Simulating an async search filter pipeline using switchMap as requested
        this.patchState({ searchQuery: query });
        return of(query);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  loadPokemonList(): void {
    this.patchState({ isLoading: true, error: null });

    this.apiService.getPokemonList$().pipe(
      tap((data) => this.patchState({ pokemonList: data, isLoading: false })),
      catchError(() => {
        this.patchState({
          error: 'NO SIGNAL — CHECK YOUR CONNECTION',
          isLoading: false
        });
        return of([]);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  setSearchQuery(query: string): void {
    this.searchSubject.next(query);
  }

  setTypeFilter(type: string | null): void {
    this.patchState({ selectedType: type });
  }

  setSortBy(sortBy: 'id' | 'name' | 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'total'): void {
    this.patchState({ sortBy });
  }

  setSortOrder(sortOrder: 'asc' | 'desc'): void {
    this.patchState({ sortOrder });
  }

  selectPokemon(pokemon: Pokemon | null): void {
    this.patchState({ selectedPokemon: pokemon });
  }

  openDetailPanel(pokemon: Pokemon | null): void {
    if (!pokemon) {
      this.patchState({ detailPanelPokemon: null });
      return;
    }
    
    this.apiService.getPokemonById$(pokemon.id).pipe(
      tap((detailedPokemon) => {
        this.patchState({ detailPanelPokemon: detailedPokemon });
      }),
      catchError((err: Error) => {
        alert('Failed to load PokAcmon details. Please check your connection.');
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private patchState(partial: Partial<PokemonState>): void {
    this.state$.next({ ...this.state$.getValue(), ...partial });
  }
}


