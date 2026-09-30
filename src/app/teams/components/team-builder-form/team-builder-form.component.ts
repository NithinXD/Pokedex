import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap, debounceTime, first, map, tap, catchError } from 'rxjs/operators';
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

  isSearchLoading = false;
  searchError: string | null = null;
  hasSearched = false;

  constructor() {
    this.form.get('pokemonSearch')?.valueChanges.pipe(
      tap(() => {
        this.isSearchLoading = true;
        this.searchError = null;
        this.hasSearched = false;
        this.searchResults = [];
      }),
      debounceTime(300),
      switchMap((q: string | null | undefined) => {
        if (!q || q.trim() === '') {
          this.isSearchLoading = false;
          return of([]);
        }
        
        // Simulating a network delay and potential error for resilience testing
        return timer(500).pipe(
          switchMap(() => {
            // Simulated 10% chance to fail for error state resilience test
            if (Math.random() < 0.1) {
              throw new Error('Network error');
            }
            return this.pokemonStore.rawState$.pipe(
              map(state => {
                const allPokes = state.pokemonList;
                const lowerQ = q.toLowerCase().trim();
                const sortBy = state.sortBy;
                const sortOrder = state.sortOrder;

                return allPokes
                  .filter((p: Pokemon) => p.name.toLowerCase().includes(lowerQ) || p.id.toString() === lowerQ)
                  .sort((a: Pokemon, b: Pokemon) => {
                    const aStarts = a.name.toLowerCase().startsWith(lowerQ) || a.id.toString() === lowerQ ? 0 : 1;
                    const bStarts = b.name.toLowerCase().startsWith(lowerQ) || b.id.toString() === lowerQ ? 0 : 1;
                    if (aStarts !== bStarts) return aStarts - bStarts;
                    
                    let res = 0;
                    if (sortBy === 'name') {
                      res = a.name.localeCompare(b.name);
                    } else {
                      res = a.id - b.id;
                    }
                    return sortOrder === 'desc' ? -res : res;
                  })
                  .slice(0, 5);
              }),
              first()
            );
          }),
          catchError((err: any) => {
            this.searchError = 'Failed to load results. Please try again.';
            return of([] as Pokemon[]);
          })
        );
      })
    ).subscribe((results: any) => {
      this.searchResults = results as Pokemon[];
      this.isSearchLoading = false;
      this.hasSearched = true;
    });
  }

  retrySearch(): void {
    const currentVal = this.form.get('pokemonSearch')?.value;
    if (currentVal) {
        this.form.get('pokemonSearch')?.setValue(currentVal);
    }
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
