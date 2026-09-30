import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, debounceTime, first, map } from 'rxjs/operators';
import { TeamStore } from '../../state/team.store';
import { PokemonStore } from '../../../pokedex/state/pokemon.store';
import { Pokemon } from '../../../pokedex/models/pokemon.model';

export function uniqueTeamNameValidator(teamStore: TeamStore): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);
    return timer(300).pipe(
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

  readonly formClosed = output<void>();

  readonly form = this.fb.group({
    name: ['', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(30)],
      asyncValidators: [uniqueTeamNameValidator(this.teamStore)],
      updateOn: 'change'
    }],
    pokemonSearch: ['']
  });

  selectedPokemon: Pokemon[] = [];
  searchResults: Pokemon[] = [];

  constructor() {
    this.form.get('pokemonSearch')?.valueChanges.pipe(
      debounceTime(300),
      switchMap(q => {
        if (!q || q.trim() === '') {
          return of([]);
        }
        return this.pokemonStore.rawState$.pipe(
          map(state => {
            const allPokes = state.pokemonList;
            const lowerQ = q.toLowerCase().trim();
            return allPokes.filter((p: Pokemon) => p.name.toLowerCase().includes(lowerQ) || p.id.toString() === lowerQ).slice(0, 5);
          }),
          first()
        );
      })
    ).subscribe((results: Pokemon[]) => {
      this.searchResults = results;
    });
  }

  get nameControl() { return this.form.get('name'); }

  get2dSpriteUrl(id: number): string {
    return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + id + '".png"';
  }

  selectPokemon(p: Pokemon) {
    if (this.selectedPokemon.length >= 6) return;
    this.selectedPokemon.push(p);
    this.form.get('pokemonSearch')?.setValue('', { emitEvent: false });
    this.searchResults = [];
    this.form.markAsDirty();
  }

  removePokemon(index: number) {
    this.selectedPokemon.splice(index, 1);
    this.form.markAsDirty();
  }

  onSubmit() {
    if (this.form.invalid || this.selectedPokemon.length < 1 || this.selectedPokemon.length > 6) {
      this.form.markAllAsTouched();
      return;
    }
    const teamName = this.form.get('name')?.value || '';
    
    // Copy the selected pokemon array and get their IDs, pad it to length 6 with 0 or null if required
    const pokes = [...this.selectedPokemon];
    const pokemon_ids = pokes.map(p => p.id);

    this.teamStore.addTeamOptimistic({ trainer_id: 1, name: teamName, pokemon_ids });
    this.formClosed.emit();
  }
}
