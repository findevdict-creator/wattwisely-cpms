import { Routes } from '@angular/router';
import { ChargeComponent } from './features/charge/charge.component';
import { HomeComponent } from './features/home/home.component';
import { PlaceComponent } from './features/place/place.component';

/**
 * Three pages: the QR code on a plug opens /c/<charger>/<plug>; paying moves the driver to
 * /charges/<key>, which they can come back to; the home page lists the charges this phone
 * started.
 */
export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'c/:identity/:connector', component: PlaceComponent },
  { path: 'charges/:key', component: ChargeComponent },
  { path: '**', redirectTo: '' },
];
