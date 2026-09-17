# Proceso de pruebas

El proyecto tiene un hook `pre-commit` versionado en `.githooks/pre-commit`. Actívalo una vez por clon:

```bash
git config core.hooksPath .githooks
```

Después, cada commit ejecutará automáticamente `npm run check`. También puedes lanzarlo manualmente:

```bash
npm run check
```

La prueba de productos cubre la regresión que provocaba el mensaje «Selecciona una marca y categoría válidas»: el formulario debe enviar ambas referencias para cualquier tipo de producto.

En CI/producción, ejecuta `npm run check` antes del build.
