import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, first, map, switchMap } from 'rxjs';
import { TeamApiService } from '../services/team-graphql.service';

export function uniqueTeamNameValidator(apiService: TeamApiService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return new Observable(obs => obs.next(null));

    return control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(name => apiService.checkTeamNameExists$(name)),
      map(exists => (exists ? { nameTaken: true } : null)),
      first()
    );
  };
}
