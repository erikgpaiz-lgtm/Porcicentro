#!/usr/bin/env node
/* ============================================================
   Cambia el dominio público del sitio en un solo paso.
   ------------------------------------------------------------
   Uso:
     node scripts/set-domain.mjs https://porcicentro.gt

   Actualiza: SITE_URL en data.js, canonical / og:url / og:image
   de todas las páginas y las URLs de sitemap.xml.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const nuevo = (process.argv[2] || '').replace(/\/+$/, '');

if (!/^https?:\/\/[^/]+$/.test(nuevo)) {
  console.error('Uso: node scripts/set-domain.mjs https://tudominio.com');
  process.exit(1);
}

// Dominio actual: se lee de data.js para no depender de nada escrito a mano
const dataJs = fs.readFileSync(path.join(raiz, 'data.js'), 'utf8');
const actual = (dataJs.match(/SITE_URL:\s*'([^']+)'/) || [])[1];
if (!actual) {
  console.error('No se encontró SITE_URL en data.js');
  process.exit(1);
}
if (actual === nuevo) {
  console.log('El sitio ya usa', nuevo, '— nada que cambiar.');
  process.exit(0);
}

console.log('Cambiando', actual, '->', nuevo);

const archivos = fs.readdirSync(raiz).filter((f) => f.endsWith('.html') || f === 'data.js' || f === 'sitemap.xml');
let tocados = 0;

for (const archivo of archivos) {
  const ruta = path.join(raiz, archivo);
  const antes = fs.readFileSync(ruta, 'utf8');
  const despues = antes.split(actual).join(nuevo);
  if (despues !== antes) {
    fs.writeFileSync(ruta, despues);
    tocados++;
    console.log('  ✓', archivo);
  }
}

console.log('');
console.log('Listo:', tocados, 'archivo(s) actualizados.');
console.log('Recuerda: si el dominio es nuevo, verifica el DNS y vuelve a desplegar.');
