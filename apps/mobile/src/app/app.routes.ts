import { Routes } from '@angular/router';
import { SignedInGuard } from './core/auth/signed-in.guard';
import { SignedOutGuard } from './core/auth/signed-out.guard';
import { AccountComponent } from './features/account/account.component';
import { ChargeComponent } from './features/charge/charge.component';
import { HomeComponent } from './features/home/home.component';
import { InvitationComponent } from './features/invitation/invitation.component';
import { CardComponent } from './features/plug/card.component';
import { ConsentComponent } from './features/plug/consent.component';
import { PlugComponent } from './features/plug/plug.component';
import { SessionComponent } from './features/session/session.component';
import { SessionsComponent } from './features/sessions/sessions.component';
import { TabsComponent } from './features/tabs/tabs.component';
import { WelcomeComponent } from './features/welcome/welcome.component';

/**
 * The welcome page before the first sign-in, then four tabs as in the design (Figma
 * sections 8 to 11): Home, Charge, Sessions and Account. Module 30 builds the frame; the
 * charging, history and account screens fill the tabs in the modules after it.
 *
 * The charging pages (module 32) open over the tabs: a plug, the consent at a new operator
 * and the card, then the charge itself. A plug's QR code and an invitation link open them
 * straight from outside the app.
 */
export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tabs/home' },
  { path: 'welcome', component: WelcomeComponent, canActivate: [SignedOutGuard] },
  {
    path: 'tabs',
    component: TabsComponent,
    canActivate: [SignedInGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'charge', component: ChargeComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'account', component: AccountComponent },
      { path: '', pathMatch: 'full', redirectTo: 'home' },
    ],
  },
  { path: 'plug/:identity/:connector', component: PlugComponent, canActivate: [SignedInGuard] },
  {
    path: 'plug/:identity/:connector/consent',
    component: ConsentComponent,
    canActivate: [SignedInGuard],
  },
  {
    path: 'plug/:identity/:connector/card',
    component: CardComponent,
    canActivate: [SignedInGuard],
  },
  { path: 'charges/:id', component: SessionComponent, canActivate: [SignedInGuard] },
  { path: 'invitations/:token', component: InvitationComponent, canActivate: [SignedInGuard] },
  { path: '**', redirectTo: 'tabs/home' },
];
