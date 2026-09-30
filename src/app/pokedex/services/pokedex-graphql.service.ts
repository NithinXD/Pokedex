import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, retry, timer } from 'rxjs';
import { Pokemon } from '../models/pokemon.model';

@Injectable({ providedIn: 'root' })
export class PokedexApiService {
  private readonly http = inject(HttpClient);
  private readonly URL = 'https://beta.pokeapi.co/graphql/v1beta';

  getPokemonList$(limit: number = 151, offset: number = 0): Observable<Pokemon[]> {
    const query = `
      query GetPokemonList($limit: Int!, $offset: Int!) {
        pokemon_v2_pokemon(limit: $limit, offset: $offset) {
          id
          name
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
            }
          }
          pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat { name }
          }
          pokemon_v2_pokemonabilities {
            pokemon_v2_ability { name }
          }
          pokemon_v2_pokemonspecy {
            pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: 9}}, limit: 1) {
              flavor_text
            }
          }
        }
      }
    `;

    return this.http.post<any>(this.URL, { 
      query,
      variables: { limit, offset }
    }).pipe(
      retry({ count: 3, delay: (err, retryCount) => timer(1000 * retryCount) }),
      map(response => response.data.pokemon_v2_pokemon.map((p: any) => ({
        id: p.id,
        name: p.name,
        types: p.pokemon_v2_pokemontypes.map((t: any) => t.pokemon_v2_type.name),
        stats: p.pokemon_v2_pokemonstats?.map((s: any) => ({
          name: s.pokemon_v2_stat.name,
          value: s.base_stat
        })),
        abilities: p.pokemon_v2_pokemonabilities?.map((a: any) => a.pokemon_v2_ability.name),
        description: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts?.[0]?.flavor_text?.replace(/[\n\f\r]/g, ' ')
      })))
    );
  }

  getPokemonById$(id: number): Observable<Pokemon> {
    const query = `
      query GetPokemonById($id: Int!) {
        pokemon_v2_pokemon_by_pk(id: $id) {
          id
          name
          pokemon_v2_pokemontypes {
            pokemon_v2_type { name }
          }
          pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat { name }
          }
          pokemon_v2_pokemonabilities {
            pokemon_v2_ability { name }
          }
          pokemon_v2_pokemonspecy {
            pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: 9}}, limit: 1) {
              flavor_text
            }
          }
        }
      }
    `;

    return this.http.post<any>(this.URL, { 
      query,
      variables: { id }
    }).pipe(
      retry({ count: 3, delay: (err, retryCount) => timer(1000 * retryCount) }),
      map(response => {
        const p = response.data.pokemon_v2_pokemon_by_pk;
        return {
          id: p.id,
          name: p.name,
          types: p.pokemon_v2_pokemontypes.map((t: any) => t.pokemon_v2_type.name),
          stats: p.pokemon_v2_pokemonstats.map((s: any) => ({
            name: s.pokemon_v2_stat.name,
            value: s.base_stat
          })),
          abilities: p.pokemon_v2_pokemonabilities.map((a: any) => a.pokemon_v2_ability.name),
          description: p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesflavortexts?.[0]?.flavor_text?.replace(/[\n\f\r]/g, ' ')
        };
      })
    );
  }
}
