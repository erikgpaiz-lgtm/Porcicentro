#!/usr/bin/env node
/* ============================================================
   Verificación del sitio:  node scripts/check.mjs
   ------------------------------------------------------------
   Comprueba coherencia entre data.js y las páginas:
     · enlaces y archivos locales que existan
     · precios del HTML que apunten a productos reales
     · el <noscript> del catálogo (siempre sincronizado)
     · nada de credenciales escritas en el HTML
     · sitemap acorde al SITE_URL
     · sintaxis de los scripts inline
   Se puede ejecutar antes de cada deploy; no necesita instalar nada.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const datos = require(path.join(raiz, 'data.js'));

const paginas = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));
const errores = [];
const avisos = [];
const ok = (msg) => console.log('  ✓ ' + msg);

/* 1. Enlaces y recursos locales ───────────────────────────── */
for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"#?:]+)"/g)].map((m) => m[1])
    .filter((r) => !r.startsWith('//') && !r.startsWith('data:') && !r.startsWith('mailto:'))
    .filter((r) => !/[$&{}=]/.test(r));   // ignora rutas dinámicas (plantillas)`${…}`)
  for (const ref of new Set(refs)) {
    if (!fs.existsSync(path.join(raiz, ref))) errores.push(`${pagina}: falta el archivo ${ref}`);
  }
}
if (!errores.length) ok('todos los enlaces y recursos locales existen');

/* 2. Precios del HTML ligados a productos reales ──────────── */
const ids = new Set(datos.CATALOGO.map((p) => p.id));
for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  for (const m of html.matchAll(/data-pc-precio="([^"]+)"/g)) {
    if (!ids.has(m[1])) errores.push(`${pagina}: data-pc-precio="${m[1]}" no existe en data.js`);
  }
}
ok(`precios hidratados apuntan a productos válidos (${datos.CATALOGO.length} en catálogo)`);

/* 3. El <noscript> del catálogo debe reflejar data.js ─────── */
const productosHtml = fs.readFileSync(path.join(raiz, 'productos.html'), 'utf8');
const noscript = productosHtml.match(/<noscript>([\s\S]*?)<\/noscript>/);
if (!noscript) {
  avisos.push('productos.html: no hay bloque <noscript> con el catálogo');
} else {
  const faltan = datos.CATALOGO.filter((p) => !noscript[1].includes(p.name));
  const sobran = [...noscript[1].matchAll(/<strong>([^<]+)<\/strong>/g)]
    .map((m) => m[1])
    .filter((n) => !datos.CATALOGO.some((p) => p.name === n));
  if (faltan.length) errores.push('productos.html <noscript>: faltan ' + faltan.map((p) => p.name).join(', '));
  if (sobran.length) errores.push('productos.html <noscript>: sobran ' + sobran.join(', '));
  if (!faltan.length && !sobran.length) ok('el catálogo sin JavaScript está sincronizado');
}

/* 4. Nada de credenciales ni rastros del login viejo ──────── */
for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  if (/USERS\s*=\s*\{/.test(html)) errores.push(`${pagina}: contiene credenciales escritas (USERS = {...})`);
  if (/pc_crm_auth'\s*\)\s*===\s*'?erik/i.test(html)) errores.push(`${pagina}: login antiguo detectado`);
}
ok('sin credenciales ni logins escritos en el HTML');

/* 5. Un solo número de WhatsApp ───────────────────────────── */
const numeros = new Set();
for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  for (const m of html.matchAll(/wa\.me\/(\d+)(?=["'&?\s]|$)/g)) numeros.add(m[1]);
}
const numeroConfig = datos.CONFIG.WHATSAPP;
const otros = [...numeros].filter((n) => n !== numeroConfig);
if (otros.length) avisos.push('hay enlaces wa.me con números distintos al configurado: ' + otros.join(', '));
else ok('todos los enlaces de WhatsApp usan ' + numeroConfig);

/* 6. Sitemap y canonical contra SITE_URL ─────────────────── */
const site = datos.CONFIG.SITE_URL;
const sitemap = fs.readFileSync(path.join(raiz, 'sitemap.xml'), 'utf8');
if (!sitemap.includes(site)) errores.push('sitemap.xml no coincide con SITE_URL (' + site + ')');
const sinCanonical = paginas.filter((p) => p !== 'crm.html' && p !== '404.html' &&
  !fs.readFileSync(path.join(raiz, p), 'utf8').includes('rel="canonical"'));
if (sinCanonical.length) errores.push('sin canonical: ' + sinCanonical.join(', '));
if (!sinCanonical.length) ok('canonical y sitemap coherentes con ' + site);

/* 7. Sintaxis de los scripts inline ──────────────────────── */
const tmp = path.join(raiz, '.check-tmp.js');
for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  const bloques = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter((b) => !/application\/ld\+json/.test(b[0]));   // JSON-LD no es JavaScript
  bloques.forEach((bloque, i) => {
    fs.writeFileSync(tmp, bloque[1]);
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      errores.push(`${pagina} (script #${i + 1}): error de sintaxis JavaScript`);
    }
  });
}
fs.rmSync(tmp, { force: true });
ok('sintaxis JavaScript correcta en ' + paginas.length + ' páginas');

/* ── Resultado ───────────────────────────────────────────── */
console.log('');
if (avisos.length) {
  console.log('Avisos (' + avisos.length + '):');
  avisos.forEach((a) => console.log('  ! ' + a));
  console.log('');
}
if (errores.length) {
  console.log('Errores (' + errores.length + '):');
  errores.forEach((e) => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('Todo correcto ✅');
