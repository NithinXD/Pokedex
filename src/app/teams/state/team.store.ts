import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';
import { TeamApiService } from '../services/team-graphql.service';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly teamApi = inject(TeamApiService);
  private readonly teams$ = new BehaviorSubject<Team[]>([]);

  readonly allTeams$ = this.teams$.asObservable();

  /**
   * Optimistically creates a new team and handles rollbacks on error.
   * @param newTeam Payload for new team creation
   */
  createTeamOptimistic(newTeam: Omit<Team, 'id'>): void {
    const previousSnapshot = this.teams$.getValue();
    const temporaryId = Date.now();
    const optimisticEntry: Team = { ...newTeam, id: temporaryId };

    // 1. Immediate local UI update
    this.teams$.next([...previousSnapshot, optimisticEntry]);

    // 2. Perform server mutation
    this.teamApi.createTeamMutation$(newTeam).pipe(
      tap((persistedTeam) => {
        // Swap temporary record with official server record
        const updated = this.teams$.getValue().map(t =>
          t.id === temporaryId ? persistedTeam : t
        );
        this.teams$.next(updated);
      }),
      catchError((error: Error) => {
        // 3. Revert state snapshot on mutation failure
        this.teams$.next(previousSnapshot);
        this.notifyUser(`Mutation failed: ${error.message}. State rolled back.`);
        return of(null);
      })
    ).subscribe();
  }

  private notifyUser(message: string): void {
    // Show toast or UI error message
    console.error(message);
  }
}
