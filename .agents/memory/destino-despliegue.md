---
name: Destino de despliegue
description: Restricción de portabilidad y alojamiento de PAC acordada con el usuario.
---

PAC se desplegará en un VPS con EasyPanel mediante Docker. Debe poder instalarse, compilarse y arrancar con los comandos estándar de npm, sin depender de servicios exclusivos de Replit.

**Why:** El usuario indicó ese destino de despliegue y pidió expresamente portabilidad fuera de Replit.

**How to apply:** Al añadir integraciones o cambiar la instalación, conservar la ejecución independiente de Replit. Supabase y Gemini siguen siendo los proveedores existentes; no sustituirlos por servicios gestionados de Replit. Mantener los workflows de desarrollo actuales sin hacerlos requisito de producción.
