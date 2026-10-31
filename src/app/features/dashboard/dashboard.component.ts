import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http/error-message';
import { MEDICAL_CATEGORY_ID } from '../../shared/constants';
import { DocumentService } from '../../core/services/document.service';
import { UiService } from '../../core/services/ui.service';
import { DashboardSummary } from '../../shared/models/models';
import { InitialsPipe } from '../../shared/initials.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [InitialsPipe, RouterLink, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly docs = inject(DocumentService);
  private readonly ui = inject(UiService);

  readonly medicalId = MEDICAL_CATEGORY_ID;
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loadError = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set('');
    this.docs.summary().subscribe({
      next: s => this.summary.set(s),
      // Spinner ki jagah error + Retry
      error: err => this.loadError.set(errorMessage(err)),
    });
  }
}
