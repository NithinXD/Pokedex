import { ChangeDetectionStrategy, Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokemonStore, PokemonState } from '../../state/pokemon.store';
import { Pokemon } from '../../models/pokemon.model';
import { PokemonSelectors } from '../../state/pokemon.selectors';
import { PokemonDetailComponent } from '../pokemon-detail/pokemon-detail.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TeamDockComponent } from '../../../teams/components/team-dock/team-dock.component';
import { TeamStore } from '../../../teams/state/team.store';
import { TeamBuilderFormComponent } from '../../../teams/components/team-builder-form/team-builder-form.component';
import { AudioService } from '../../../common/services/audio.service';

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule, PokemonDetailComponent, DragDropModule, TeamDockComponent, TeamBuilderFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss'
})
export class PokemonTableComponent {
  readonly store = inject(PokemonStore);
  readonly teamStore = inject(TeamStore);
  private readonly audioService = inject(AudioService);

  readonly state = toSignal(this.store.rawState$, { requireSync: true });

  readonly pokemonList = toSignal(PokemonSelectors.selectFilteredPokemon(this.store), { initialValue: [] });

  readonly skeletonRows = Array(8).fill(0);
  
  readonly pokemonTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

  /** True when the inline stats panel is visible (right screen) */
  readonly detailPanelOpen = computed(() => !!this.state().detailPanelPokemon);

  readonly localTeams = signal<{name: string, pokemon: (Pokemon | undefined)[]}[]>([
    { name: 'Team 1', pokemon: new Array(6).fill(undefined) }
  ]);
  readonly activeTeamIndex = signal<number>(0);

  readonly viewMode = signal<'dex' | 'grid' | 'table'>('dex');
  readonly pageSize = signal<number>(50);
  readonly currentPage = signal<number>(1);
  readonly paginatedPokemonList = computed(() => {
    const list = this.pokemonList();
    if (this.viewMode() === 'dex') return list;
    const size = this.pageSize();
    const page = this.currentPage();
    return list.slice((page - 1) * size, page * size);
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.pokemonList().length / this.pageSize())));
  
  readonly activeModal = signal<'search' | 'teamList' | 'createTeam' | 'renameTeam' | null>(null);
  readonly activeSlotForSearch = signal<number | null>(null);
  readonly modalInput = signal<string>('');
  readonly modalSearchQuery = signal<string>('');

  readonly allTeamNames = computed(() => this.localTeams().map(t => t.name));
  readonly teamName = computed(() => this.localTeams()[this.activeTeamIndex()].name);
  readonly dockedTeam = computed(() => this.localTeams()[this.activeTeamIndex()].pokemon);

  // Derived signal calculating the total base stats of the active team
  readonly teamTotalBaseStats = computed(() => {
    const pokes = this.dockedTeam();
    return pokes.reduce((total, p) => {
      if (!p || !p.stats) return total;
      return total + p.stats.reduce((sum, stat) => sum + stat.value, 0);
    }, 0);
  });

  readonly modalFilteredPokemon = computed(() => {
    const q = this.modalSearchQuery().toLowerCase().trim();
    const allPokes = this.state().pokemonList;
    if (!q) return allPokes;
    
    const sortBy = this.state().sortBy;
    const sortOrder = this.state().sortOrder;

    return allPokes
      .filter(p => p.name.toLowerCase().includes(q) || p.id.toString() === q)
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q) || a.id.toString() === q ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) || b.id.toString() === q ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        
        let res = 0;
        if (sortBy === 'name') {
          res = a.name.localeCompare(b.name);
        } else {
          res = a.id - b.id;
        }
        return sortOrder === 'desc' ? -res : res;
      });
  });

  constructor() {
    // 1. Initialize from localStorage
    const savedIndex = localStorage.getItem('activeTeamIndex');
    const savedTeams = localStorage.getItem('localTeams');
    if (savedTeams) {
      try {
        this.localTeams.set(JSON.parse(savedTeams));
        if (savedIndex) this.activeTeamIndex.set(Number(savedIndex));
      } catch(e) {}
    }

    // 2. effect() to persist state reactively to localStorage
    effect(() => {
      localStorage.setItem('localTeams', JSON.stringify(this.localTeams()));
      localStorage.setItem('activeTeamIndex', this.activeTeamIndex().toString());
    });
  }

  onDropPokemon(event: { pokemon: Pokemon, index: number }): void {
    const teams = [...this.localTeams()];
    const currentTeam = { ...teams[this.activeTeamIndex()] };
    const currentPokes = [...currentTeam.pokemon];
    currentPokes[event.index] = event.pokemon;
    currentTeam.pokemon = currentPokes;
    teams[this.activeTeamIndex()] = currentTeam;
    this.localTeams.set(teams);
  }

  removePokemon(index: number): void {
    const teams = [...this.localTeams()];
    const currentTeam = { ...teams[this.activeTeamIndex()] };
    const currentPokes = [...currentTeam.pokemon];
    currentPokes[index] = undefined;
    currentTeam.pokemon = currentPokes;
    teams[this.activeTeamIndex()] = currentTeam;
    this.localTeams.set(teams);
  }

  retryLoad(): void {
    this.store.loadPokemonList();
  }

  onSelectTeam(name: string): void {
    const idx = this.localTeams().findIndex(t => t.name === name);
    if (idx !== -1) {
      this.activeTeamIndex.set(idx);
    }
  }

  onRenameTeam(name: string): void {
    const teams = [...this.localTeams()];
    const currentTeam = { ...teams[this.activeTeamIndex()] };
    currentTeam.name = name;
    teams[this.activeTeamIndex()] = currentTeam;
    this.localTeams.set(teams);
  }

  openSearchModal(slotIndex: number): void {
    this.activeSlotForSearch.set(slotIndex);
    this.modalSearchQuery.set('');
    this.activeModal.set('search');
  }

  openTeamListModal(): void {
    this.activeModal.set('teamList');
  }

  openCreateTeamModal(): void {
    this.modalInput.set('');
    this.activeModal.set('createTeam');
  }

  openRenameTeamModal(): void {
    this.modalInput.set(this.teamName());
    this.activeModal.set('renameTeam');
  }

  closeModal(): void {
    this.activeModal.set(null);
    this.activeSlotForSearch.set(null);
  }

  submitModalInput(): void {
    const val = this.modalInput().trim();
    if (!val) return;
    if (this.activeModal() === 'createTeam') {
      const teams = [...this.localTeams()];
      teams.push({ name: val, pokemon: new Array(6).fill(undefined) });
      this.localTeams.set(teams);
      this.activeTeamIndex.set(teams.length - 1);
    } else if (this.activeModal() === 'renameTeam') {
      this.onRenameTeam(val);
    }
    this.closeModal();
  }

  selectPokemonForSlot(pokemon: Pokemon): void {
    const slot = this.activeSlotForSearch();
    if (slot !== null) {
      this.onDropPokemon({ pokemon, index: slot });
    }
    this.closeModal();
  }

  removePokemonFromSlot(): void {
    const slot = this.activeSlotForSearch();
    if (slot !== null) {
      this.removePokemon(slot);
    }
    this.closeModal();
  }
  
  selectTeamFromModal(name: string): void {
    this.onSelectTeam(name);
    this.closeModal();
  }

  onNextTeam(): void {
    const current = this.activeTeamIndex();
    if (current < this.localTeams().length - 1) {
      this.activeTeamIndex.set(current + 1);
    }
  }

  onPrevTeam(): void {
    const current = this.activeTeamIndex();
    if (current > 0) {
      this.activeTeamIndex.set(current - 1);
    }
  }

  onAddTeam(): void {
    // Save current active team to the actual backend store
    const active = this.localTeams()[this.activeTeamIndex()];
    this.teamStore.addTeamOptimistic({
      name: active.name,
      trainer_id: 1,
      pokemon_ids: active.pokemon.filter(p => !!p).map(p => p!.id)
    });
    // Clear local dock
    const teams = [...this.localTeams()];
    teams[this.activeTeamIndex()] = { name: active.name, pokemon: new Array(6).fill(undefined) };
    this.localTeams.set(teams);
  }

  get activePokemon(): Pokemon | null {
    return this.state().selectedPokemon || this.pokemonList()[0] || null;
  }

  get prevPokemon(): Pokemon | null {
    const list = this.pokemonList();
    const current = this.activePokemon;
    if (!current) return null;
    const index = list.findIndex(p => p.id === current.id);
    return index > 0 ? list[index - 1] : null;
  }

  get nextPokemon(): Pokemon | null {
    const list = this.pokemonList();
    const current = this.activePokemon;
    if (!current) return null;
    const index = list.findIndex(p => p.id === current.id);
    return index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  }

  navigate(pokemon: Pokemon | null): void {
    if (!pokemon) return;
    this.selectPokemon(pokemon);
    // If stats panel is open, keep it showing the newly selected pokemon
    if (this.detailPanelOpen()) {
      this.store.openDetailPanel(pokemon);
    }
  }

  selectPokemon(pokemon: Pokemon): void {
    this.store.selectPokemon(pokemon);
    this.audioService.playCry(pokemon.id);
  }

  trackById(_index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }
  
  get2dSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  getGlitchSpriteUrl(): string {
    // MissingNo substitute sprite
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/substitute.png`;
  }
  
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setSearchQuery(input.value);
  }
  
  onTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setTypeFilter(select.value || null);
  }
  
  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setSortBy(select.value as any);
  }
  
  setViewMode(mode: 'dex' | 'grid' | 'table'): void { this.viewMode.set(mode); this.currentPage.set(1); }
  setPageSize(event: Event): void { const s = (event.target as HTMLSelectElement).value; this.pageSize.set(Number(s)); this.currentPage.set(1); }
  nextPage(): void { if (this.currentPage() < this.totalPages()) this.currentPage.set(this.currentPage() + 1); }
  prevPage(): void { if (this.currentPage() > 1) this.currentPage.set(this.currentPage() - 1); }
  getStat(p: Pokemon, name: string): number { return p.stats?.find(s => s.name === name)?.value || 0; }
  getBST(p: Pokemon): number { return p.stats?.reduce((sum, s) => sum + s.value, 0) || 0; }

  onOrderChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setSortOrder(select.value as 'asc' | 'desc');
  }

  openStatsModal(pokemon: Pokemon, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    // Toggle: if same pokemon already open, close it; otherwise open it
    const current = this.state().detailPanelPokemon;
    this.store.openDetailPanel(current?.id === pokemon.id ? null : pokemon);
  }

  getPokemonDescription(pokemon: Pokemon | null): string {
    if (!pokemon) return 'NO POK&#201;MON SELECTED';
    if (pokemon.description) return pokemon.description;
    return `A wild ${pokemon.name.toUpperCase()} native to the Kanto region. Click the "STATS" button above to view base stats.`;
  }
}



