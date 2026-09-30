import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PokemonStore } from '../../state/pokemon.store';
import { UiStateComponent } from '../../../common/components/ui-state/ui-state.component';
import { Pokemon } from '../../models/pokemon.model';
import { PokemonDetailComponent } from '../pokemon-detail/pokemon-detail.component';

@Component({
  selector: 'app-pokemon-table',
  standalone: true,
  imports: [CommonModule, UiStateComponent, PokemonDetailComponent],
  templateUrl: './pokemon-table.component.html',
  styleUrl: './pokemon-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonTableComponent {
  private readonly store = inject(PokemonStore);

  // Convert RxJS state to a Signal
  readonly state = toSignal(this.store.rawState$, {
    initialValue: {
      pokemonList: [],
      selectedPokemon: null,
      searchQuery: '',
      selectedType: null,
      isLoading: true,
      error: null
    }
  });

  retryLoad(): void {
    this.store.loadPokemonList();
  }

  selectPokemon(pokemon: Pokemon): void {
    this.store.selectPokemon(pokemon);
  }

  getAvatarUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}
