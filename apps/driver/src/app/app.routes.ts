import { Routes } from '@angular/router';
import { AccountGuard } from './core/auth/account.guard';
import { AccountComponent } from './features/account/account.component';
import { OperatorComponent } from './features/account/operator.component';
import { ChargeComponent } from './features/charge/charge.component';
import { HomeComponent } from './features/home/home.component';
import { InvitationComponent } from './features/invitation/invitation.component';
import { MyChargeComponent } from './features/my-charges/my-charge.component';
import { MyChargesComponent } from './features/my-charges/my-charges.component';
import { PlaceComponent } from './features/place/place.component';

/**
 * The QR code on a plug opens /c/<charger>/<plug>; paying moves the driver to /charges/<key>,
 * which they can come back to; the home page lists the charges this phone started. With a
 * login (module 19), /account shows who the driver is and the operators they are linked
 * with, /account/charges the charges of that login at every operator; /invitations/<token>
 * is where an operator's e-mail leads.
 */
export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'c/:identity/:connector', component: PlaceComponent },
  { path: 'charges/:key', component: ChargeComponent },
  { path: 'invitations/:token', component: InvitationComponent },
  { path: 'account', component: AccountComponent, canActivate: [AccountGuard] },
  { path: 'account/charges', component: MyChargesComponent, canActivate: [AccountGuard] },
  { path: 'account/charges/:id', component: MyChargeComponent, canActivate: [AccountGuard] },
  {
    path: 'account/operators/:tenantId',
    component: OperatorComponent,
    canActivate: [AccountGuard],
  },
  { path: '**', redirectTo: '' },
];
