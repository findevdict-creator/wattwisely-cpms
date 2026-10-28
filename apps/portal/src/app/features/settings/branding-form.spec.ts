import { Branding } from '../../core/api/models/branding';
import { BrandingForm } from './branding-form';

describe('BrandingForm', () => {
  const saved: Branding = {
    display_name: 'Acme Go',
    primary_color: '#fff176',
    accent_color: null,
    support_email: 'help@acme.test',
    support_phone: null,
    support_url: null,
    logo_content_type: null,
    logo_size_bytes: null,
    logo_url: null,
    preview: {
      name: 'Acme Go',
      logo_url: null,
      primary_color: '#fff176',
      on_primary_color: '#0f172a',
      accent_color: '#0f172a',
      support_email: 'help@acme.test',
      support_phone: null,
      support_url: null,
      platform_name: 'Wattwisely',
    },
    updated_at: null,
    version: 2,
  };

  it('loads what is saved and sends every field back, empty ones as null', () => {
    const form = BrandingForm.from(saved);

    expect(form.fields.value).toMatchObject({ displayName: 'Acme Go', accentColor: '' });
    form.fields.patchValue({ displayName: ' ', primaryColor: 'FF6F00', supportUrl: '' });
    expect(form.isValid()).toBe(true);
    expect(form.toRequest()).toEqual({
      display_name: null,
      primary_color: '#ff6f00',
      accent_color: null,
      support_email: 'help@acme.test',
      support_phone: null,
      support_url: null,
    });
  });

  it('refuses what the API would refuse', () => {
    const form = new BrandingForm();

    form.fields.patchValue({ primaryColor: 'green' });
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ primaryColor: '', supportEmail: 'nope' });
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ supportEmail: '', supportUrl: 'acme.test/help' });
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({
      supportUrl: 'https://acme.test/help',
      supportPhone: '+44 20 7946 0000',
    });
    expect(form.isValid()).toBe(true);
  });

  it('shows what drivers would see while someone types', () => {
    const form = BrandingForm.from(saved);
    form.fields.patchValue({ displayName: '', primaryColor: '102030', accentColor: '' });

    expect(form.preview(saved.preview, 'Acme Charging')).toEqual({
      ...saved.preview,
      name: 'Acme Charging',
      primary_color: '#102030',
      on_primary_color: '#ffffff',
      accent_color: '#0f172a',
    });
  });

  it('keeps white text on the platform teal when the colour is cleared', () => {
    const form = BrandingForm.from(saved);
    form.fields.patchValue({ primaryColor: '' });

    expect(form.preview(saved.preview, 'Acme Charging')).toMatchObject({
      primary_color: '#0e7490',
      on_primary_color: '#ffffff',
    });
  });
});
