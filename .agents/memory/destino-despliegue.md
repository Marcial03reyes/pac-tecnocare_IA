---
name: Destino de despliegue
description: Restricción de portabilidad y alojamiento de PAC acordada con el usuario.
---

PAC se desplegará en un VPS con EasyPanel mediante Docker. Debe poder instalarse, compilarse y arrancar con los comandos estándar de npm, sin depender de servicios exclusivos de Replit.

**Why:** El usuario indicó ese destino de despliegue y pidió expresamente portabilidad fuera de Replit.

**How to apply:** Al añadir integraciones o cambiar la instalación, conservar la ejecución independiente de Replit. Supabase y Gemini siguen siendo los proveedores existentes; no sustituirlos por servicios gestionados de Replit. Mantener los workflows de desarrollo actuales sin hacerlos requisito de producción.

Los cambios de seguridad deben comprobarse por separado en las instalaciones de npm y pnpm. No asumir que declarar un override y recibir “up to date” significa que npm reemplazó la versión transitiva del lockfile.

**Why:** En este workspace, npm conservó una versión transitiva vulnerable después de añadir el override y ejecutar una actualización dirigida. El análisis de pnpm además incluye herramientas de mockups y generación que no forman parte del paquete npm de producción.

**How to apply:** Verificar las versiones realmente resueltas, la instalación limpia con npm y los dos análisis antes de afirmar que una alerta quedó corregida. Distinguir las alertas del workspace completo de las del paquete que se desplegará.
