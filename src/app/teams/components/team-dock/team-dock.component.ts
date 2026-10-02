import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-team-dock',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-dock.component.html',
  styleUrl: './team-dock.component.scss'
})
export class TeamDockComponent {
  // Signals API
  readonly selectedTeamName = input<string>('Team 1');
  readonly allTeamNames = input<string[]>([]);
  readonly teamPokemon = input<(Pokemon | undefined)[]>([]); // Max 6
  readonly teamTotalBaseStats = input<number>(0);
  readonly teamsLoading = input<boolean>(false);
  readonly teamsError = input<string | null>(null);

  readonly removePokemon = output<number>();
  readonly saveTeam = output<void>();
  readonly dropPokemon = output<{ pokemon: Pokemon, index: number }>();
  readonly renameTeam = output<string>();
  readonly openRenameModal = output<void>();
  readonly selectTeam = output<string>();
  readonly createTeam = output<void>();
  readonly deleteTeam = output<void>();
  readonly nextTeam = output<void>();
  readonly prevTeam = output<void>();
  readonly openTeamList = output<void>();
  readonly openSearch = output<number>();

  // Fixed 6-slot array for dock layout
  readonly slots = [0, 1, 2, 3, 4, 5];

  readonly activeSlotHover = signal<number | null>(null);

  onDragEntered(index: number): void {
    this.activeSlotHover.set(index);
  }

  onDragExited(index: number): void {
    if (this.activeSlotHover() === index) {
      this.activeSlotHover.set(null);
    }
  }

  onSlotMouseEnter(index: number): void {
    if (!this.teamPokemon()[index]) {
      this.activeSlotHover.set(index);
    }
  }

  onSlotMouseLeave(index: number): void {
    if (this.activeSlotHover() === index) {
      this.activeSlotHover.set(null);
    }
  }

  isSlotActiveHover(index: number): boolean {
    return this.activeSlotHover() === index;
  }

  onTeamSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectTeam.emit(select.value);
  }

  editTeamName(): void {
    this.openRenameModal.emit();
  }

  onDrop(event: CdkDragDrop<any>, index: number): void {
    this.activeSlotHover.set(null);
    if (event.previousContainer !== event.container) {
      const pokemon = event.item.data as Pokemon;
      this.dropPokemon.emit({ pokemon, index });
    }
  }

  getSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}
