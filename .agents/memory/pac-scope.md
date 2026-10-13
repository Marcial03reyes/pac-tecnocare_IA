---
name: PAC — alcance y restricciones
description: Requisitos del usuario para TECNOCARE y su Supabase existente.
---

PAC es la Plataforma de Apoyo Comercial de TECNOCARE, empresa peruana que vende generadores de ozono médico europeos. Todo el producto debe estar en español y seguir las referencias visuales proporcionadas.

**Why:** El usuario definió explícitamente la identidad y el idioma del producto.

**How to apply:** Mantener esta identidad en la web pública y el panel comercial privado.

Usar el Supabase self-hosted existente, con Supabase Auth por email y contraseña, sin registro público. No crear, modificar ni migrar tablas existentes.

**Why:** El usuario indicó que las tablas ya existen y no se tocan.

**How to apply:** Consultar las tablas clientes y reuniones para el panel; no provisionar una base alternativa ni ejecutar cambios de esquema.
