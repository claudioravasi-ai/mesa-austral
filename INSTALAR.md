# Mesa Austral · cómo subirlo, paso a paso

Hay **dos lugares** y un orden. **Apps Script no hace falta**: el servidor de Cloudflare hace todo
(reservas, avisos de cada minuto, WhatsApp y Mercado Pago).

| Qué | Dónde | Para qué |
|---|---|---|
| La app (las pantallas) | **GitHub Pages** | Lo que abren el cliente, la sala y el dueño |
| El servidor y la base de datos | **Cloudflare** (Worker + D1) | Guarda las reservas, manda los avisos, cobra |

**Orden:** 1) GitHub → 2) Cloudflare → 3) conectar las dos → 4) crear el restaurante → 5) WhatsApp y
Mercado Pago (cuando el restaurante tenga número y cuenta propios).

Mientras no hagas el paso 3, la app funciona sola en «modo prueba», dentro del navegador, con el
restaurante inventado. Sirve para mostrarla.

---

## 1. GitHub (la app)

Tu equipo no tiene la clave de GitHub guardada, así que esto se hace desde la página de GitHub.

1. Entrá a <https://github.com> con tu cuenta.
2. Arriba a la derecha: **+** → **New repository**.
3. Nombre: `mesa-austral`. Marcá **Public**. Tocá **Create repository**.
4. En el repositorio vacío, tocá **uploading an existing file**.
5. Abrí en el Finder la carpeta `Escritorio/Claude/mesa-austral` y **arrastrá estas carpetas y archivos**:
   `app`, `worker`, `index.html`, `analisis.html`, `INSTALAR.md`, `MANUAL.md`.
   No subas `pruebas` ni `DATOS-DE-PRUEBA.md` (no hacen falta afuera).
6. Abajo, **Commit changes**.
7. Arriba: **Settings** → a la izquierda **Pages** → en *Branch* elegí `main` y `/ (root)` → **Save**.
8. Esperá 1 o 2 minutos. La dirección queda así (cambiá TU-USUARIO):
   - Página de venta: `https://TU-USUARIO.github.io/mesa-austral/`
   - Reservas (cliente): `https://TU-USUARIO.github.io/mesa-austral/app/`
   - Sala: `https://TU-USUARIO.github.io/mesa-austral/app/sala.html`
   - Dueño: `https://TU-USUARIO.github.io/mesa-austral/app/dueno.html`
9. Abrí la de reservas: tiene que aparecer el Fogón del Ñire con la barra amarilla «Modo prueba».

## 2. Cloudflare (el servidor)

### 2.1 La cuenta
1. Entrá a <https://dash.cloudflare.com/sign-up>, creá la cuenta y confirmá el correo.
2. El plan gratuito alcanza para empezar.

### 2.2 La base de datos
1. En el menú de la izquierda: **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Nombre: `mesa-austral` → **Create**.
3. Entrá a la base → pestaña **Console**.
4. Abrí `worker/esquema.sql` con TextEdit, copiá **todo**, pegalo en la consola y tocá **Execute**.
   Tiene que decir que se ejecutó sin errores. Se puede volver a correr: no borra nada.

### 2.3 El servidor (Worker)
1. Menú: **Compute (Workers)** → **Workers & Pages** → **Create** → **Create Worker**.
2. Nombre: `mesa-austral` → **Deploy**.
3. Tocá **Edit code**. Borrá todo lo que trae, abrí `worker/worker.js` con TextEdit, copiá **todo** y pegalo. **Deploy**.
4. Volvé al Worker → **Settings** → **Bindings** → **Add** → **D1 database**:
   - Variable name: `DB` (así, en mayúsculas)
   - D1 database: `mesa-austral` → **Save**.
5. **Settings** → **Variables and Secrets** → **Add** (una por una):

   | Nombre | Tipo | Valor |
   |---|---|---|
   | `SECRETO` | Secret | Un texto largo al azar. Para generarlo: abrí Terminal y escribí `openssl rand -hex 32` |
   | `APP_URL` | Text | `https://TU-USUARIO.github.io/mesa-austral/app` |
   | `API_URL` | Text | La dirección del Worker, p. ej. `https://mesa-austral.TU-SUBDOMINIO.workers.dev` |
   | `ORIGEN` | Text | `https://TU-USUARIO.github.io` |
   | `CLAVE_INSTALACION` | Secret | Otra clave larga al azar (sirve para crear el restaurante real) |
   | `MODO_PRUEBA` | Text | `1` solo si querés cargar el restaurante de prueba en la nube. Borrala antes de abrir al público |

   Tocá **Deploy** para que tomen efecto.
6. **Settings** → **Triggers** → **Cron Triggers** → **Add** → `* * * * *` (cada minuto) → **Add**.
   Es lo que manda los recordatorios, el «¿vienen?», marca los plantones y hace el cierre de las 03:00.
7. Probá: abrí `https://mesa-austral.TU-SUBDOMINIO.workers.dev/api/estado`.
   Tiene que mostrar algo como `{"version":"0.1.0", …}`.

## 3. Conectar la app con el servidor

1. En GitHub, entrá a `app/config.js` → el lápiz (**Edit**).
2. Cambiá `API_URL: ''` por la dirección del Worker, por ejemplo:
   `API_URL: 'https://mesa-austral.TU-SUBDOMINIO.workers.dev',`
3. **Commit changes**. En 1 o 2 minutos la app ya usa el servidor (la barra de «Modo prueba» desaparece).

## 4. Crear el restaurante

### Opción A: el restaurante de prueba en la nube (para mostrarlo con varios teléfonos a la vez)
Con `MODO_PRUEBA` = `1`, en Terminal:

```
curl -X POST https://mesa-austral.TU-SUBDOMINIO.workers.dev/api/sembrar
```

Las cuentas son las de `DATOS-DE-PRUEBA.md`. En la nube el reloj es el real (no hay reloj de prueba).

### Opción B: el restaurante real
En Terminal (cambiá los datos; la contraseña del dueño, de 10 caracteres o más):

```
curl -X POST https://mesa-austral.TU-SUBDOMINIO.workers.dev/api/instalar -H "content-type: application/json" -d '{"clave_instalacion":"LA-CLAVE-DE-INSTALACION","slug":"nombre-corto","nombre":"Nombre del Restaurante","dueno":"Nombre del dueño","email":"correo@del-dueno.com","clave":"UNA-CONTRASEÑA-LARGA","whatsapp":"+5492901494953"}'
```

Después:
1. En `app/config.js` poné `RESTO: 'nombre-corto'` (o usá los enlaces con `?r=nombre-corto`).
2. El dueño entra a `dueno.html` con su correo y contraseña y carga, en este orden:
   **Salón** (paredes y mesas) → **Horarios** → **Reglas** (y el estilo de la página) → **Equipo** (PIN de cada uno).
3. En la tablet de la entrada, el dueño entra una vez a `sala.html` y toca **Habilitar esta tablet**.
   Desde ahí el equipo entra con su PIN.
4. El enlace de reservas (con su QR) está en **Reglas** → «Tu enlace de reservas»: va a la bio de Instagram,
   a Google Maps y a la puerta.

## 5. WhatsApp y Mercado Pago (cuando el restaurante tenga lo suyo)

### WhatsApp
- **Ahora:** en Reglas, «Cómo salen los WhatsApp» → **A mano**: la sala ve cada mensaje listo y lo manda con un
  toque desde el WhatsApp del teléfono. El número que ven los clientes es el tuyo hasta que se cambie en Reglas.
- **Automático (después):** hace falta un **número propio del restaurante** en WhatsApp Business Platform
  (Meta). Ojo: un número que se registra ahí deja de funcionar en el WhatsApp común, por eso no conviene usar el tuyo.
  Se cargan en el Worker `WA_TOKEN`, `WA_PHONE_ID` y `WA_VERIFY`, se aprueban en Meta las plantillas `ma_…`
  y el webhook va a `API_URL/api/wa/webhook`. Lo configuramos juntos cuando llegue el momento.
  WhatsApp cambia sus precios el 1 de octubre de 2026: los mensajes de confirmación y recordatorio cuestan centavos de dólar.

### Mercado Pago
1. Con la cuenta del restaurante: <https://www.mercadopago.com.ar/developers> → **Tus integraciones** → **Crear aplicación**.
2. Primero **credenciales de prueba**; cuando todo ande, las de producción.
3. Copiá el **Access Token** y cargalo en el Worker como `MP_TOKEN` (Secret).
4. En la aplicación de Mercado Pago → **Webhooks** → URL: `API_URL/api/mp/webhook`, evento **Pagos** → guardá.
   Copiá la **clave secreta** y cargala como `MP_WEBHOOK_SECRET` (Secret).
5. Sin estas dos variables, la app usa la pasarela de prueba (no cobra nada).

## Antes de abrir al público
- [ ] Borrar `MODO_PRUEBA` del Worker.
- [ ] Que un abogado revise la política de reservas y el texto de privacidad (`app/privacidad.html`).
- [ ] El restaurante evalúa la inscripción de su base de datos ante la AAIP.
- [ ] Probar una reserva real de punta a punta con dos teléfonos (cliente y tablet).

## Cada vez que cambie algo
- Cambió algo de `app/` → se sube a GitHub (arrastrando los archivos cambiados).
- Cambió `worker/worker.js` → se vuelve a pegar entero en Cloudflare (**Edit code** → **Deploy**).
- Cambió `worker/esquema.sql` → se vuelve a correr en la consola de D1.
