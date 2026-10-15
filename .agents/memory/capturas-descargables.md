---
name: Capturas descargables
description: Diferencia entre evidencia visual del navegador y archivos entregables de capturas.
---

Para entregar una carpeta de capturas, verificar que existen archivos PNG físicos en el workspace; los identificadores de capturas del navegador no garantizan que sus bytes estén disponibles para exportación.

**Why:** La herramienta del navegador del probador mostró imágenes, pero no ofreció un método documentado para guardarlas en el workspace. Asumir que esos identificadores eran archivos descargables impidió la primera exportación.

**How to apply:** Confirmar el mecanismo de guardado antes de capturar todas las vistas; comprobar la firma PNG y la integridad del ZIP. Para vistas privadas, usar fixtures sintéticos aislados y aclararlo en la entrega, sin consultar ni modificar registros reales.
