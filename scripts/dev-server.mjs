#!/usr/bin/env node
/* ============================================================
   Servidor de desarrollo SIN dependencias
   ------------------------------------------------------------
   Levanta el sitio completo en http://localhost:8888 y monta las
   mismas funciones que usa Netlify:

     POST /api/auth      login y verificación de sesión
     POST /api/pedidos   pedidos que llegan del sitio
     GET  /api/pedidos   pedidos para el CRM (requiere sesión)
     GET/POST /api/datos clientes, pedidos y notas del CRM

   Uso:
     npm run dev            (o: node scripts/dev-server.mjs)
     PUERTO=3000 npm run dev

   Las credenciales se leen de ADMIN_USERS y AUTH_SECRET. Si no
   existen, se crea .env.local con un usuario "erik" y una
   contraseña aleatoria que se muestra una sola vez.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const puerto = Number(process.env.PUERTO || process.env.PORT || 8888);

/* ── Credenciales de desarrollo ───────────────────────────── */
function cargarEnvLocal() {
  const rutaEnv = path.join(raiz, '.env.local');
  const variables = {};
  if (fs.existsSync(rutaEnv)) {
    for (const linea of fs.readFileSync(rutaEnv, 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) variables[m[1]] = m[2];
    }
  }
  return { rutaEnv, variables };
}

function prepararCredenciales() {
  const { rutaEnv, variables } = cargarEnvLocal();
  if (variables.ADMIN_USERS && variables.AUTH_SECRET && !process.env.ADMIN_USERS) {
    Object.assign(process.env, variables);
    console.log('🔑 Credenciales leídas de .env.local (usuario «erik» por defecto).');
    return;
  }
  if (process.env.ADMIN_USERS && process.env.AUTH_SECRET) return;

  const clave = 'porci-' + crypto.randomBytes(4).toString('hex');
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave, sal, 32);
  const usuarios = { erik: 'scrypt$' + sal.toString('hex') + '$' + hash.toString('hex') };
  const secreto = crypto.randomBytes(32).toString('hex');

  fs.writeFileSync(rutaEnv,
    '# Generado por scripts/dev-server.mjs — solo para desarrollo local.\n' +
    '# En Netlify estas variables se configuran en el panel del sitio.\n' +
    'ADMIN_USERS=' + JSON.stringify(usuarios) + '\n' +
    'AUTH_SECRET=' + secreto + '\n');
  process.env.ADMIN_USERS = JSON.stringify(usuarios);
  process.env.AUTH_SECRET = secreto;

  console.log('');
  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│  Credenciales de desarrollo (guardadas en .env.local)    │');
  console.log('│                                                          │');
  console.log('│    usuario:      erik                                    │');
  console.log('│    contraseña:   ' + clave.padEnd(38) + '│');
  console.log('└──────────────────────────────────────────────────────────┘');
  console.log('');
}

prepararCredenciales();

/* ── Funciones de Netlify montadas en local ───────────────── */
const funciones = {
  '/api/auth': (await import('../netlify/functions/auth.mjs')).default,
  '/api/pedidos': (await import('../netlify/functions/pedidos.mjs')).default,
  '/api/datos': (await import('../netlify/functions/datos.mjs')).default
};

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function leerCuerpo(req) {
  return new Promise((resolve) => {
    const partes = [];
    req.on('data', (c) => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes)));
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  // ── API ────────────────────────────────────────────────
  const funcion = funciones[url.pathname];
  if (funcion) {
    const cuerpo = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await leerCuerpo(req) : undefined;
    const peticion = new Request('http://localhost' + url.pathname + url.search, {
      method: req.method,
      headers: req.headers,
      body: cuerpo && cuerpo.length ? cuerpo : undefined
    });
    try {
      const respuesta = await funcion(peticion);
      const texto = await respuesta.text();
      res.writeHead(respuesta.status, {
        'Content-Type': respuesta.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': respuesta.headers.get('cache-control') || 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(texto);
      console.log(req.method, url.pathname, '→', respuesta.status);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Error en la función: ' + e.message }));
      console.error('✗', req.method, url.pathname, e);
    }
    return;
  }

  // ── Archivos del sitio ─────────────────────────────────
  let ruta = decodeURIComponent(url.pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(raiz, ruta);
  const seguro = archivo.startsWith(raiz) && !archivo.includes(path.join('netlify')) && !archivo.includes('.env');

  if (seguro && fs.existsSync(archivo) && fs.statSync(archivo).isFile()) {
    res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(raiz, '404.html')).pipe(res);
});

servidor.listen(puerto, '0.0.0.0', () => {
  console.log('');
  console.log('🐖 PorciCentro en marcha');
  console.log('   Sitio:  http://localhost:' + puerto + '/');
  console.log('   CRM:    http://localhost:' + puerto + '/crm.html');
  console.log('   Los datos se guardan en .datos-locales/ (borra la carpeta para empezar de cero).');
  console.log('');
});
