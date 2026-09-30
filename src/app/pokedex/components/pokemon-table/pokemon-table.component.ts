import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
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

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule, PokemonDetailComponent, DragDropModule, TeamDockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss'
})
export class PokemonTableComponent {
  readonly store = inject(PokemonStore);
  readonly teamStore = inject(TeamStore);

  readonly state = toSignal(this.store.rawState$, { requireSync: true });

  readonly pokemonList = toSignal(PokemonSelectors.selectFilteredPokemon(this.store), { initialValue: [] });

  readonly skeletonRows = Array(8).fill(0);
  
  readonly pokemonTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

  readonly localTeams = signal<{name: string, pokemon: (Pokemon | undefined)[]}[]>([
    { name: 'Team 1', pokemon: new Array(6).fill(undefined) }
  ]);
  readonly activeTeamIndex = signal<number>(0);
  
  readonly allTeamNames = computed(() => this.localTeams().map(t => t.name));
  readonly teamName = computed(() => this.localTeams()[this.activeTeamIndex()].name);
  readonly dockedTeam = computed(() => this.localTeams()[this.activeTeamIndex()].pokemon);

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

  onCreateTeam(): void {
    const name = prompt('Enter new team name:');
    if (name) {
      const teams = [...this.localTeams()];
      teams.push({ name, pokemon: new Array(6).fill(undefined) });
      this.localTeams.set(teams);
      this.activeTeamIndex.set(teams.length - 1);
    }
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

  selectPokemon(pokemon: Pokemon): void {
    this.store.selectPokemon(pokemon);
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
    this.store.setSortBy(select.value as 'id' | 'name');
  }
  
  onOrderChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.setSortOrder(select.value as 'asc' | 'desc');
  }

  openStatsModal(pokemon: Pokemon, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.store.openDetailPanel(pokemon);
  }

  getPokemonDescription(name: string): string {
    const descriptions: Record<string, string> = {
      bulbasaur: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this POKÉMON.',
      ivysaur: 'When the bulb on its back grows large, it appears to lose the ability to stand on its hind legs.',
      venusaur: 'The plant blooms when it absorbs solar energy. It stays on the move to seek sunlight.',
      charmander: 'Obviously prefers hot places. When it rains, steam is said to spout from the tip of its tail.',
      charmeleon: 'It lashes its tail to knock down its foe. It then tears up the fallen opponent with sharp claws.',
      charizard: 'It spits fire that is hot enough to melt boulders. Known to cause forest fires unintentionally.',
      squirtle: 'After birth, its back swells and hardens into a shell. Powerfully sprays foam from its mouth.',
      wartortle: 'It is recognized as a symbol of longevity. If its shell has algae on it, that WARTORTLE is very old.',
      blastoise: 'It spouts jets of water from the rocket cannons on its shell. They can punch through thick steel.'
    };

    const key = name.toLowerCase();
    return descriptions[key] || `A wild ${name.toUpperCase()} native to the Kanto region. Click "View Radar Chart" below to open base stats.`;
  }
}
