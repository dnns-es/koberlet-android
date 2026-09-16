package es.dnns.koberlet;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins propios hay que registrarlos a mano: el autorregistro de
        // Capacitor solo alcanza a los que vienen como paquete de npm.
        // Y va ANTES de super.onCreate, o el puente arranca sin el plugin y la
        // pantalla se encuentra con que la boveda no existe.
        registerPlugin(KoberletVault.class);

        // Los que dependen del canal (hoy solo el de actualizacion propia, que en
        // la variante de Google Play no existe) los pone cada variante en su
        // Extras.kt. Ver android/app/src/directa/ y android/app/src/play/.
        for (Class<? extends com.getcapacitor.Plugin> extra : Extras.INSTANCE.plugins()) {
            registerPlugin(extra);
        }

        super.onCreate(savedInstanceState);
    }
}
