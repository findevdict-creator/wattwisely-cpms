import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The root of the admin console. Every page is shown inside the router outlet. */
@Component({
  selector: 'ww-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
