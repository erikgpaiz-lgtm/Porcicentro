/* ============================================================
   PORCICENTRO — SHARED JS v2.0
   ============================================================ */

// ── PRODUCT DATA ──────────────────────────────────────────
window.PC_PRODUCTS = [
  // ── Cortes estándar Q23.50/lb ──────────────────────────
  { id:'chuleta',    name:'Chuleta de Cerdo',      cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Chuleta fresca con hueso, ideal para asar a la plancha o al horno. Jugosa y sabrosa.' },
  { id:'brazuelo',   name:'Posta de Brazuelo',     cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Posta del brazuelo delantero, perfecta para guisos, estofados y preparaciones largas.' },
  { id:'costilla',   name:'Costilla de Cerdo',     cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Costilla fresca con hueso, ideal para parrilla, horno y recetas festivas.' },
  { id:'lomocinta',  name:'Lomo de Cinta',         cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Lomo de cinta magro y tierno, perfecto para medallones, escalopes y recetas gourmet.' },
  { id:'nuca',       name:'Nuca de Cerdo',         cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Nuca jugosa con buena infiltración de grasa. Excelente para asados y cocidos largos.' },
  { id:'pierna',     name:'Pierna de Cerdo',       cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Pierna fresca entera o en piezas. Perfecta para hornear en celebraciones y tamales.' },
  { id:'posta',      name:'Posta de Cerdo',        cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'Posta versátil, limpia y sin hueso. Ideal para guisos, picadillo y preparaciones rápidas.' },
  { id:'solomillo',  name:'Solomillo de Cerdo',    cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5,
    desc:'El corte más noble del cerdo. Suave, magro y exquisito para preparaciones especiales.' },

  // ── Especialidades y precio diferenciado ───────────────
  { id:'cabeza',     name:'Cabeza de Cerdo',       cat:'especial', price:140,  priceUnit:'c/u',  unit:'unidad', min:1,   step:1,
    desc:'Cabeza entera de cerdo. Perfecta para tamales, queso de puerco y preparaciones festivas.', badge:'Q140 c/u' },
  { id:'patitas',    name:'Patitas de Cerdo',      cat:'especial', price:8,    priceUnit:'c/u',  unit:'unidad', min:1,   step:1,
    desc:'Patitas frescas, ideales para escabeche, pepián y caldos reconfortantes.', badge:'Q8 c/u' },
  { id:'manteca',    name:'Manteca de Cerdo',      cat:'especial', price:10,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Manteca pura de cerdo, perfecta para freír, cocinar y preparaciones tradicionales guatemaltecas.', badge:'Q10/lb' },
  { id:'longaniza',  name:'Longaniza',             cat:'especial', price:10,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Longaniza artesanal elaborada con especias naturales. Perfecta para asados y desayunos.', badge:'Q10/lb' },
  { id:'cuero',      name:'Cuero de Cerdo',        cat:'especial', price:10,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Cuero fresco de cerdo, ideal para chicharrón de cuero, sopas y preparaciones regionales.', badge:'Q10/lb' },
  { id:'carnitas',   name:'Carnitas',              cat:'especial', price:60,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Carnitas tiernas y jugosas, listas para servir. Perfectas para tacos, tostadas y platillos festivos.', badge:'Q60/lb' },
  { id:'chicharron', name:'Chicharrones',          cat:'especial', price:60,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Chicharrón dorado y crujiente, preparado con nuestro proceso artesanal único.', badge:'Q60/lb' },
  { id:'pinas',      name:'Piñas de Chicharrón',  cat:'especial', price:65,   priceUnit:'lb',   unit:'libra',  min:0.5, step:0.5,
    desc:'Piñas de chicharrón extra crujientes, el favorito para botanas y fiestas guatemaltecas.', badge:'Q65/lb' },
];

// ── CART STATE ────────────────────────────────────────────
window.PC_CART = {};

window.pcAddToCart = function(id, qty) {
  const p = window.PC_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const q = qty || p.min;
  if (window.PC_CART[id]) {
    window.PC_CART[id].qty = Math.round((window.PC_CART[id].qty + q) * 100) / 100;
  } else {
    window.PC_CART[id] = { ...p, qty: q };
  }
  if (typeof window.pcRenderCart === 'function') window.pcRenderCart();
  pcToast('✓ ' + p.name + ' agregado al pedido');
};

window.pcChangeQty = function(id, delta) {
  if (!window.PC_CART[id]) return;
  const item = window.PC_CART[id];
  const nq = Math.round((item.qty + delta * item.step) * 100) / 100;
  if (nq < item.min) { window.pcRemoveItem(id); return; }
  item.qty = nq;
  if (typeof window.pcRenderCart === 'function') window.pcRenderCart();
};

window.pcRemoveItem = function(id) {
  delete window.PC_CART[id];
  if (typeof window.pcRenderCart === 'function') window.pcRenderCart();
};

window.pcSendWA = function() {
  const items = Object.values(window.PC_CART);
  if (!items.length) { pcToast('Agrega productos primero 😊'); return; }
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const lbs = items.filter(i => i.unit === 'libra').reduce((s, i) => s + i.qty, 0);
  let msg = '🐷 *PEDIDO PORCICENTRO*\n━━━━━━━━━━━━━━━━━━\n';
  items.forEach(i => {
    const uLabel = i.unit === 'libra' ? 'lb' : i.unit === 'unidad' ? 'und' : i.unit;
    const sub = (i.price * i.qty).toFixed(2);
    msg += `▸ *${i.name}* — ${i.qty} ${uLabel} × Q${i.price.toFixed(2)} = *Q${sub}*\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: Q${total.toFixed(2)}*\n`;
  if (lbs >= 25) msg += `🚚 *Envío GRATIS* (${lbs}lb en ciudad)\n`;
  else if (lbs > 0) msg += `🚚 Envío a coordinar (${lbs}lb)\n`;
  msg += '\n_Por favor coordinar fecha y hora de entrega. ¡Gracias! 🙏_';
  window.open('https://wa.me/50248890091?text=' + encodeURIComponent(msg), '_blank');
};

// ── TOAST ─────────────────────────────────────────────────
let _toastTimer;
window.pcToast = function(msg) {
  let el = document.getElementById('pc-toast');
  if (!el) { el = document.createElement('div'); el.id='pc-toast'; el.className='toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
};

// ── MOBILE MENU ───────────────────────────────────────────
window.pcToggleMenu = function() {
  document.getElementById('pc-burger')?.classList.toggle('open');
  document.getElementById('pc-mob-nav')?.classList.toggle('open');
  document.body.style.overflow = document.getElementById('pc-mob-nav')?.classList.contains('open') ? 'hidden' : '';
};
window.pcCloseMenu = function() {
  document.getElementById('pc-burger')?.classList.remove('open');
  document.getElementById('pc-mob-nav')?.classList.remove('open');
  document.body.style.overflow = '';
};

// ── SCROLL REVEAL ─────────────────────────────────────────
window.pcInitReveal = function() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold:0.07, rootMargin:'0px 0px -20px 0px' });
  document.querySelectorAll('.rv').forEach(el => obs.observe(el));
};

// ── NAV SCROLL ────────────────────────────────────────────
window.pcInitNav = function() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive:true });
  onScroll();
};

// ── ESC KEY ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { pcCloseMenu(); pcCloseCart?.(); }
});

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  pcInitNav();
  pcInitReveal();
});
