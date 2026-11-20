package org.elbanquillo.entrenador;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public final class MainActivity extends Activity {
    private static final Uri SITE = Uri.parse("https://banquilloentrenador.vercel.app/");

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Intent open = new Intent(Intent.ACTION_VIEW, SITE);
        // The browser owns the session and renders the real HTTPS origin.
        Bundle customTab = new Bundle();
        customTab.putBinder("android.support.customtabs.extra.SESSION", null);
        open.putExtras(customTab);
        open.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", 0xff101419);
        open.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY", 1);

        try {
            startActivity(open);
            finish();
        } catch (ActivityNotFoundException error) {
            new AlertDialog.Builder(this)
                .setMessage("Instala un navegador para abrir El Banquillo del Entrenador.")
                .setPositiveButton(android.R.string.ok, (dialog, which) -> finish())
                .setOnCancelListener(dialog -> finish())
                .show();
        }
    }
}
