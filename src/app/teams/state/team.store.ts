import { Injectable, inject, DestroyRef, effect } from '@angular/core';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TeamApiService } from '../services/team-graphql.service';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly teams$ = new BehaviorSubject<Team[]>([]);
  private readonly activeTeam$ = new BehaviorSubject<Team | null>(null);
  private readonly activeTeamSignal = toSignal(this.activeTeam$);

  readonly allTeams$ = this.teams$.asObservable();
  readonly currentTeam$ = this.activeTeam$.asObservable();

  constructor() {
    this.loadTeams();

    effect(() => {
      const current = this.activeTeamSignal();
      if (current) {
        localStorage.setItem('pokedex_selected_team_id', current.id.toString());
      }
    });
  }

  setActiveTeam(team: Team): void {
    this.activeTeam$.next(team);
  }

  loadTeams(): void {
    this.api.getTeams$().pipe(
      tap(teams => {
        this.teams$.next(teams);
        if (teams.length > 0 && !this.activeTeam$.getValue()) {
          const savedId = localStorage.getItem('pokedex_selected_team_id');
          const found = savedId ? teams.find(t => t.id.toString() === savedId) : null;
          this.activeTeam$.next(found || teams[0]);
        }
      }),
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef)
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
        alert(`Connection lost. Could not save your team. Please check your network and try saving again.`);
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  deleteTeamOptimistic(id: number): void {
    const previousSnapshot = this.teams$.getValue();
    const previousActive = this.activeTeam$.getValue();

    // 1. Optimistic UI update
    const updated = previousSnapshot.filter(t => t.id !== id);
    this.teams$.next(updated);
    if (previousActive?.id === id) {
      this.activeTeam$.next(updated[0] || null);
    }

    // 2. Perform backend mutation
    this.api.deleteTeamMutation$(id).pipe(
      catchError(err => {
        // Rollback
        this.teams$.next(previousSnapshot);
        this.activeTeam$.next(previousActive);
        alert('Failed to delete team.');
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }
}
