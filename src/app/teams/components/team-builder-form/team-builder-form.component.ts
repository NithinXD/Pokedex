import { ChangeDetectionStrategy, Component, inject, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, first } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeamStore } from '../../state/team.store';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { Pokemon } from '../../../pokedex/models/pokemon.model';

export function uniqueTeamNameValidator(teamStore: TeamStore): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);
    return timer(200).pipe(
      switchMap(() => {
        const name = control.value.trim().toLowerCase();
        let exists = false;
        teamStore.allTeams$.pipe(first()).subscribe(teams => {
          exists = teams.some(t => t.name.toLowerCase() === name);
        });
        return exists ? of({ unique: true }) : of(null);
      }),
      first()
    );
  };
}

@Component({
  selector: 'app-team-builder-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team-builder-form.component.html',
  styleUrl: './team-builder-form.component.scss'
})
export class TeamBuilderFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly teamStore = inject(TeamStore);
  readonly pokemonStore = inject(PokemonStore);

  readonly teamCreated = output<{ name: string, starter: Pokemon }>();
  readonly formClosed = output<void>();

  readonly state = toSignal(this.pokemonStore.rawState$);

  readonly form = this.fb.group({
    name: ['', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(30)],
      asyncValidators: [uniqueTeamNameValidator(this.teamStore)],
      updateOn: 'change'
    }],
    pokemonSearch: ['']
  });

  selectedStarter: Pokemon | null = null;
  readonly searchInput = signal<string>('');

  // Uses the exact same instant filtering logic as the Pokedex filter search
  readonly searchResults = computed(() => {
    const q = this.searchInput().toLowerCase().trim();
    if (!q) return [];

    const allPokes = this.state()?.pokemonList || [];
    const sortBy = this.state()?.sortBy || 'id';
    const sortOrder = this.state()?.sortOrder || 'asc';

    return allPokes
      .filter((p: Pokemon) => p.name.toLowerCase().includes(q) || p.id.toString() === q)
      .sort((a: Pokemon, b: Pokemon) => {
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
      })
      .slice(0, 10);
  });

  readonly loadedImages = signal<Set<number>>(new Set<number>());

  isImageLoaded(id: number): boolean {
    return this.loadedImages().has(id);
  }

  markImageLoaded(id: number): void {
    if (!this.loadedImages().has(id)) {
      this.loadedImages.update(set => {
        const next = new Set(set);
        next.add(id);
        return next;
      });
    }
  }

  onImageError(event: Event, id: number): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/substitute.png';
    this.markImageLoaded(id);
  }

  getPokeballPlaceholderUrl(): string {
    return 'assets/pokeball.png';
  }

  get nameControl() {
    return this.form.get('name');
  }

  get2dSpriteUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchInput.set(val);
  }

  selectStarter(p: Pokemon): void {
    this.selectedStarter = p;
    this.searchInput.set('');
    this.form.get('pokemonSearch')?.setValue('', { emitEvent: false });
    this.form.markAsDirty();
  }

  removeStarter(): void {
    this.selectedStarter = null;
    this.form.markAsDirty();
  }

  onSubmit(): void {
    if (this.form.invalid || !this.selectedStarter) {
      this.form.markAllAsTouched();
      return;
    }
    const teamName = this.form.get('name')?.value || '';
    const starter = this.selectedStarter;
    const pokemon_ids = [starter.id];

    this.teamStore.addTeamOptimistic({ trainer_id: 1, name: teamName, pokemon_ids });
    this.teamCreated.emit({ name: teamName, starter });
    this.formClosed.emit();
  }
}
