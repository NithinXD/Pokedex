import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { PokemonStore } from '../../state/pokemon.store';
import { PokemonSelectors } from '../../state/pokemon.selectors';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonDetailComponent {
  private readonly store = inject(PokemonStore);

  readonly state = toSignal(this.store.rawState$, { requireSync: true });

  /** Full sorted+filtered list — same order the right panel uses */
  readonly sortedList = toSignal(
    PokemonSelectors.selectFilteredPokemon(this.store),
    { initialValue: [] as Pokemon[] }
  );

  readonly selectedPokemon = computed(() => this.state().detailPanelPokemon);
  readonly isLoading = computed(() => this.state().isDetailLoading);
  readonly error = computed(() => this.state().detailError);

  retryDetail(): void {
    const current = this.state().selectedPokemon;
    if (current) {
        this.store.retryDetailPanel(current);
    }
  }

  /** Index of current pokemon in the sorted list */
  readonly currentIndex = computed(() => {
    const p = this.selectedPokemon();
    if (!p) return -1;
    return this.sortedList().findIndex(x => x.id === p.id);
  });

  readonly prevPokemon = computed<Pokemon | null>(() => {
    const i = this.currentIndex();
    if (i <= 0) return null;
    return this.sortedList()[i - 1] ?? null;
  });

  readonly nextPokemon = computed<Pokemon | null>(() => {
    const list = this.sortedList();
    const i = this.currentIndex();
    if (i === -1 || i >= list.length - 1) return null;
    return list[i + 1] ?? null;
  });

  readonly chartOption = computed<EChartsOption>(() => {
    const pokemon = this.selectedPokemon();
    if (!pokemon) return {};

    const stats = pokemon.stats || [];

    return {
      animationDurationUpdate: 300,
      radar: {
        indicator: stats.map((s: any) => ({ name: s.name.toUpperCase(), max: 255 })),
        splitNumber: 4,
        axisName: { color: '#888', fontSize: 10 }
      },
      series: [{
        name: 'Stats',
        type: 'radar',
        data: [{
          value: stats.map((s: any) => s.value),
          name: 'Base Stats',
          areaStyle: { color: 'rgba(220, 10, 45, 0.25)' },
          lineStyle: { color: '#dc0a2d' },
          itemStyle: { color: '#dc0a2d' }
        }]
      }]
    };
  });

  navigate(pokemon: Pokemon | null): void {
    if (!pokemon) return;
    this.store.openDetailPanel(pokemon);
    this.store.selectPokemon(pokemon);
  }

  closePanel(): void {
    this.store.openDetailPanel(null);
  }

  getAvatarUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
}
