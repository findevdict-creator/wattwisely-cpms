import { MessagingChannel } from '../../../core/api/models/messaging';
import { MessagingChannelForm } from './messaging-channel-form';

describe('MessagingChannelForm', () => {
  const channel: MessagingChannel = {
    provider: 'whatsapp',
    phone_number_id: '106540352242922',
    display_phone_number: '+44 7700 900123',
    has_access_token: true,
    is_platform_token_configured: false,
    greeting: 'Hi from Acme!',
    is_active: true,
    webhook_url: 'https://api.example.com/v1/public/messaging/whatsapp',
    version: 3,
    updated_at: null,
  };

  it('needs the number id as digits and a number drivers can read', () => {
    const form = new MessagingChannelForm();
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ phone_number_id: 'abc', display_phone_number: '+44 7700 900123' });
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ phone_number_id: '106' });
    expect(form.isValid()).toBe(true);
  });

  it('keeps the stored token when the field is left empty, and replaces it when filled', () => {
    const form = MessagingChannelForm.of(channel);
    expect(form.fields.getRawValue().access_token).toBe('');
    expect(form.toInput(true)).toEqual({
      phone_number_id: '106540352242922',
      display_phone_number: '+44 7700 900123',
      greeting: 'Hi from Acme!',
      is_active: true,
    });
    form.fields.patchValue({ access_token: ' EAAB… ' });
    expect(form.toInput(true).access_token).toBe('EAAB…');
    expect(new MessagingChannelForm().toInput(false).access_token).toBe('');
  });
});
