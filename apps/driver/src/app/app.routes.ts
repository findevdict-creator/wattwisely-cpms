import { Routes } from '@angular/router';
import { AccountGuard } from './core/auth/account.guard';
import { AccountComponent } from './features/account/account.component';
import { PaymentMethodsComponent } from './features/account/cards/payment-methods.component';
import { DetailsComponent } from './features/account/details.component';
import { OperatorComponent } from './features/account/operator.component';
import { OperatorsComponent } from './features/account/operators.component';
import { ChargeComponent } from './features/charge/charge.component';
import { HomeComponent } from './features/home/home.component';
import { InvitationComponent } from './features/invitation/invitation.component';
import { MyChargeComponent } from './features/my-charges/my-charge.component';
import { MyChargesComponent } from './features/my-charges/my-charges.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { PlaceComponent } from './features/place/place.component';
import { PrivacyComponent } from './features/privacy/privacy.component';

/**
 * The QR code on a plug opens /c/<charger>/<plug>; paying moves the driver to /charges/<key>,
 * which they can come back to; the home page lists the charges this phone started. With a
 * login (module 19), /account shows who the driver is and the operators they are linked
 * with, /account/charges the charges of that login at every operator; /invitations/<token>
 * is where an operator's e-mail leads. Since module 38 /account is a menu, as in the mobile
 * app, over the cards, the operators, the notifications, the details and privacy and data.
 */
export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'c/:identity/:connector', component: PlaceComponent },
  { path: 'charges/:key', component: ChargeComponent },
  { path: 'invitations/:token', component: InvitationComponent },
  { path: 'account', component: AccountComponent, canActivate: [AccountGuard] },
  { path: 'account/charges', component: MyChargesComponent, canActivate: [AccountGuard] },
  { path: 'account/charges/:id', component: MyChargeComponent, canActivate: [AccountGuard] },
  { path: 'account/cards', component: PaymentMethodsComponent, canActivate: [AccountGuard] },
  { path: 'account/operators', component: OperatorsComponent, canActivate: [AccountGuard] },
  {
    path: 'account/notifications',
    component: NotificationsComponent,
    canActivate: [AccountGuard],
  },
  { path: 'account/details', component: DetailsComponent, canActivate: [AccountGuard] },
  { path: 'account/privacy', component: PrivacyComponent, canActivate: [AccountGuard] },
  {
    path: 'account/operators/:tenantId',
    component: OperatorComponent,
    canActivate: [AccountGuard],
  },
  { path: '**', redirectTo: '' },
];
