import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/** What the prompt asks for. With `mustEqual`, the answer has to match it exactly (e.g. a slug). */
export interface PromptDialogData {
  title: string;
  message: string;
  label: string;
  confirmLabel: string;
  mustEqual?: string;
}

/** Asks for one line of text, such as a reason, before a change. Closes with the text. */
@Component({
  selector: 'ww-prompt-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="ww-lead">{{ data.message }}</p>
      <div class="ww-form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>{{ data.label }}</mat-label>
          <input
            matInput
            [class.mono]="data.mustEqual"
            [formControl]="answer"
            (keyup.enter)="isAcceptable() && dialogRef.close(answer.value.trim())"
            data-testid="prompt-answer"
          />
          @if (data.mustEqual) {
            <mat-hint>Type {{ data.mustEqual }}</mat-hint>
          }
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="!isAcceptable()"
        [mat-dialog-close]="answer.value.trim()"
        data-testid="prompt-confirm"
      >
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class PromptDialogComponent {
  protected readonly data = inject<PromptDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject<MatDialogRef<PromptDialogComponent, string>>(MatDialogRef);
  protected readonly answer = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });

  protected isAcceptable(): boolean {
    const text = this.answer.value.trim();
    return this.data.mustEqual ? text === this.data.mustEqual : text.length > 0;
  }
}
