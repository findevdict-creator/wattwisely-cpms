import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { TenantApiService } from '../../core/api/tenant-api.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

/**
 * The first page after login. It shows what the API knows about you,
 * which proves the whole chain works: Keycloak login, token check and tenant check.
 */
@Component({
  selector: 'ww-home',
  imports: [MatCardModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly tenantContext = inject(TenantContextService);
  protected readonly tenantFromApi = toSignal(inject(TenantApiService).getCurrent());
}
