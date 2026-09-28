/* ============================================================
   PORCICENTRO — SHARED JS v3.0
   ------------------------------------------------------------
   Requiere data.js (cargado antes). Sin dependencias ni build.
   Incluye: carrito persistente, render de catálogo, envío de
   pedidos (API + WhatsApp con respaldo), accesibilidad y toasts.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.PC_CONFIG || { WHATSAPP:'50248890091', ENVIO_GRATIS_LB:25, MONEDA:'Q', SITE_URL:'' };
  var PRODUCTOS = window.PC_PRODUCTS || [];
  var CART_KEY = 'pc_cart_v1';

  /* ── ESTADO ───────────────────────────────────────────── */
  // { id: { qty } } — el precio siempre se resuelve desde data.js,
  // así el carrito nunca muestra un precio viejo.
  window.PC_CART = pcLoadCart();

  function pcLoadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      var clean = {};
      Object.keys(raw).forEach(function (id) {
        var qty = Number(raw[id] && raw[id].qty);
        if (PRODUCTOS.some(function (p) { return p.id === id; }) && qty > 0) clean[id] = { qty: qty };
      });
      return clean;
    } catch (e) { return {}; }
  }
  function pcSaveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(window.PC_CART)); } catch (e) {}
  }
  function items() {
    return Object.keys(window.PC_CART).map(function (id) {
      var p = window.PC.buscar(id);
      return p ? Object.assign({}, p, { qty: window.PC_CART[id].qty }) : null;
    }).filter(Boolean);
  }
  function total() { return window.PC.totalCarrito(items()); }
  function libras() { return window.PC.librasCarrito(items()); }
  function fmt(n) { return window.PC.fmtQ(n); }

  /* ── TOAST ────────────────────────────────────────────── */
  var _toastTimer;
  window.pcToast = function (msg, tipo) {
    var el = document.getElementById('pc-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pc-toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.toggle('toast-error', tipo === 'error');
    el.classList.add('on');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { el.classList.remove('on'); }, 3200);
  };

  /* ── ENLACES DE WHATSAPP Y TELÉFONO (fuente única) ────── */
  window.pcHydrateLinks = function () {
    var wa = 'https://wa.me/' + CFG.WHATSAPP;
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
      var q = a.getAttribute('href').indexOf('?');
      if (q > -1 && a.getAttribute('href').indexOf('text=') > -1) return; // conserva mensajes dinámicos
      a.href = wa;
    });
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) { a.href = 'tel:+' + CFG.WHATSAPP; });
    document.querySelectorAll('[data-pc-tel]').forEach(function (el) { el.textContent = window.PC.CONFIG.TEL_DISPLAY; });
  };

  /* ── ENLACE DE WHATSAPP PARA UN TELÉFONO CUALQUIERA ──── */
  // Normaliza el teléfono de un cliente: agrega el código de país desde
  // la configuración (una sola fuente) y limpia todo lo que no sea dígito.
  window.pcWA = function (tel) {
    var solo = String(tel || '').replace(/\D/g, '');
    var pais = String(CFG.WHATSAPP).slice(0, 3);
    if (!solo) return 'https://wa.me/' + CFG.WHATSAPP;
    if (solo.indexOf(pais) === 0) return 'https://wa.me/' + solo;
    return 'https://wa.me/' + pais + solo.replace(/^0+/, '');
  };

  /* ── PRECIOS EN EL HTML (evita copiar precios a mano) ─── */
  // <span data-pc-precio="cabeza"></span>            -> Q140.00
  // <span data-pc-precio="cabeza" data-pc-unit></span> -> / c/u
  // <span data-pc-conteo></span>                     -> 16
  window.pcHydratePrecios = function () {
    document.querySelectorAll('[data-pc-precio]').forEach(function (el) {
      var p = window.PC.buscar(el.getAttribute('data-pc-precio'));
      if (!p) return;
      if (el.hasAttribute('data-pc-etiqueta')) el.textContent = window.PC.precioConEtiqueta(p);
      else if (el.hasAttribute('data-pc-unit')) el.textContent = '/' + p.priceUnit;
      else el.textContent = CFG.MONEDA + fmt(p.price);
    });
    document.querySelectorAll('[data-pc-conteo]').forEach(function (el) { el.textContent = PRODUCTOS.length; });
    document.querySelectorAll('[data-pc-envio]').forEach(function (el) { el.textContent = CFG.ENVIO_GRATIS_LB + ' lb'; });
  };

  /* ── TARJETA DE PRODUCTO (una sola implementación) ────── */
  /* ── FOTO RESPONSIVA (WebP + JPG, 450/900, con carga diferida) ── */
  // Un solo lugar para todas las imágenes de producto y receta: si mañana se
  // cambian las medidas, se cambian aquí y no en cada página.
  window.pcFoto = function (base, alt, tamanos, prioridad) {
    var sizes = tamanos || '(max-width:640px) 92vw, (max-width:1100px) 44vw, 380px';
    if (base && base.indexOf('.svg') > -1) {
      return '<img class="cut-img-arte" src="' + base + '" alt="' + alt + '" loading="lazy" decoding="async">';
    }
    return '<picture>' +
        '<source type="image/webp" srcset="' + base + '-450.webp 450w, ' + base + '-900.webp 900w" sizes="' + sizes + '">' +
        '<img src="' + base + '-450.jpg" srcset="' + base + '-450.jpg 450w, ' + base + '-900.jpg 900w" sizes="' + sizes +
          '" alt="' + alt + '" width="900" height="675" ' + (prioridad ? 'fetchpriority="high"' : 'loading="lazy"') + ' decoding="async">' +
      '</picture>';
  };

  window.pcProductCard = function (p, opciones) {
    var mostrarSello = p.destacado && !(opciones && opciones.sinSello);
    var bc = p.cat === 'especial' ? 'badge-spc' : p.cat === 'economico' ? 'badge-eco' : 'badge-std';
    var alt = p.name + ' fresco de PorciCentro' + (p.unit === 'libra' ? ', precio por libra' : '');
    var media = window.pcFoto(p.img || 'img/foto/chuleta', alt);

    return '<div class="cut-card rv" data-cat="' + p.cat + '" data-id="' + p.id + '">' +
      '<div class="cut-img">' + media +
        '<div class="cut-badge ' + bc + '">' + window.PC.precioConEtiqueta(p) + '</div>' +
        (mostrarSello ? '<div class="cut-flag">★ Más vendido</div>' : '') +
      '</div>' +
      '<div class="cut-body">' +
        '<h3 class="cut-name">' + p.name + '</h3>' +
        '<p class="cut-desc">' + p.desc + '</p>' +
        '<div class="cut-foot">' +
          '<div class="cut-precio">' +
            '<div class="cut-price">Q' + fmt(p.price) + '</div>' +
            '<span class="cut-unit">/ ' + p.priceUnit + '</span>' +
            '<span class="cut-min">mínimo ' + (p.min === 0.5 ? '½' : fmt(p.min)) + ' ' + p.priceUnit + '</span>' +
          '</div>' +
          '<div class="cut-acts">' +
            '<div class="qty-row">' +
              '<button class="q-btn" type="button" aria-label="Quitar ' + p.step + ' ' + p.priceUnit + ' de ' + p.name + '" onclick="pcQty(\'' + p.id + '\',-' + p.step + ')">−</button>' +
              '<input class="q-inp" id="pc-q-' + p.id + '" type="number" value="' + p.min + '" min="' + p.min + '" step="' + p.step + '" readonly aria-label="Cantidad de ' + p.name + ' en ' + p.priceUnit + '">' +
              '<button class="q-btn" type="button" aria-label="Agregar ' + p.step + ' ' + p.priceUnit + ' de ' + p.name + '" onclick="pcQty(\'' + p.id + '\',' + p.step + ')">+</button>' +
            '</div>' +
            '<button class="add-btn" type="button" id="pc-a-' + p.id + '" onclick="pcAddFromCard(\'' + p.id + '\')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Agregar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  window.pcRenderCatalogo = function (contenedor, soloDestacados) {
    var el = typeof contenedor === 'string' ? document.getElementById(contenedor) : contenedor;
    if (!el) return;
    var lista = soloDestacados ? PRODUCTOS.filter(function (p) { return p.destacado; }) : PRODUCTOS;
    el.innerHTML = lista.map(function (p) { return window.pcProductCard(p, { sinSello: !!soloDestacados }); }).join('');
  };

  window.pcQty = function (id, delta) {
    var inp = document.getElementById('pc-q-' + id);
    var p = window.PC.buscar(id);
    if (!inp || !p) return;
    inp.value = Math.max(p.min, window.PC.centavos(parseFloat(inp.value) + delta));
  };

  window.pcAddFromCard = function (id) {
    var inp = document.getElementById('pc-q-' + id);
    var p = window.PC.buscar(id);
    if (!p) return;
    window.pcAddToCart(id, inp ? parseFloat(inp.value) : p.min);
    var btn = document.getElementById('pc-a-' + id);
    if (btn) {
      btn.classList.add('done');
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>¡Listo!';
      setTimeout(function () {
        btn.classList.remove('done');
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Agregar';
      }, 2000);
    }
    window.pcOpenCart();
  };

  /* ── FILTROS DE CATÁLOGO ──────────────────────────────── */
  window.pcFiltrar = function (cat, btn) {
    document.querySelectorAll('.f-btn, .rf-btn').forEach(function (b) {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    document.querySelectorAll('.cut-card[data-cat], .rec-card[data-cat]').forEach(function (c) {
      c.classList.toggle('hidden', cat !== 'all' && c.getAttribute('data-cat') !== cat);
    });
    var grid = document.getElementById('prod-grid');
    if (grid) {
      var visibles = grid.querySelectorAll('.cut-card:not(.hidden)').length;
      var viva = document.getElementById('pc-catalogo-vivo');
      if (viva) viva.textContent = visibles + (visibles === 1 ? ' corte visible' : ' cortes visibles');
    }
  };

  /* ── CARRITO: ACCIONES ────────────────────────────────── */
  window.pcAddToCart = function (id, qty) {
    var p = window.PC.buscar(id);
    if (!p) return;
    var q = Number(qty) || p.min;
    if (window.PC_CART[id]) window.PC_CART[id].qty = window.PC.centavos(window.PC_CART[id].qty + q);
    else window.PC_CART[id] = { qty: q };
    pcSaveCart();
    window.pcRenderCart();
    window.pcToast('✓ ' + p.name + ' agregado al pedido');
  };

  window.pcChangeQty = function (id, delta) {
    var p = window.PC.buscar(id);
    if (!p || !window.PC_CART[id]) return;
    var nq = window.PC.centavos(window.PC_CART[id].qty + delta * p.step);
    if (nq < p.min) { window.pcRemoveItem(id); return; }
    window.PC_CART[id].qty = nq;
    pcSaveCart();
    window.pcRenderCart();
  };

  window.pcRemoveItem = function (id) {
    delete window.PC_CART[id];
    pcSaveCart();
    window.pcRenderCart();
  };

  window.pcClearCart = function () {
    if (!items().length) return;
    if (!confirm('¿Vaciar todo el pedido?')) return;
    window.PC_CART = {};
    pcSaveCart();
    window.pcRenderCart();
    window.pcToast('Pedido vaciado');
  };

  /* ── CARRITO: UI ──────────────────────────────────────── */
  window.pcEnsureCartUI = function () {
    if (document.getElementById('cart-drawer')) return;
    // El CRM no tiene tienda: no inyectamos el carrito donde no hay navegación pública.
    if (!document.querySelector('.nav') && !document.querySelector('.nav-cart')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="cart-overlay" id="cart-overlay" onclick="pcCloseCart()"></div>' +
      '<aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Tu pedido" aria-hidden="true">' +
        '<div class="cart-hd"><h2 class="cart-hd-title">Tu Pedido</h2>' +
        '<button class="cart-hd-close" type="button" aria-label="Cerrar pedido" onclick="pcCloseCart()"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<div id="cart-content" class="cart-content"></div>' +
        '<div id="cart-ft"></div>' +
      '</aside>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
    var drawer = document.getElementById('cart-drawer');
    if (drawer) { drawer.style.display = 'flex'; drawer.style.flexDirection = 'column'; }
  };

  window.pcRenderCart = function () {
    var list = items();
    var badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = list.length;
      badge.classList.toggle('on', list.length > 0);
    }
    var cta = document.getElementById('pc-cta-count');
    if (cta) {
      cta.textContent = list.length;
      cta.parentElement.classList.toggle('on', list.length > 0);
    }
    var cc = document.getElementById('cart-content');
    var cf = document.getElementById('cart-ft');
    if (!cc || !cf) return;

    if (!list.length) {
      cc.innerHTML = '<div class="cart-empty-state">' +
        '<div class="ce-ico" aria-hidden="true">🛒</div>' +
        '<h3>Tu pedido está vacío</h3>' +
        '<p>Agrega cortes y te los enviamos frescos hoy mismo.</p>' +
        '<a class="btn btn-primary" href="productos.html" onclick="pcCloseCart()">Ver Catálogo</a>' +
      '</div>';
      cf.innerHTML = '';
      return;
    }

    cc.innerHTML = '<div class="cart-body">' + list.map(function (item) {
      var u = item.unit === 'libra' ? 'lb' : 'u';
      return '<div class="cart-item">' +
        '<div class="ci-info">' +
          '<div class="ci-name">' + item.name + '</div>' +
          '<div class="ci-rate">Q' + fmt(item.price) + '/' + u + '</div>' +
          '<div class="ci-qty">' +
            '<button class="ci-q-btn" type="button" aria-label="Quitar una porción de ' + item.name + '" onclick="pcChangeQty(\'' + item.id + '\',-1)">−</button>' +
            '<span class="ci-q-val">' + item.qty + ' ' + u + '</span>' +
            '<button class="ci-q-btn" type="button" aria-label="Agregar una porción de ' + item.name + '" onclick="pcChangeQty(\'' + item.id + '\',1)">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="ci-right">' +
          '<div class="ci-total">Q' + fmt(item.price * item.qty) + '</div>' +
          '<button class="ci-del" type="button" aria-label="Eliminar ' + item.name + ' del pedido" onclick="pcRemoveItem(\'' + item.id + '\')"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    var lbs = libras();
    var falta = window.PC.faltanParaEnvio(lbs);
    var sm = '';
    if (lbs >= CFG.ENVIO_GRATIS_LB) {
      sm = '<div class="ship-msg ship-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>¡Envío <strong>GRATIS</strong> en ciudad! 🎉</span></div>';
    } else if (lbs > 0) {
      sm = '<div class="ship-msg ship-warn"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Agrega <strong>' + falta + ' lb más</strong> para envío gratis</span></div>';
    }

    cf.innerHTML = '<div class="cart-ft">' +
      '<div class="cart-totals">' +
        '<div class="cart-row"><span>Subtotal</span><span>Q' + fmt(total()) + '</span></div>' +
        '<div class="cart-row"><span>Envío</span><span>' + (lbs >= CFG.ENVIO_GRATIS_LB ? 'Gratis' : 'A coordinar') + '</span></div>' +
        '<div class="cart-row total"><span>TOTAL</span><span>Q' + fmt(total()) + '</span></div>' +
      '</div>' + sm +
      '<div class="cart-actions">' +
        '<button class="wa-send-btn" type="button" onclick="pcSendWA(this)">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
          'Enviar Pedido por WhatsApp' +
        '</button>' +
        '<button class="cart-clear" type="button" onclick="pcClearCart()">Vaciar pedido</button>' +
      '</div>' +
    '</div>';
  };

  var _lastFocus = null;
  window.pcOpenCart = function () {
    window.pcEnsureCartUI();
    var ov = document.getElementById('cart-overlay');
    var dr = document.getElementById('cart-drawer');
    if (!ov || !dr) return;
    _lastFocus = document.activeElement;
    ov.classList.add('on');
    dr.classList.add('on');
    dr.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var btn = dr.querySelector('.cart-hd-close');
    if (btn) btn.focus();
  };

  window.pcCloseCart = function () {
    var ov = document.getElementById('cart-overlay');
    var dr = document.getElementById('cart-drawer');
    if (!ov || !dr) return;
    ov.classList.remove('on');
    dr.classList.remove('on');
    dr.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_lastFocus && _lastFocus.focus) _lastFocus.focus();
  };

  /* ── MENSAJE DEL PEDIDO ───────────────────────────────── */
  window.pcOrderMessage = function (list, tot, lbs) {
    var msg = '🐷 *PEDIDO PORCICENTRO*\n━━━━━━━━━━━━━━━━━━\n';
    list.forEach(function (i) {
      msg += '▸ *' + i.name + '* — ' + i.qty + ' ' + window.PC.unidadCorta(i) +
             ' × Q' + fmt(i.price) + ' = *Q' + fmt(i.price * i.qty) + '*\n';
    });
    msg += '━━━━━━━━━━━━━━━━━━\n💰 *TOTAL: Q' + fmt(tot) + '*\n';
    if (lbs >= CFG.ENVIO_GRATIS_LB) msg += '🚚 *Envío GRATIS* (' + lbs + ' lb en ciudad)\n';
    else if (lbs > 0) msg += '🚚 Envío a coordinar (' + lbs + ' lb)\n';
    msg += '\n_Por favor coordinar fecha y hora de entrega. ¡Gracias! 🙏_';
    return msg;
  };

  /* ── ENVÍO: REGISTRO EN SERVIDOR + WHATSAPP ───────────── */
  window.pcSendWA = function (btn) {
    var list = items();
    if (!list.length) { window.pcToast('Agrega productos primero 😊'); return; }
    var tot = total(), lbs = libras();
    var link = window.PC.waLink(window.pcOrderMessage(list, tot, lbs));

    // 1) Intentar registrar el pedido en el servidor (no bloquea la venta)
    window.pcRegistrarPedido(list, tot, lbs).then(function (res) {
      if (res && res.ok && typeof res.total === 'number' && Math.abs(res.total - tot) > 0.009) {
        window.pcToast('Precio actualizado por el servidor: Q' + fmt(res.total));
      }
    }).catch(function () {});

    // 2) Abrir WhatsApp (con respaldo si el navegador bloquea la ventana)
    window.pcAbrirEnlace(link, 'Enviar pedido por WhatsApp');
    if (btn) {
      btn.classList.add('enviado');
      btn.insertAdjacentHTML('afterend', '<p class="cart-status" role="status">Pedido registrado. Si WhatsApp no se abrió, usa el enlace de arriba.</p>');
    }
  };

  window.pcRegistrarPedido = function (list, tot, lbs) {
    var payload = {
      items: list.map(function (i) { return { id: i.id, qty: i.qty }; }),
      origen: 'web',
      pagina: location.pathname.split('/').pop() || 'index.html',
      enviogratis: lbs >= CFG.ENVIO_GRATIS_LB
    };
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    return fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) { clearTimeout(t); throw e; });
  };

  // Abre un enlace en pestaña nueva; si el navegador lo bloquea, muestra un
  // panel copiable para no perder el pedido (típico en webviews de Instagram/Facebook).
  window.pcAbrirEnlace = function (url, etiqueta) {
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) { w = null; }
    if (w && !w.closed) return;
    var box = document.getElementById('pc-fallback-link');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pc-fallback-link';
      box.className = 'fallback-link';
      box.setAttribute('role', 'alert');
      document.body.appendChild(box);
    }
    box.innerHTML = '<strong>Tu navegador bloqueó la ventana de WhatsApp.</strong>' +
      '<span>Toca el enlace para enviar tu ' + (etiqueta || 'mensaje').toLowerCase() + ':</span>' +
      '<a class="btn btn-primary btn-sm" href="' + url + '" target="_blank" rel="noopener">' + (etiqueta || 'Abrir enlace') + '</a>' +
      '<button class="fb-close" type="button" aria-label="Cerrar aviso" onclick="this.parentNode.remove()">✕</button>';
    box.querySelector('a').focus();
  };

  /* ── MENÚ MÓVIL ───────────────────────────────────────── */
  window.pcToggleMenu = function () {
    var nav = document.getElementById('pc-mob-nav');
    var burger = document.getElementById('pc-burger');
    if (!nav) return;
    var abierto = nav.classList.toggle('open');
    if (burger) {
      burger.classList.toggle('open', abierto);
      burger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    }
    nav.setAttribute('aria-hidden', abierto ? 'false' : 'true');
    document.body.style.overflow = abierto ? 'hidden' : '';
  };
  window.pcCloseMenu = function () {
    var nav = document.getElementById('pc-mob-nav');
    var burger = document.getElementById('pc-burger');
    if (!nav) return;
    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'true');
    if (burger) { burger.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    document.body.style.overflow = '';
  };

  /* ── SCROLL REVEAL ────────────────────────────────────── */
  window.pcInitReveal = function () {
    var els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.07, rootMargin: '0px 0px -20px 0px' });
    els.forEach(function (el) { obs.observe(el); });
    // Red de seguridad: si algo impide observar (contenido dinámico), se muestra igual
    setTimeout(function () {
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('visible');
      });
    }, 1200);
  };

  /* ── NAV SCROLL ───────────────────────────────────────── */
  window.pcInitNav = function () {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  /* ── FORMULARIOS → WHATSAPP (contacto, trabaja) ───────── */
  window.pcSubmitWA = function (mensaje, statusId) {
    var link = window.PC.waLink(mensaje);
    window.pcAbrirEnlace(link, 'Enviar mensaje por WhatsApp');
    var st = statusId ? document.getElementById(statusId) : null;
    if (st) {
      st.textContent = 'Listo: se abrió WhatsApp con tu mensaje. Si no apareció, usa el enlace de respaldo.';
      st.className = 'form-status ok';
    }
  };

  /* ── LLAMADA A LA ACCIÓN SIEMPRE A LA VISTA ───────────── */
  // En móvil: barra inferior con "Pedir por WhatsApp" y el pedido.
  // En escritorio: botón flotante de WhatsApp. Aparecen al bajar.
  window.pcEnsureCTA = function () {
    if (!document.querySelector('.nav') || document.getElementById('pc-cta-bar')) return;

    var barra = document.createElement('div');
    barra.className = 'pc-cta-bar';
    barra.id = 'pc-cta-bar';
    barra.innerHTML =
      '<button class="pc-cta-cart" type="button" aria-label="Ver tu pedido" onclick="pcOpenCart()">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
        '<span class="pc-cta-count" id="pc-cta-count">0</span>' +
      '</button>' +
      '<a class="pc-cta-main" href="' + 'https://wa.me/' + CFG.WHATSAPP + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>' +
        'Pedir por WhatsApp <em>' + CFG.TEL_DISPLAY + '</em>' +
      '</a>';
    document.body.appendChild(barra);

    var flotante = document.createElement('a');
    flotante.className = 'pc-wa-float';
    flotante.href = 'https://wa.me/' + CFG.WHATSAPP;
    flotante.target = '_blank';
    flotante.rel = 'noopener';
    flotante.setAttribute('aria-label', 'Escribir por WhatsApp al ' + CFG.TEL_DISPLAY);
    flotante.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>' +
      '<span class="pc-wa-tip">¿Dudas? Escríbenos<strong>' + CFG.TEL_DISPLAY + '</strong></span>';
    document.body.appendChild(flotante);

    var alScroll = function () {
      var visible = window.scrollY > 220;
      barra.classList.toggle('on', visible);
      flotante.classList.toggle('on', visible);
    };
    window.addEventListener('scroll', alScroll, { passive: true });
    alScroll();
  };

  /* ── INICIALIZACIÓN ───────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (typeof window.pcCloseMenu === 'function') window.pcCloseMenu();
    if (typeof window.pcCloseCart === 'function') window.pcCloseCart();
    var fb = document.getElementById('pc-fallback-link');
    if (fb) fb.remove();
  });

  document.addEventListener('DOMContentLoaded', function () {
    window.pcEnsureCartUI();
    window.pcEnsureCTA();
    window.pcHydrateLinks();
    window.pcHydratePrecios();
    window.pcInitNav();
    window.pcInitReveal();
    window.pcRenderCart();
    var burger = document.getElementById('pc-burger');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  });
})();
