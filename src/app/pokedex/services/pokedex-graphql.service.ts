import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Pokemon } from '../models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokedexApiService {
  getPokemonList$(): Observable<Pokemon[]> {
    return of([]);
  }
}
