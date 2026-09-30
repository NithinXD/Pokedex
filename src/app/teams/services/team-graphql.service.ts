import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);
  private readonly URL = 'http://localhost:4000';

  createTeamMutation$(team: Omit<Team, 'id'>): Observable<Team> {
    const query = `
      mutation CreateTeam($name: String!, $trainer_id: Int!, $pokemon_ids: [Int]!, $created_at: String!) {
        createTeam(name: $name, trainer_id: $trainer_id, pokemon_ids: $pokemon_ids, created_at: $created_at) {
          id
          name
          trainer_id
          pokemon_ids
          created_at
        }
      }
    `;

    return this.http.post<any>(this.URL, { 
      query,
      variables: team
    }).pipe(
      map(response => response.data.createTeam)
    );
  }
}
