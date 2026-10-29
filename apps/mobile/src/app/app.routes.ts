import { Routes } from '@angular/router';
import { SignedInGuard } from './core/auth/signed-in.guard';
import { SignedOutGuard } from './core/auth/signed-out.guard';
import { AccountComponent } from './features/account/account.component';
import { ChargeComponent } from './features/charge/charge.component';
import { HomeComponent } from './features/home/home.component';
import { SessionsComponent } from './features/sessions/sessions.component';
import { TabsComponent } from './features/tabs/tabs.component';
import { WelcomeComponent } from './features/welcome/welcome.component';

/**
 * The welcome page before the first sign-in, then four tabs as in the design (Figma
 * sections 8 to 11): Home, Charge, Sessions and Account. Module 30 builds the frame; the
 * charging, history and account screens fill the tabs in the modules after it.
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
  { path: '**', redirectTo: 'tabs/home' },
];
