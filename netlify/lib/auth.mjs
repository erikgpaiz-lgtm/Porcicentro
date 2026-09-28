/* ============================================================
   Autenticación compartida (Netlify Functions v2)
   ------------------------------------------------------------
   · Contraseñas: scrypt con sal, guardadas como
     "scrypt$<sal-hex>$<hash-hex>" en la variable ADMIN_USERS.
   · Sesiones: token firmado con HMAC-SHA256 (AUTH_SECRET).
   Genera las credenciales con:  node scripts/hash-password.mjs
   ============================================================ */
import crypto from 'node:crypto';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow'
    }, extraHeaders)
  });
}

export function usuarios() {
  try {
    const raw = JSON.parse(process.env.ADMIN_USERS || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

export function secreto() {
  return process.env.AUTH_SECRET || '';
}

export function verificarPassword(password, almacenado) {
  try {
    const [esquema, salHex, hashHex] = String(almacenado).split('$');
    if (esquema !== 'scrypt' || !salHex || !hashHex) return false;
    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = crypto.scryptSync(String(password), Buffer.from(salHex, 'hex'), esperado.length);
    return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
  } catch (e) {
    return false;
  }
}

const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

export function firmarToken(usuario, secret) {
  const payload = Buffer.from(JSON.stringify({
    u: usuario,
    exp: Date.now() + DURACION_MS
  })).toString('base64url');
  const firma = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + firma;
}

export function verificarToken(token, secret) {
  if (!token || !secret) return null;
  const partes = String(token).split('.');
  if (partes.length !== 2) return null;
  const firmaEsperada = crypto.createHmac('sha256', secret).update(partes[0]).digest('base64url');
  const a = Buffer.from(partes[1]);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const datos = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
    if (!datos.exp || datos.exp < Date.now()) return null;
    return datos;
  } catch (e) {
    return null;
  }
}

export function tokenDePeticion(req) {
  const cabecera = req.headers.get('authorization') || '';
  return cabecera.replace(/^Bearer\s+/i, '');
}
