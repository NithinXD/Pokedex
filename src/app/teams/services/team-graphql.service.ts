import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  createTeamMutation$(team: Omit<Team, 'id'>): Observable<Team> {
    return of({ ...team, id: Date.now() });
  }
}
