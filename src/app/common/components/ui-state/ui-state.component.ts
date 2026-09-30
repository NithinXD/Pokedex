import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="ui-state__loading">
        <ng-content select="[loading]"></ng-content>
        @if (!hasCustomLoading) {
          <div class="shimmer-placeholder">Loading data...</div>
        }
      </div>
    } @else if (error()) {
      <div class="ui-state__error">
        <p class="error-text">{{ error() }}</p>
        <button type="button" class="btn-retry" (click)="retry.emit()">Retry</button>
      </div>
    } @else if (isEmpty()) {
      <div class="ui-state__empty">
        <p>{{ emptyMessage() || 'No data found.' }}</p>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `
})
export class UiStateComponent {
  // Signal Inputs & Outputs (No @Input / @Output)
  readonly isLoading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly isEmpty = input<boolean>(false);
  readonly emptyMessage = input<string>('');

  readonly retry = output<void>();
  
  hasCustomLoading = false;
}
