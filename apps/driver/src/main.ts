import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { AppConfigFactory } from './app/app.config';
import { RuntimeConfigLoader } from '@wattwisely/driver-core';

// 1. Read /config.json (written by the container at start-up), 2. start Angular with it.
new RuntimeConfigLoader()
  .load()
  .then((runtimeConfig) =>
    bootstrapApplication(AppComponent, AppConfigFactory.create(runtimeConfig)),
  )
  .catch((error: unknown) => console.error('The driver app could not start', error));
