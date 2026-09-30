import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { PokemonStore } from '../../state/pokemon.store';

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

  readonly state = toSignal(this.store.rawState$, {
    initialValue: {
      pokemonList: [],
      selectedPokemon: null,
      detailPanelPokemon: null,
      searchQuery: '',
      selectedType: null,
      isLoading: false,
      error: null
    }
  });

  readonly selectedPokemon = computed(() => this.state().detailPanelPokemon);

  readonly chartOption = computed<EChartsOption>(() => {
    const pokemon = this.selectedPokemon();
    if (!pokemon) return {};

    const mockStats = [
      { name: 'HP', value: Math.floor(Math.random() * 60) + 40 },
      { name: 'Attack', value: Math.floor(Math.random() * 80) + 40 },
      { name: 'Defense', value: Math.floor(Math.random() * 80) + 30 },
      { name: 'Sp. Atk', value: Math.floor(Math.random() * 90) + 50 },
      { name: 'Sp. Def', value: Math.floor(Math.random() * 80) + 40 },
      { name: 'Speed', value: Math.floor(Math.random() * 100) + 50 }
    ];

    return {
      radar: {
        indicator: mockStats.map(s => ({ name: s.name, max: 150 })),
        splitNumber: 4,
        axisName: { color: '#666' }
      },
      series: [{
        name: 'Stats',
        type: 'radar',
        data: [{
          value: mockStats.map(s => s.value),
          name: pokemon.name,
          areaStyle: { color: 'rgba(239, 83, 80, 0.4)' },
          lineStyle: { color: '#ef5350' },
          itemStyle: { color: '#ef5350' }
        }]
      }]
    };
  });

  closePanel(): void {
    this.store.openDetailPanel(null);
  }

  getAvatarUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }
}
