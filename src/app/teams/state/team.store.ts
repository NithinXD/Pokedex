import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';
import { TeamApiService } from '../services/team-graphql.service';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly teams$ = new BehaviorSubject<Team[]>([]);
  private readonly activeTeam$ = new BehaviorSubject<Team | null>(null);

  readonly allTeams$ = this.teams$.asObservable();
  readonly currentTeam$ = this.activeTeam$.asObservable();

  constructor() {
    this.loadTeams();
  }

  loadTeams(): void {
    this.api.getTeams$().pipe(
      tap(teams => {
        this.teams$.next(teams);
        if (teams.length > 0 && !this.activeTeam$.getValue()) {
          this.activeTeam$.next(teams[0]);
        }
      }),
      catchError(() => of([]))
    ).subscribe();
  }

  /**
   * Optimistically adds a new team, rolling back state if local server fails.
   */
  addTeamOptimistic(newTeam: Omit<Team, 'id'>): void {
    const previousSnapshot = this.teams$.getValue();
    const tempId = Date.now();
    const tempTeamEntry: Team = { ...newTeam, id: tempId };

    // 1. Optimistic UI update
    this.teams$.next([...previousSnapshot, tempTeamEntry]);
    this.activeTeam$.next(tempTeamEntry);

    // 2. Perform backend mutation on port 4000
    this.api.createTeamMutation$(newTeam).pipe(
      tap(persisted => {
        const updated = this.teams$.getValue().map(t => t.id === tempId ? persisted : t);
        this.teams$.next(updated);
        this.activeTeam$.next(persisted);
      }),
      catchError(err => {
        // 3. Rollback on failure
        this.teams$.next(previousSnapshot);
        this.activeTeam$.next(previousSnapshot[0] || null);
        alert(`Failed to persist team: ${err.message}. Changes rolled back.`);
        return of(null);
      })
    ).subscribe();
  }
}
