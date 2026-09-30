import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
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

  @ViewChild('listContainer') listContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('trackRef') trackRef!: ElementRef<HTMLDivElement>;

  thumbTop = 0;
  isDragging = false;

  readonly state = toSignal(this.store.rawState$, {
    initialValue: {
      pokemonList: [],
      selectedPokemon: null,
      detailPanelPokemon: null,
      searchQuery: '',
      selectedType: null,
      isLoading: true,
      error: null
    }
  });

  get activePokemon(): Pokemon | null {
    return this.state().selectedPokemon || this.state().pokemonList[0] || null;
  }

  retryLoad(): void {
    this.store.loadPokemonList();
  }

  selectPokemon(pokemon: Pokemon): void {
    this.store.selectPokemon(pokemon);
    // Sync scroll so the slider highlights the current selection correctly
    this.syncScrollToSelection(pokemon.id);
  }

  openStatsModal(pokemon: Pokemon, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.store.openDetailPanel(pokemon);
  }

  scrollUp(event: MouseEvent): void {
    event.stopPropagation();
    this.navigatePokemon(-1);
  }

  scrollDown(event: MouseEvent): void {
    event.stopPropagation();
    this.navigatePokemon(1);
  }

  private navigatePokemon(direction: number): void {
    const list = this.state().pokemonList;
    if (!list.length) return;

    const currentId = this.activePokemon?.id ?? list[0].id;
    const currentIndex = list.findIndex(p => p.id === currentId);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= list.length) nextIndex = list.length - 1;

    const targetPokemon = list[nextIndex];
    this.selectPokemon(targetPokemon);
    this.scrollToPokemonRow(targetPokemon.id);
  }

  updateScrollThumb(): void {
    const el = this.listContainer?.nativeElement;
    if (!el) return;

    // 1. Update Scrollbar Thumb Position smoothly with scroll
    const scrollableHeight = el.scrollHeight - el.clientHeight;
    const scrollRatio = scrollableHeight > 0 ? el.scrollTop / scrollableHeight : 0;
    
    if (scrollableHeight > 0) {
      const trackHeight = this.trackRef?.nativeElement ? this.trackRef.nativeElement.clientHeight - 44 : 460;
      this.thumbTop = Math.min(trackHeight, Math.max(0, scrollRatio * trackHeight));
    }

    // 2. Auto Select current row in view
    const list = this.state().pokemonList;
    if (!list.length || this.isDragging) return;

    // Proportional selection: Maps scroll exactly from 0 to list.length - 1
    // This allows first and last items to be selected without any extra padding.
    const index = Math.round(scrollRatio * (list.length - 1));
    const closestPokemon = list[index];

    if (closestPokemon && closestPokemon.id !== this.activePokemon?.id) {
      this.store.selectPokemon(closestPokemon);
    }
  }

  startDrag(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      this.handleScrollbarMove(e.clientY);
    };

    const onMouseUp = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onScrollbarTrackClick(event: MouseEvent): void {
    if (this.isDragging) return;
    this.handleScrollbarMove(event.clientY);
  }

  private handleScrollbarMove(clientY: number): void {
    const el = this.listContainer?.nativeElement;
    const track = this.trackRef?.nativeElement;
    if (!el || !track) return;

    const rect = track.getBoundingClientRect();
    const offsetY = clientY - rect.top;
    const ratio = Math.max(0, Math.min(1, offsetY / rect.height));

    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  }

  private scrollToPokemonRow(id: number): void {
    this.syncScrollToSelection(id);
  }

  private syncScrollToSelection(id: number): void {
    const el = this.listContainer?.nativeElement;
    if (!el) return;

    const list = this.state().pokemonList;
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return;

    const scrollableHeight = el.scrollHeight - el.clientHeight;
    if (scrollableHeight > 0) {
      const ratio = index / (list.length - 1);
      el.scrollTo({ top: ratio * scrollableHeight, behavior: 'smooth' });
    }
  }

  get2dSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
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
