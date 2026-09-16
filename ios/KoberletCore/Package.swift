// swift-tools-version: 5.9
// Koberlet iOS - Copyright 2026 DNNS.es (Oberluss)
// SPDX-License-Identifier: Apache-2.0
//
// KoberletCore: el nucleo de la boveda en Swift, SIN nada de UIKit ni de
// Capacitor. Es el equivalente de las clases Kotlin Cofre / Derivacion /
// Carteras / FirmaKda de Android, y esta separado en un paquete por lo mismo que
// alli esas clases no tocan Android: para poder probarlo entero con `swift test`
// en un Mac -o en el runner de GitHub- sin simulador ni iPhone.
import PackageDescription

let package = Package(
    name: "KoberletCore",
    platforms: [.iOS(.v14), .macOS(.v12)],
    products: [
        .library(name: "KoberletCore", targets: ["KoberletCore"]),
    ],
    dependencies: [
        // Solo por scrypt: CryptoKit no lo trae. AES-GCM, HMAC, SHA y Ed25519
        // van con CryptoKit, que es del sistema.
        .package(url: "https://github.com/krzyzanowskim/CryptoSwift.git", from: "1.8.0"),
    ],
    targets: [
        .target(
            name: "KoberletCore",
            dependencies: [
                .product(name: "CryptoSwift", package: "CryptoSwift"),
            ],
            resources: [
                .copy("bip39-english.txt"),
            ]
        ),
        .testTarget(
            name: "KoberletCoreTests",
            dependencies: ["KoberletCore"]
        ),
    ]
)
