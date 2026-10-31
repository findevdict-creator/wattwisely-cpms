import { bootstrapApplication } from '@angular/platform-browser';
import { RuntimeConfigLoader } from '@wattwisely/driver-core';
import { AppComponent } from './app/app.component';
import { AppConfigFactory } from './app/app.config';

// 1. Read /config.json (bundled with the app for its environment), 2. start Angular with it.
new RuntimeConfigLoader()
  .load()
  .then((runtimeConfig) =>
    bootstrapApplication(AppComponent, AppConfigFactory.create(runtimeConfig)),
  )
  .catch((error: unknown) => console.error('The mobile app could not start', error));
