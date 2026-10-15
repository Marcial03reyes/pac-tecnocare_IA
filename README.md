# TECNOCARE - SOLUCIÓN PAC

CRM comercial con React/Vite, Supabase y un servidor Node/Express para el
Asistente PAC (Gemini). La web compilada y `/api` se sirven desde **un solo
proceso y puerto**. No necesita Replit para instalarse ni ejecutarse.

## Requisitos

- Node.js **22.12 o superior** y npm.
- Proyecto Supabase existente con su esquema, RLS y usuarios actuales.
- Clave de Google Gemini para el Asistente.

No usa Replit DB, Replit Auth, App Storage ni un proxy de IA de Replit.
El login es Supabase Auth y el Asistente utiliza el SDK oficial de Gemini.
Los plugins de Replit de Vite solo se cargan con el servidor de desarrollo,
en modo development y con `REPL_ID` presente. No se activan al compilar ni
en producción.

## Instalación sin Docker

Desde la raíz:

```bash
cp .env.example .env
# Edita .env con tus valores; no lo subas a Git.
npm install
npm run build
npm start
```

Abre `http://localhost:3000`. `PORT` cambia el puerto; si se omite, usa 3000.
El servidor escucha en `0.0.0.0`, acepta conexiones del proxy y carga `.env`
al ejecutar `npm start`. Vite lee el `.env` de la raíz al compilar.

`npm run build` comprueba los tipos, compila el frontend y empaqueta el backend.
Después de compilar, `npm run test:portable` prueba `npm start` en un directorio
temporal con solo dependencias de producción y sin variables de Replit, la web, rutas de React y API,
incluidos el puerto predeterminado y uno personalizado. No consulta proveedores.
No requiere instalar pnpm. `npm ci` también funciona con el lockfile incluido.
El `.npmrc` incluido conserva el esbuild actual aunque el plugin de empaquetado
de Pino declara un rango de peer dependencies más estrecho; no lo elimines.
En Replit pueden seguir usándose los workflows pnpm existentes; no mezcles
instalaciones npm y pnpm en el mismo `node_modules`.

Mantén el proceso con systemd o PM2 y coloca un proxy HTTPS delante. Envía
**todas** las rutas al mismo puerto Node, conservando `/api`. El servidor
resuelve las rutas de React al recargar `/panel/clientes`, `/panel/asistente`,
etc. La ruta de salud es `GET /api/healthz`.

## Variables

| Variable | Momento | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Compilación y ejecución | URL pública del proyecto Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Compilación y ejecución | Clave pública anon de Supabase; protegida por las políticas RLS existentes. No usar service_role. |
| `GEMINI_API_KEY` | Solo ejecución | Clave privada de Gemini para el servidor. |
| `GEMINI_MODEL` | Ejecución, opcional | Modelo principal; por defecto `gemini-3-flash-preview`, con respaldo Flash configurado en el servidor. |
| `PORT` | Ejecución, opcional | Puerto de escucha; por defecto `3000`. |
| `NODE_ENV` | Ejecución | Usar `production` en el VPS. |
| `LOG_LEVEL` | Ejecución, opcional | Nivel de logs; por defecto `info`. |

Las variables `VITE_` quedan incluidas en el JavaScript público al compilar.
Cambiar sus valores requiere volver a construir la imagen/web. Los valores
de Supabase de compilación y ejecución deben corresponder al mismo proyecto.
**GEMINI_API_KEY nunca debe llevar el prefijo VITE_, ni entrar como build arg.**
No se necesita `DATABASE_URL`, `SESSION_SECRET` ni ninguna variable de Replit.
No crear tablas ni ejecutar migraciones para este despliegue.

## Docker

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="https://TU_PROYECTO.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="TU_CLAVE_PUBLICA_ANON" \
  -t pac-tecnocare .

docker run -d --name pac --restart unless-stopped \
  --env-file .env -p 3000:3000 pac-tecnocare
```

El Dockerfile usa dos etapas: instala/compila y luego copia únicamente la
web compilada, el backend empaquetado y sus dependencias de producción
(incluido el SDK oficial de Gemini). El runtime no necesita ejecutar npm install,
Vite, pnpm, dependencias de Replit ni acceso a código fuente. Se ejecuta con
usuario no privilegiado y tiene healthcheck.

## EasyPanel

1. Crea un servicio **App**, conecta el repositorio o sube el código completo.
2. Selecciona compilación mediante **Dockerfile**, ruta `Dockerfile`, contexto
   raíz del repositorio.
3. Configura como **argumentos de compilación (build args)**:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. No basta con definirlos solo
   como variables de ejecución: Vite los necesita al construir.
4. En las variables del servicio configura esos mismos dos valores de Supabase,
   `GEMINI_API_KEY`, `NODE_ENV=production` y `PORT=3000`. Opcional: `GEMINI_MODEL`.
   No entregues la clave privada de Gemini al constructor de la imagen.
5. Configura el dominio para apuntar al **puerto interno 3000** y activa HTTPS.
   Deja el comando del Dockerfile (`npm start`); no ejecutes Vite en producción.
6. Configura un timeout del proxy de al menos 180 segundos para `/api/chat`.
7. En Supabase Auth revisa Site URL y las Redirect URLs permitidas para tu
   dominio nuevo. Conserva las políticas RLS y los usuarios existentes.
8. Despliega. Comprueba `/api/healthz`, inicio, login, Contactos y el Asistente.
   Reinicia el servicio y comprueba que sigue funcionando.

HTTPS es necesario para el dictado por micrófono y las sesiones seguras del
navegador. EasyPanel termina TLS y reenvía el tráfico al servidor Node.

### Limitaciones operativas actuales

El historial del Asistente y las propuestas pendientes viven en memoria del
servidor, con caducidad; un reinicio las elimina. Empieza con **una réplica**:
varias réplicas sin estado compartido perderían la continuidad de conversación.
Los contactos y reuniones guardados permanecen en Supabase.

### Verificación realizada

Se comprobó una instalación npm limpia, la compilación y el arranque del
runtime con dependencias de producción, sin variables de Replit, en el puerto
3000 y en un puerto personalizado. Se verificaron salud, archivos estáticos,
rutas de React y respuestas 404 de API. No se hicieron llamadas reales a
Gemini ni escrituras en Supabase. La imagen Docker no se construyó en este
entorno: el primer build de Docker/EasyPanel aún debe validarse en el VPS.

Supabase y Gemini son servicios externos necesarios; “portable” no significa
que el CRM funcione sin Internet o sin ellos. Los archivos de diseño, exports
y herramientas internas de Replit no forman parte de la imagen.
