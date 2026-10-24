import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AccessGroup, AccessGroupInput } from '../../core/api/models/driver';

/** The access group dialog's fields, and how they turn into the API's body (story AST-04). */
export class AccessGroupForm {
  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    siteIds: new FormControl<string[]>([], { nonNullable: true }),
    driverIds: new FormControl<string[]>([], { nonNullable: true }),
  });

  static from(group: AccessGroup): AccessGroupForm {
    const form = new AccessGroupForm();
    form.fields.setValue({
      name: group.name,
      description: group.description,
      siteIds: group.sites.map((site) => site.id),
      driverIds: group.members.map((member) => member.id),
    });
    return form;
  }

  isValid(): boolean {
    return this.fields.valid;
  }

  toInput(): AccessGroupInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      site_ids: value.siteIds,
      driver_ids: value.driverIds,
    };
  }
}
