# Matemáticas en Verso

## Ejecutar en local (Windows + npm)

Si aparece este error al iniciar:

`Cannot find module '@tailwindcss/oxide-win32-x64-msvc'`

haz una instalación limpia porque es un problema conocido de npm con dependencias opcionales:

```bash
rmdir /s /q node_modules
del package-lock.json
npm cache verify
npm install
```

Si persiste, instala manualmente el binding opcional de Tailwind para Windows:

```bash
npm install --save-optional @tailwindcss/oxide-win32-x64-msvc@^4.1.9
```

Luego ejecuta:

```bash
npm run dev
```
