import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Pokemon } from '../models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokedexApiService {
  private readonly http = inject(HttpClient);
  private readonly URL = 'https://beta.pokeapi.co/graphql/v1beta';

  getPokemonList$(): Observable<Pokemon[]> {
    const query = `
      query GetPokemonList {
        pokemon_v2_pokemon(limit: 50) {
          id
          name
        }
      }
    `;

    return this.http.post<any>(this.URL, { query }).pipe(
      map(response => response.data.pokemon_v2_pokemon.map((p: any) => ({
        id: p.id,
        name: p.name
      })))
    );
  }
}
