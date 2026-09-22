# Puerta a Puerta VIPASA

App gratuita (mapa + estado de contacto) para organizar la campaña puerta a puerta en
viviendas de VIPASA en Gijón y Oviedo. Coste: 0€.

- **Mapa**: Leaflet + OpenStreetMap (gratis, sin API key).
- **Datos base** (direcciones, pisos, letras): vienen del Excel, ya incluidos en `js/data.js`.
- **Estado compartido** (contactado / nadie en casa / vivienda vacía + notas): se guarda en
  Firebase Firestore (plan gratuito) para que todo el equipo vea en tiempo real lo que ya se
  ha hecho, esté quien esté conectado.
- Si no configuras Firebase, la app **funciona igual en "modo local"**: cada móvil guarda sus
  propios datos con `localStorage`, sin compartir con nadie. Útil para probarla ya mismo.

## Importante sobre la precisión del mapa

Las direcciones se geocodificaron con el servicio gratuito de OpenStreetMap (Nominatim).
Muchas calles pequeñas no tienen el número exacto en su base de datos, así que en esos casos
el marcador queda en un punto aproximado de la calle, no en el portal exacto. Usa siempre la
dirección y el piso/letra que aparecen en la ficha del edificio para confirmar sobre el terreno.

---

## 1. Probar la app ya mismo (sin configurar nada)

Solo necesitas abrir `index.html` con un servidor local (no vale abrirlo con doble clic por las
restricciones de módulos JS del navegador). La forma más simple:

```bash
cd VIPASA-App
python -m http.server 8000
```

Y abre `http://localhost:8000` en el navegador. Verás el mapa y podrás marcar estados, pero
solo se guardan en ese móvil/navegador.

## 2. Configurar Firebase para compartir entre todo el equipo (gratis, ~5 minutos)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) e inicia sesión con
   una cuenta de Google (puede ser la del sindicato).
2. **Crear un proyecto** → ponle un nombre (ej. `vipasa-puerta-a-puerta`) → puedes desactivar
   Google Analytics, no hace falta → Crear proyecto.
3. En el menú lateral, ve a **Compilación → Firestore Database** → **Crear base de datos** →
   elige una ubicación cercana (ej. `eur3 (europe-west)`) → empieza en **modo de producción**.
4. Ve a **Compilación → Authentication** → pestaña **Sign-in method** → habilita **Anónimo**
   (esto permite que la app identifique cada dispositivo sin pedir contraseñas).
5. Ve a **Configuración del proyecto** (icono de engranaje) → baja hasta "Tus apps" → pulsa el
   icono `</>` (Web) → dale un nombre → **Registrar app**. Te mostrará un bloque `firebaseConfig`
   con varios valores (`apiKey`, `authDomain`, `projectId`...).
6. Copia esos valores en [`js/firebase-config.js`](js/firebase-config.js), reemplazando los
   placeholders (`TU_API_KEY`, etc.).
7. En Firestore, ve a la pestaña **Reglas** y pega el contenido de
   [`firestore.rules`](firestore.rules) (exige estar autenticado, aunque sea de forma anónima,
   para leer/escribir — evita que cualquiera en internet que encuentre la URL pueda cambiar
   datos sin usar la app). Publica las reglas.

Con eso ya está: al reabrir la app veréis "Conectado — sincronizando en tiempo real con el
equipo" y todos los móviles compartirán el mismo estado.

## 3. Publicar en GitHub Pages (gratis)

```bash
cd VIPASA-App
git init
git add .
git commit -m "App puerta a puerta VIPASA"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/vipasa-puerta-a-puerta.git
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.
En un par de minutos la app estará disponible en
`https://TU-USUARIO.github.io/vipasa-puerta-a-puerta/`.

Comparte ese enlace con el equipo (por WhatsApp/Telegram) — funciona directamente en el
navegador del móvil, no hace falta instalar nada.

⚠️ El repositorio será público (GitHub Pages gratuito lo requiere). No subas ahí ningún dato
personal sensible: `js/data.js` solo contiene direcciones administrativas del Excel original
(sin nombres, teléfonos ni correos — esos campos se ignoraron al generar los datos). El
`firebase-config.js` con tu `apiKey` es seguro de publicar: no es una contraseña, el acceso
real lo controlan las reglas de Firestore del paso 2.7.

## 4. Regenerar los datos si cambia el Excel

Si el Excel de VIPASA se actualiza:

```bash
cd VIPASA-App/data
python extract.py     # relee el Excel y agrupa por edificio
python geocode.py     # geocodifica solo los edificios nuevos (reutiliza los ya calculados)
python build_data_js.py   # regenera js/data.js
```

**Importante**: después de regenerar `js/data.js`, sube en 1 el número de versión en
`index.html` (`<script type="module" src="js/data.js?v=2">` → `?v=3`, etc.). Los navegadores
cachean ese archivo con fuerza; sin cambiar el número, los móviles que ya usaron la app antes
podrían seguir viendo datos antiguos hasta hacer una recarga forzada.

## Estructura del proyecto

```
VIPASA-App/
├── index.html
├── css/style.css
├── js/
│   ├── app.js            # lógica del mapa y la interfaz
│   ├── store.js           # sincronización (Firestore o localStorage)
│   ├── firebase-config.js # tus credenciales de Firebase (rellenar)
│   └── data.js             # datos generados desde el Excel (direcciones + viviendas)
├── data/
│   ├── extract.py          # Excel -> buildings_raw.json (agrupado por edificio)
│   ├── geocode.py           # añade lat/lon a cada edificio
│   └── build_data_js.py     # buildings_geocoded.json -> js/data.js
└── firestore.rules
```
