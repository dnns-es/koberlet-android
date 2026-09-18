package es.dnns.koberlet;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // NADA DE ESTA APP SE PUEDE FOTOGRAFIAR.
        //
        // FLAG_SECURE tapa tres cosas de golpe: la captura de pantalla, la
        // grabacion de video y la miniatura que Android enseña en la lista de
        // aplicaciones recientes. Esa ultima es la mas traicionera: si sales de
        // la app con las 12 palabras en pantalla, la miniatura se queda ahi
        // hasta que la cierres, y eso lo ve cualquiera que coja el telefono.
        //
        // Se pone en TODA la ventana y no solo en las pantallas con secretos.
        // Podria hacerse por pantalla -encenderlo al enseñar la semilla y
        // apagarlo al salir- pero entonces cada pantalla nueva que enseñe algo
        // sensible tiene que acordarse de pedirlo, y el dia que a alguien se le
        // olvide la fuga no avisa: se descubre cuando ya esta la captura hecha.
        // Aqui no hay nada que recordar.
        //
        // El precio, que es real: el usuario tampoco puede fotografiar su saldo
        // ni un justificante de envio. En un monedero compensa.
        //
        // En debug se deja fuera a proposito: es la unica forma de hacer las
        // capturas de la ficha de la tienda, y una build de debug se ve
        // exactamente igual que la de release.
        // Se mira la marca de depuracion del propio paquete y no `BuildConfig`,
        // porque AGP 8 no genera esa clase salvo que se le pida aparte, y no
        // compensa encender una funcion de compilacion entera para leer un bit.
        boolean depuracion =
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;

        if (!depuracion) {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            );
        }

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
