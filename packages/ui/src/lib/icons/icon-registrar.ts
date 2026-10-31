import { Injectable, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { AppIcons } from './app-icons';

/** Hands every icon in AppIcons to Material's icon registry, once at start-up. */
@Injectable({ providedIn: 'root' })
export class IconRegistrar {
  private readonly registry = inject(MatIconRegistry);
  private readonly sanitizer = inject(DomSanitizer);

  register(): void {
    for (const [name, svg] of Object.entries(AppIcons.SVG)) {
      // The markup is Lucide's, bundled with the app, never input from a user.
      this.registry.addSvgIconLiteral(name, this.sanitizer.bypassSecurityTrustHtml(svg));
    }
  }
}
