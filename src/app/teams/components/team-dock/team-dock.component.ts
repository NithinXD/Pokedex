import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

  readonly removePokemon = output<number>();
  readonly saveTeam = output<void>();
  readonly dropPokemon = output<{ pokemon: Pokemon, index: number }>();
  readonly renameTeam = output<string>(); // Used for actual rename if we pass string, but let's change to openRenameModal
  readonly openRenameModal = output<void>();
  readonly selectTeam = output<string>();
  readonly createTeam = output<void>();
  readonly nextTeam = output<void>();
  readonly prevTeam = output<void>();
  readonly openTeamList = output<void>();
  readonly openSearch = output<number>();

  // Fixed 6-slot array for dock layout
  readonly slots = [0, 1, 2, 3, 4, 5];

  onTeamSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectTeam.emit(select.value);
  }

  editTeamName(): void {
    this.openRenameModal.emit();
  }

  onDrop(event: CdkDragDrop<any>, index: number): void {
    if (event.previousContainer !== event.container) {
      const pokemon = event.item.data as Pokemon;
      this.dropPokemon.emit({ pokemon, index });
    }
  }

  getSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }
}
