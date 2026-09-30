import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokemonStore, PokemonState } from '../../state/pokemon.store';
import { Pokemon } from '../../models/pokemon.model';
import { PokemonSelectors } from '../../state/pokemon.selectors';
import { PokemonDetailComponent } from '../pokemon-detail/pokemon-detail.component';

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule, PokemonDetailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss'
})
export class PokemonTableComponent {
  readonly store = inject(PokemonStore);

  readonly state = toSignal(this.store.rawState$, { requireSync: true });

  readonly pokemonList = toSignal(PokemonSelectors.selectFilteredPokemon(this.store), { initialValue: [] });

  readonly skeletonRows = Array(8).fill(0);
  
  readonly pokemonTypes = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

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
