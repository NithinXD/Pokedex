import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { Team, Trainer } from '../models/team.model';

const LOCAL_URL = 'http://localhost:4000';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);

  getTrainers$(): Observable<Trainer[]> {
    const query = `
      query GetTrainers {
        allTrainers { id name region avatar_url }
      }
    `;
    return this.http.post<any>(LOCAL_URL, { query }).pipe(
      map(res => res.data.allTrainers)
    );
  }

  getTeams$(): Observable<Team[]> {
    const query = `
      query GetTeams {
        allTeams { id trainer_id name pokemon_ids created_at }
      }
    `;
    return this.http.post<any>(LOCAL_URL, { query }).pipe(
      map(res => res.data.allTeams)
    );
  }

  checkTeamNameExists$(name: string): Observable<boolean> {
    return this.getTeams$().pipe(
      map(teams => teams.some(t => t.name.toLowerCase() === name.trim().toLowerCase()))
    );
  }

  createTeamMutation$(team: Omit<Team, 'id'>): Observable<Team> {
    const mutation = `
      mutation CreateTeam($name: String!, $trainer_id: Int!, $pokemon_ids: [Int!]!) {
        createTeam(name: $name, trainer_id: $trainer_id, pokemon_ids: $pokemon_ids) {
          id name trainer_id pokemon_ids created_at
        }
      }
    `;
    return this.http.post<any>(LOCAL_URL, {
      query: mutation,
      variables: {
        name: team.name,
        trainer_id: team.trainer_id,
        pokemon_ids: team.pokemon_ids
      }
    }).pipe(
      map(res => {
        if (res.errors) throw new Error(res.errors[0]?.message || 'Failed to save team');
        return res.data.createTeam;
      })
    );
  }

  deleteTeamMutation$(id: number): Observable<boolean> {
    const mutation = `
      mutation RemoveTeam($id: ID!) {
        removeTeam(id: $id) {
          id
        }
      }
    `;
    return this.http.post<any>(LOCAL_URL, {
      query: mutation,
      variables: { id }
    }).pipe(
      map(res => {
        if (res.errors) throw new Error(res.errors[0]?.message || 'Failed to delete team');
        return true;
      })
    );
  }
}
