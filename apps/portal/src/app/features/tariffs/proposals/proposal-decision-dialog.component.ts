import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** What the decision dialog asks: approving needs no comment, rejecting does. */
export interface ProposalDecisionData {
  decision: 'approve' | 'reject';
  name: string;
}

/** The Owner's decision on a proposed tariff change. Closes with the comment, or undefined. */
@Component({
  selector: 'ww-proposal-decision-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.decision === 'approve' ? 'Approve' : 'Reject' }} the change to {{ data.name }}?
    </h2>
    <mat-dialog-content>
      <p>
        {{
          data.decision === 'approve'
            ? 'The new prices apply to sessions that start from now on, in your name.'
            : 'Nothing changes. Tell Wattwisely why, so it can propose something better.'
        }}
      </p>
      <mat-form-field appearance="outline" class="field">
        <mat-label>{{ data.decision === 'approve' ? 'Comment (optional)' : 'Why not' }}</mat-label>
        <textarea
          matInput
          [formControl]="comment"
          rows="3"
          data-testid="decision-comment"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Back</button>
      <button
        mat-flat-button
        [disabled]="comment.invalid"
        (click)="dialogRef.close(comment.value.trim())"
        data-testid="confirm"
      >
        {{ data.decision === 'approve' ? 'Approve' : 'Reject' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      display: block;
      width: 100%;
    }
  `,
})
export class ProposalDecisionDialogComponent {
  protected readonly data = inject<ProposalDecisionData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject(MatDialogRef<ProposalDecisionDialogComponent>);
  protected readonly comment = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.maxLength(1000),
      ...(this.data.decision === 'reject' ? [Validators.required] : []),
    ],
  });
}
