// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0

import UIKit
import Capacitor

/// El controlador del WebView, solo para enchufar el plugin de la boveda.
///
/// Capacitor 7 no descubre los plugins que viven dentro de la propia app (los
/// de paquetes si); hay que registrarlos a mano aqui. Main.storyboard apunta a
/// esta clase en lugar de a CAPBridgeViewController.
class MainViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(KoberletVault())
    }
}
