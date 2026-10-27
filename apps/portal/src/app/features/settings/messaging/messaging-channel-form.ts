import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MessagingChannel, MessagingChannelInput } from '../../../core/api/models/messaging';

/** The WhatsApp channel's fields and how they turn into the API's body (module 17). */
export class MessagingChannelForm {
  readonly fields = new FormGroup({
    phone_number_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/), Validators.maxLength(50)],
    }),
    display_phone_number: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(30)],
    }),
    access_token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    greeting: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
    is_active: new FormControl(true, { nonNullable: true }),
  });

  /** Starts from the saved channel; the token itself is never shown, so its field starts empty. */
  static of(channel: MessagingChannel): MessagingChannelForm {
    const form = new MessagingChannelForm();
    form.fields.setValue({
      phone_number_id: channel.phone_number_id,
      display_phone_number: channel.display_phone_number,
      access_token: '',
      greeting: channel.greeting,
      is_active: channel.is_active,
    });
    return form;
  }

  isValid(): boolean {
    return this.fields.valid;
  }

  /** `keepToken` leaves the stored token alone when the field was left empty. */
  toInput(keepToken: boolean): MessagingChannelInput {
    const value = this.fields.getRawValue();
    const token = value.access_token.trim();
    return {
      phone_number_id: value.phone_number_id.trim(),
      display_phone_number: value.display_phone_number.trim(),
      ...(token || !keepToken ? { access_token: token } : {}),
      greeting: value.greeting.trim(),
      is_active: value.is_active,
    };
  }
}
