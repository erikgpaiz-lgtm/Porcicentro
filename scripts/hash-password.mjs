#!/usr/bin/env node
/* ============================================================
   Genera la variable ADMIN_USERS para el login del CRM.
   ------------------------------------------------------------
   Uso:
     node scripts/hash-password.mjs erik 'mi-contraseña-segura'
     node scripts/hash-password.mjs erik 'otra-clave' --agregar
   (--agregar imprime el JSON completo con los usuarios actuales
    de ADMIN_USERS, para no reescribir todo a mano.)
   ============================================================ */
import crypto from 'node:crypto';

const [, , usuario, password, ...resto] = process.argv;
const agregar = resto.includes('--agregar');

if (!usuario || !password) {
  console.error('Uso: node scripts/hash-password.mjs <usuario> <contraseña> [--agregar]');
  process.exit(1);
}

const sal = crypto.randomBytes(16);
const hash = crypto.scryptSync(password, sal, 32);
const guardado = 'scrypt$' + sal.toString('hex') + '$' + hash.toString('hex');

let usuarios = {};
if (agregar && process.env.ADMIN_USERS) {
  try {
    const actuales = JSON.parse(process.env.ADMIN_USERS);
    if (actuales && typeof actuales === 'object') usuarios = actuales;
    else console.error('Aviso: ADMIN_USERS no es un objeto JSON; se generará de cero.');
  } catch (e) {
    console.error('Aviso: ADMIN_USERS actual no es JSON válido; se generará de cero.');
  }
}

usuarios[usuario.toLowerCase()] = guardado;

console.log('');
console.log('Usuario:', usuario.toLowerCase());
console.log('');
console.log('ADMIN_USERS =');
console.log(JSON.stringify(usuarios));
console.log('');
console.log('AUTH_SECRET =');
console.log(crypto.randomBytes(32).toString('hex'));
console.log('');
console.log('Copia ambas en Netlify → Project configuration → Environment variables.');
