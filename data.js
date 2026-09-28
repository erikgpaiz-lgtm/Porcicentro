/* ============================================================
   PORCICENTRO — CATÁLOGO Y UTILIDADES COMPARTIDAS  (v3.0)
   ------------------------------------------------------------
   FUENTE ÚNICA DE VERDAD de productos, precios, envío y WhatsApp.

   Este archivo funciona en dos entornos sin build:
     · Navegador  -> define  window.PC_PRODUCTS, window.PC_*, window.pcFmtQ()...
     · Node/Netlify Functions -> module.exports = { CATALOGO, ... }

   Al cambiar un precio aquí, se actualiza TODO el sitio: carrito,
   catálogo, home, footer, notas de precio y la validación del servidor.
   ============================================================ */
(function (root) {
  'use strict';

  /* ── CONFIGURACIÓN ────────────────────────────────────── */
  var CONFIG = {
    // URL pública del sitio. Si algún día se usa un dominio propio,
    // ejecuta: node scripts/set-domain.mjs https://tudominio.com
    SITE_URL: 'https://erikgpaiz-lgtm.github.io/Porcicentro',
    WHATSAPP: '50248890091',          // formato internacional, sin signos
    TEL_DISPLAY: '+502 4889-0091',
    ENVIO_GRATIS_LB: 25,              // libras para envío gratis en ciudad
    CIUDAD: 'Ciudad de Guatemala',
    HORARIO: 'Lun–Dom 8:00 AM – 5:00 PM',
    MONEDA: 'Q'
  };

  /* ── CATÁLOGO ─────────────────────────────────────────── */
  // cat: 'cerdo' (cortes estándar) | 'especial'
  // unit: 'libra' | 'unidad'   ·  min: cantidad mínima  ·  step: incremento
  var CATALOGO = [
    // ── Cortes estándar Q23.50/lb ──────────────────────────
    { id:'chuleta',   name:'Chuleta de Cerdo',   cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/chuleta', emoji:'🥩', destacado:true,
      desc:'Chuleta fresca con hueso, ideal para asar a la plancha o al horno. Jugosa y sabrosa.' },
    { id:'brazuelo',  name:'Posta de Brazuelo',  cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/brazuelo', emoji:'🍖',
      desc:'Posta del brazuelo delantero, perfecta para guisos, estofados y preparaciones largas.' },
    { id:'costilla',  name:'Costilla de Cerdo',  cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/costilla', emoji:'🍖', destacado:true,
      desc:'Costilla fresca con hueso, ideal para parrilla, horno y recetas festivas.' },
    { id:'lomocinta', name:'Lomo de Cinta',      cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/lomocinta', emoji:'🥩', destacado:true,
      desc:'Lomo de cinta magro y tierno, perfecto para medallones, escalopes y recetas gourmet.' },
    { id:'nuca',      name:'Nuca de Cerdo',      cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/nuca', emoji:'🐖',
      desc:'Nuca jugosa con buena infiltración de grasa. Excelente para asados y cocidos largos.' },
    { id:'pierna',    name:'Pierna de Cerdo',    cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/pierna', emoji:'🍖',
      desc:'Pierna fresca entera o en piezas. Perfecta para hornear en celebraciones y tamales.' },
    { id:'posta',     name:'Posta de Cerdo',     cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/posta', emoji:'🥩',
      desc:'Posta versátil, limpia y sin hueso. Ideal para guisos, picadillo y preparaciones rápidas.' },
    { id:'solomillo', name:'Solomillo de Cerdo', cat:'cerdo', price:23.50, priceUnit:'lb', unit:'libra', min:0.5, step:0.5, img:'img/foto/solomillo', emoji:'🥩',
      desc:'El corte más noble del cerdo. Suave, magro y exquisito para preparaciones especiales.' },

    // ── Especialidades ─────────────────────────────────────
    { id:'cabeza',     name:'Cabeza de Cerdo',     cat:'especial', price:140, priceUnit:'c/u', unit:'unidad', min:1,   step:1,   img:'img/foto/cabeza', emoji:'🐷',
      desc:'Cabeza entera de cerdo. Perfecta para tamales, queso de puerco y preparaciones festivas.' },

    { id:'patitas',    name:'Patitas de Cerdo',    cat:'especial', price:8,   priceUnit:'c/u', unit:'unidad', min:1,   step:1,   img:'img/patitas.svg', emoji:'🐾', destacado:true,
      desc:'Patitas frescas, ideales para escabeche, pepián y caldos reconfortantes.' },
    { id:'manteca',    name:'Manteca de Cerdo',    cat:'especial', price:10,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/manteca.svg', emoji:'🫙',
      desc:'Manteca pura de cerdo, perfecta para freír, cocinar y preparaciones tradicionales guatemaltecas.' },
    { id:'longaniza',  name:'Longaniza',           cat:'especial', price:10,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/longaniza.svg', emoji:'🌭', destacado:true,
      desc:'Longaniza artesanal elaborada con especias naturales. Perfecta para asados y desayunos.' },
    { id:'cuero',      name:'Cuero de Cerdo',      cat:'especial', price:10,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/cuero.svg', emoji:'🍥',
      desc:'Cuero fresco de cerdo, ideal para chicharrón de cuero, sopas y preparaciones regionales.' },
    { id:'carnitas',   name:'Carnitas',            cat:'especial', price:60,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/carnitas.svg', emoji:'🍲', destacado:true,
      desc:'Carnitas tiernas y jugosas, listas para servir. Perfectas para tacos, tostadas y platillos festivos.' },
    { id:'chicharron', name:'Chicharrones',        cat:'especial', price:60,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/chicharron.svg', emoji:'🥓', destacado:true,
      desc:'Chicharrón dorado y crujiente, preparado con nuestro proceso artesanal único.' },
    { id:'pinas',      name:'Piñas de Chicharrón', cat:'especial', price:65,  priceUnit:'lb',  unit:'libra',  min:0.5, step:0.5, img:'img/pina.svg', emoji:'🍢',
      desc:'Piñas de chicharrón extra crujientes, el favorito para botanas y fiestas guatemaltecas.' }
  ];

  /* ── ETIQUETAS DE CATEGORÍA ───────────────────────────── */
  var CATEGORIAS = [
    { id:'all',      label:'Todos' },
    { id:'cerdo',    label:'Cortes Q23.50/lb' },
    { id:'especial', label:'Especialidades' }
  ];


    /* ── RECETARIO (imagen de cada receta) ──────────────── */
    var RECETAS = {
      'costillas-bbq':      { img:'img/chuleta.svg',   color:'#2A0A05' },
      'chicharron-receta':  { img:'img/chicharron.svg',color:'#2A1A05' },
      'lomo-relleno':       { img:'img/lomo.svg',      color:'#1A0A14' },
      'carnitas-tacos':     { img:'img/carnitas.svg',  color:'#2A1205' },
      'caldo-patitas':      { img:'img/patitas.svg',   color:'#1A0F0A' },
      'paleta-guisada':     { img:'img/asado.svg',     color:'#25100A' },
      'tamales-cabeza':     { img:'img/cabeza.svg',    color:'#1A0508' },
      'sopa-espinazo':      { img:'img/costilla.svg',  color:'#200A05' },
      'longaniza-desayuno': { img:'img/longaniza.svg', color:'#250A0F' }
    };
    function imgReceta(id) {
      var r = RECETAS[id];
      return r ? r.img : 'img/asado.svg';
    }
    function imgDe(id) {
      var p = buscar(id);
      return p && p.img ? p.img : 'img/asado.svg';
    }

  /* ── UTILIDADES ───────────────────────────────────────── */
  function fmtQ(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    return v.toFixed(v % 1 === 0 ? 2 : 2);
  }
  function precioConEtiqueta(p) {
    return p.badge || ('Q' + fmtQ(p.price) + '/' + p.priceUnit);
  }
  function unidadCorta(item) {
    return item.unit === 'libra' ? 'lb' : item.unit === 'unidad' ? 'und' : item.unit;
  }
  function buscar(id) {
    for (var i = 0; i < CATALOGO.length; i++) if (CATALOGO[i].id === id) return CATALOGO[i];
    return null;
  }
  function totalCarrito(items) {
    return items.reduce(function (s, i) { return s + (Number(i.price) || 0) * (Number(i.qty) || 0); }, 0);
  }
  function librasCarrito(items) {
    return items.filter(function (i) { return i.unit === 'libra'; })
                .reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
  }
  function faltanParaEnvio(lbs) {
    return Math.max(0, Math.round((CONFIG.ENVIO_GRATIS_LB - lbs) * 10) / 10);
  }
  // Redondea a 2 decimales evitando los errores clásicos de coma flotante (0.1+0.2)
  function centavos(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function waLink(texto) {
    return 'https://wa.me/' + CONFIG.WHATSAPP + (texto ? '?text=' + encodeURIComponent(texto) : '');
  }
  // Zona horaria de Guatemala (UTC-6 todo el año)
  function fechaGT(iso) {
    var d = iso ? new Date(iso) : new Date();
    try {
      return d.toLocaleString('es-GT', { timeZone:'America/Guatemala', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch (e) {
      return d.toISOString().slice(0, 16).replace('T', ' ');
    }
  }

  /* ── EXPORTACIÓN DUAL ─────────────────────────────────── */
  var API = {
    CONFIG: CONFIG,
    CATALOGO: CATALOGO,
    PRODUCTOS: CATALOGO,
    CATEGORIAS: CATEGORIAS,
    fmtQ: fmtQ,
    precioConEtiqueta: precioConEtiqueta,
    unidadCorta: unidadCorta,
    buscar: buscar,
    totalCarrito: totalCarrito,
    librasCarrito: librasCarrito,
    faltanParaEnvio: faltanParaEnvio,
    centavos: centavos,
    waLink: waLink,
    fechaGT: fechaGT,
    RECETAS: RECETAS,
    imgReceta: imgReceta,
    imgDe: imgDe
  };

  if (typeof window !== 'undefined') {
    // Compatibilidad con el código existente
    window.PC_PRODUCTS = CATALOGO;
    window.PC_CATEGORIAS = CATEGORIAS;
    window.PC_CONFIG = CONFIG;
    window.PC_SITE_URL = CONFIG.SITE_URL;
    window.PC_WA = CONFIG.WHATSAPP;
    window.PC_ENVIO_LB = CONFIG.ENVIO_GRATIS_LB;
    window.PC = API;
    window.pcFmtQ = fmtQ;
    window.pcCategorias = CATEGORIAS;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
