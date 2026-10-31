package com.wattwisely.driver;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Whether this build can take pushes (module 34). The Google services Gradle plugin turns
 * google-services.json into the google_app_id string; a build without the file has none, and
 * Firebase would stop the app if the push plugin asked it for a token.
 */
@CapacitorPlugin(name = "PushSupport")
public class PushSupportPlugin extends Plugin {

    @PluginMethod
    public void isConfigured(PluginCall call) {
        int id = getContext().getResources().getIdentifier("google_app_id", "string", getContext().getPackageName());
        JSObject answer = new JSObject();
        answer.put("value", id != 0);
        call.resolve(answer);
    }
}
