import { TestBed } from '@angular/core/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { AppIcons } from './app-icons';
import { IconRegistrar } from './icon-registrar';

describe('IconRegistrar', () => {
  it('gives Material every Lucide icon by its Lucide name', async () => {
    TestBed.inject(IconRegistrar).register();
    const registry = TestBed.inject(MatIconRegistry);

    const svg = await firstValueFrom(registry.getNamedSvgIcon('zap'));

    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(Object.keys(AppIcons.SVG)).toContain('ev-charger');
  });
});
