# PWA de turnos para barbería

App instalable (funciona offline y se puede "añadir a pantalla de inicio") con:

- **`index.html`** — página pública: servicios, equipo, reseñas y reserva de turnos (estilo inspirado en páginas tipo WeiBook).
- **`admin.html`** — panel privado para el barbero: agenda del día, confirmar/cancelar/completar turnos, administrar servicios y colaboradores.
- Los datos se guardan en **Supabase** (Postgres gratis en la nube), así que los turnos se sincronizan entre el celular del barbero, la tablet del local y el celular del cliente en tiempo real.

No requiere instalar nada ni usar terminal para publicarla: son archivos estáticos.

---

## 1. Crear el backend (10 minutos, gratis)

1. Entra a [supabase.com](https://supabase.com) → **Start your project** → crea una cuenta gratis.
2. Crea un **New project** (elige una región cercana, ej. São Paulo).
3. Ve a **SQL Editor → New query**, pega todo el contenido del archivo `schema.sql` (incluido en esta carpeta) y dale **Run**. Esto crea las tablas de servicios, colaboradores, turnos y reseñas, con datos de ejemplo.
4. Ve a **Project Settings → API**. Copia dos valores:
   - **Project URL**
   - **anon public key**
5. Abre `config.js` en esta carpeta y pégalos aquí:
   ```js
   supabaseUrl: "https://xxxxx.supabase.co",
   supabaseAnonKey: "eyJhbGciOi...",
   ```

### Crear el usuario del barbero (para entrar al panel)
1. En Supabase, ve a **Authentication → Users → Add user**.
2. Crea el correo y contraseña con los que el barbero iniciará sesión en `admin.html`.
3. Si tienes varios colaboradores que necesitan acceso al panel, repite este paso para cada uno.

---

## 2. Personalizar la marca

Todo lo editable está en **`config.js`**, sin tocar el resto del código:
- Nombre del negocio, eslogan, dirección, WhatsApp.
- Horario de atención por día.
- Logo y foto de portada (pega una URL de imagen).

Los servicios y colaboradores se administran directamente desde el **panel del barbero** (`admin.html`) una vez publicada la app — no hace falta editar código para eso.

---

## 3. Publicar la app (gratis)

La forma más simple es **Netlify Drop**:

1. Entra a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta completa de esta PWA a la página.
3. En segundos obtienes una URL pública (ej. `https://tu-barberia.netlify.app`).

Alternativas igual de válidas: Vercel, GitHub Pages, o cualquier hosting estático.

> Importante: la app debe servirse por **HTTPS** (Netlify/Vercel lo hacen automático) para que funcione como PWA instalable.

---

## 4. Instalar la app en el celular

- **Clientes**: al entrar al link desde Chrome/Safari, verán un aviso "Instalar app" (o desde el menú del navegador → "Añadir a pantalla de inicio").
- **Barbero**: entra a `tu-dominio.com/admin.html`, inicia sesión, e instálala igual desde el navegador. Quedará como una app aparte en su celular.

---

## 5. Uso diario

**Cliente:** abre la app → busca y elige servicio (con buscador) → elige fecha y hora libre → deja nombre, teléfono y correo → turno reservado con estado "pendiente". Si hay más de un barbero activo, se agrega un paso extra para elegir con quién (o "cualquiera disponible").

**Barbero (panel):**
- **Agenda**: navega por día, ve todos los turnos, y con un toque los confirma, cancela o marca como completados. Botón directo a WhatsApp del cliente.
- **Bloquear un día**: con el botón "Bloquear este día" en la Agenda, cierra un día completo (vacaciones, festivo, imprevisto) sin cancelar cita por cita; ese día deja de ofrecerse en la reserva pública.
- **Servicios**: agrega, edita o elimina servicios y precios.
- **Equipo**: agrega o edita colaboradores.

Los horarios ya ocupados se bloquean automáticamente para que no se dupliquen turnos, incluso entre distintos dispositivos.

---

## Estructura de archivos

```
config.js              ← marca, horario, credenciales de Supabase
index.html / js/app.js ← página pública + flujo de reserva
admin.html / js/admin.js ← panel del barbero
js/supabase-client.js  ← conexión y utilidades compartidas
css/styles.css          ← estilos (identidad visual)
manifest.json / sw.js / js/pwa.js ← configuración PWA (instalable + offline)
schema.sql              ← script para crear la base de datos en Supabase
icons/                  ← íconos de la app
```

## Notas y próximos pasos posibles
- Se puede agregar **notificaciones push** o **recordatorios por WhatsApp automáticos** (requiere un servicio adicional, ej. una Edge Function de Supabase + API de WhatsApp Business).
- Se puede activar **Supabase Realtime** para que la agenda del barbero se actualice sola sin recargar la página.
- El campo `manifest.json` tiene el nombre de la app fijo ("Studio Barber"); si cambias el nombre del negocio en `config.js`, actualiza también `name`/`short_name` en `manifest.json`.
