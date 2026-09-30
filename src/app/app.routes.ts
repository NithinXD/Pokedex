import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'pokedex',
    loadComponent: () => import('./pokedex/components/pokemon-table/pokemon-table.component').then(m => m.PokemonTableComponent)
  },
  {
    path: 'teams',
    loadComponent: () => import('./teams/components/team-list/team-list.component').then(m => m.TeamListComponent)
  },
  { path: '', redirectTo: '/pokedex', pathMatch: 'full' }
];
