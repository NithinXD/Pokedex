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
        pokemon_v2_pokemon(limit: 151) {
          id
          name
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
            }
          }
        }
      }
    `;

    return this.http.post<any>(this.URL, { query }).pipe(
      map(response => response.data.pokemon_v2_pokemon.map((p: any) => ({
        id: p.id,
        name: p.name,
        types: p.pokemon_v2_pokemontypes.map((t: any) => t.pokemon_v2_type.name)
      })))
    );
  }
}
