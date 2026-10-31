package com.wattwisely.driver;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins register before the bridge starts (module 34).
        registerPlugin(PushSupportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
