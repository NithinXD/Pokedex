import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeamListComponent {

}
