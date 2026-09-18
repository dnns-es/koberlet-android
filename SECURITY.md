# Política de seguridad / Security policy

*(English below)*

## Español

Koberlet custodia claves privadas en el teléfono. Un fallo aquí no es un error de programa:
es dinero de alguien. Los reportes de seguridad se agradecen y se atienden.

### Cómo reportar

**No abras un issue público.** Usa el aviso privado de vulnerabilidades de GitHub: en la
pestaña **Security** del repositorio → **Report a vulnerability**. Llega solo al mantenedor.

Si no puedes usar ese canal, abre un issue diciendo únicamente que quieres reportar algo en
privado, sin detalles, y se te dará una vía de contacto.

### Qué ayuda en un reporte

- Qué versión de Koberlet, qué sistema (Android o iPhone) y de dónde salió la copia: Google
  Play, TestFlight o `descargas.dnns.es`.
- Qué hace el fallo, no solo dónde está: qué consigue alguien que lo aproveche.
- Pasos para reproducirlo. Si tienes una prueba de concepto, mejor.
- Si afecta a fondos reales o solo a pruebas.

### Qué puedes esperar

- Acuse de recibo en unos días.
- Se te dice si se confirma o no, y por qué.
- Se arregla y se publica una versión. Se te cita como quien lo encontró, salvo que
  prefieras el anonimato.
- Se pide un margen razonable antes de publicar los detalles, para que los usuarios tengan
  tiempo de actualizar.

### Qué interesa especialmente

- Cualquier camino por el que una clave privada o la frase de recuperación acabe en el lado
  de JavaScript, en `localStorage`, en un log o en una petición de red. Por diseño no sale
  nunca de la bóveda nativa.
- Cualquier forma de que el doble de desarrollo (`src/boveda/simulada.js`), que sí guarda en
  el navegador, acabe cargándose dentro del APK o del IPA.
- Cualquier firma que se pueda provocar sin que el dueño vea antes lo que está firmando.

### Qué NO es una vulnerabilidad aquí

- Que un nodo público falle, limite peticiones o vea qué direcciones consultas. No hay
  servidor propio: eso está dicho en el README y es el precio de no tener backend.
- Que alguien con el teléfono desbloqueado en la mano y la contraseña pueda abrir la bóveda.
  Es su función.
- Que una copia de seguridad sin cifrar que tú hayas exportado se pueda leer. Por eso se
  avisa al exportarla.

---

## English

Koberlet holds private keys on the phone. A bug here isn't a program error: it is somebody's
money. Security reports are welcome and taken seriously.

### How to report

**Do not open a public issue.** Use GitHub's private vulnerability reporting: the
repository's **Security** tab → **Report a vulnerability**. It reaches the maintainer only.

If you cannot use that channel, open an issue saying only that you want to report something
privately, with no details, and you'll be given a contact route.

### What helps in a report

- Koberlet version, which system (Android or iPhone), and where the copy came from: Google
  Play, TestFlight or `descargas.dnns.es`.
- What the bug does, not just where it is: what someone exploiting it achieves.
- Steps to reproduce. A proof of concept is better still.
- Whether it affects real funds or only testing.

### What to expect

- Acknowledgement within a few days.
- You are told whether it is confirmed or not, and why.
- It gets fixed and released. You are credited as the finder unless you prefer not to be.
- A reasonable window is requested before details are published, so users can update.

### What is of particular interest

- Any path by which a private key or the recovery phrase reaches the JavaScript side,
  `localStorage`, a log or a network request. By design it never leaves the native vault.
- Any way the development double (`src/boveda/simulada.js`), which does store in the
  browser, could end up loaded inside the APK or the IPA.
- Any signature that can be triggered without the owner first seeing what is being signed.

### What is NOT a vulnerability here

- A public node failing, rate-limiting, or seeing which addresses you query. There is no
  server of our own: that is stated in the README and is the price of having no backend.
- Someone holding the unlocked phone and knowing the password being able to open the vault.
  That is what the password is for.
- An unencrypted backup that you exported yourself being readable. That is why you are
  warned when exporting it.
