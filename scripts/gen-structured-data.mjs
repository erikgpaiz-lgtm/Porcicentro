#!/usr/bin/env node
/* ============================================================
   Genera, a partir de data.js:
     · los datos estructurados (JSON-LD) de cada página, para que
       Google muestre precios, horario y datos de la tienda;
     · la lista del catálogo del <noscript> de productos.html,
       que es lo que ven los navegadores sin JavaScript;
     · el sitemap.xml y el robots.txt con el dominio correcto.

   Uso:  node scripts/gen-structured-data.mjs
   (vuelve a ejecutarlo cada vez que cambien los precios)
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
const datos = require(path.join(raiz, 'data.js'));
const { CONFIG, CATALOGO, CATEGORIAS } = datos;

const S = CONFIG.SITE_URL;
const INICIO = '<!-- PC:JSONLD -->';
const FIN = '<!-- /PC:JSONLD -->';

const tel = '+' + CONFIG.WHATSAPP;
const telBonito = '+502 4889-0091';

const tienda = {
  '@type': 'Store',
  '@id': S + '/#tienda',
  name: 'PorciCentro',
  description: 'Distribuidora mayorista de carne de cerdo fresca en Guatemala. Cortes del día, precios claros y envío gratis con 25+ libras en la ciudad.',
  url: S + '/',
  image: S + '/og-image.png',
  logo: S + '/favicon.svg',
  telephone: tel,
  priceRange: 'Q23.50 – Q140',
  currenciesAccepted: 'GTQ',
  paymentAccepted: 'Efectivo, Transferencia bancaria, Pago contra entrega',
  address: { '@type': 'PostalAddress', addressLocality: 'Ciudad de Guatemala', addressRegion: 'Guatemala', addressCountry: 'GT' },
  areaServed: { '@type': 'City', name: 'Ciudad de Guatemala' },
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '08:00',
    closes: '17:00'
  }],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: tel,
    contactType: 'sales',
    availableLanguage: 'Spanish',
    areaServed: 'GT'
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Catálogo de cortes de cerdo',
    itemListElement: []
  }
};

function oferta(p) {
  return {
    '@type': 'Offer',
    priceCurrency: 'GTQ',
    price: p.price.toFixed(2),
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: p.price.toFixed(2),
      priceCurrency: 'GTQ',
      unitText: p.unit === 'libra' ? 'libra' : 'unidad',
      unitCode: p.unit === 'libra' ? 'LBR' : 'C62'
    },
    url: S + '/productos.html'
  };
}

function producto(p) {
  return {
    '@type': 'Product',
    name: p.name,
    description: p.desc || p.name + ' — carne de cerdo fresca, ' + (p.unit === 'libra' ? 'precio por libra' : 'precio por unidad') + '.',
    category: (CATEGORIAS.find((c) => c.id === p.cat) || {}).name || 'Carne de cerdo',
    url: S + '/productos.html',
    offers: oferta(p)
  };
}

tienda.hasOfferCatalog.itemListElement = CATALOGO.map((p, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  item: producto(p)
}));

const migas = (nombre, url) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: S + '/' },
    { '@type': 'ListItem', position: 2, name: nombre, item: S + '/' + url }
  ]
});

const paginas = {
  'index.html': [
    tienda,
    {
      '@type': 'WebSite',
      '@id': S + '/#sitio',
      url: S + '/',
      name: 'PorciCentro',
      inLanguage: 'es-GT',
      publisher: { '@id': S + '/#tienda' },
      description: 'Carne de cerdo fresca al mayoreo en Ciudad de Guatemala. Cortes desde Q23.50 la libra, entrega a domicilio.'
    }
  ],
  'productos.html': [
    {
      '@type': 'ItemList',
      name: 'Cortes y precios',
      numberOfItems: CATALOGO.length,
      itemListElement: CATALOGO.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: producto(p) }))
    },
    migas('Productos', 'productos.html')
  ],
  'recetario.html': [
    migas('Recetario', 'recetario.html'),
    { '@type': 'CollectionPage', name: 'Recetario de cerdo', inLanguage: 'es-GT', isPartOf: { '@id': S + '/#sitio' } }
  ],
  'nosotros.html': [
    migas('Nosotros', 'nosotros.html'),
    { '@type': 'AboutPage', name: 'Sobre PorciCentro', inLanguage: 'es-GT', isPartOf: { '@id': S + '/#sitio' } }
  ],
  'trabaja.html': [
    migas('Trabaja con Nosotros', 'trabaja.html'),
    {
      '@type': 'WebPage',
      name: 'Trabaja con Nosotros — PorciCentro',
      inLanguage: 'es-GT',
      isPartOf: { '@id': S + '/#sitio' },
      description: 'Únete al equipo de PorciCentro: vacantes en Guatemala, postúlate por WhatsApp al ' + telBonito + '.'
    }
  ],
  'privacidad.html': [
    migas('Aviso de Privacidad', 'privacidad.html'),
    { '@type': 'WebPage', name: 'Aviso de Privacidad — PorciCentro', inLanguage: 'es-GT', isPartOf: { '@id': S + '/#sitio' } }
  ],
  'contacto.html': [
    tienda,
    migas('Contacto', 'contacto.html'),
    { '@type': 'ContactPage', name: 'Contacto — PorciCentro', inLanguage: 'es-GT', isPartOf: { '@id': S + '/#sitio' } }
  ]
};

let cambios = 0;
for (const [archivo, bloques] of Object.entries(paginas)) {
  const ruta = path.join(raiz, archivo);
  let html = fs.readFileSync(ruta, 'utf8');

  // 1. precarga del servidor de fuentes (rendimiento)
  if (!html.includes('fonts.gstatic.com')) {
    html = html.replace(
      /(<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">)/,
      '$1\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    );
  }

  // 2. bloque JSON-LD
  const json = bloques.length === 1 ? bloques[0] : { '@context': 'https://schema.org', '@graph': bloques };
  const jsonConContexto = bloques.length === 1 ? { '@context': 'https://schema.org', ...bloques[0] } : json;
  const bloque = INICIO + '\n<script type="application/ld+json">\n' +
    JSON.stringify(jsonConContexto, null, 2) + '\n</script>\n' + FIN;

  if (html.includes(INICIO)) {
    html = html.replace(new RegExp(INICIO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + FIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), () => bloque);
  } else {
    html = html.replace('</head>', bloque + '\n</head>');
  }

  fs.writeFileSync(ruta, html);
  cambios++;
  console.log('  ✓', archivo, '(' + bloques.length + ' bloque(s))');
}

/* ── Catálogo sin JavaScript (productos.html <noscript>) ──── */
const listaSinJS =
  '<ul style="margin-top:10px;display:grid;gap:6px;font-size:.9rem;color:var(--gris);line-height:1.5">\n' +
  CATALOGO.map((p) => '      <li><strong>' + p.name + '</strong> — Q' + datos.fmtQ(p.price) + ' / ' + p.priceUnit + '</li>').join('\n') +
  '\n      </ul>';

const rutaProductos = path.join(raiz, 'productos.html');
let htmlProd = fs.readFileSync(rutaProductos, 'utf8');
const abre = htmlProd.indexOf('<ul style="margin-top:10px');
const cierra = abre > -1 ? htmlProd.indexOf('</ul>', abre) : -1;

if (abre > -1 && cierra > -1) {
  htmlProd = htmlProd.slice(0, abre) + listaSinJS + htmlProd.slice(cierra + '</ul>'.length);
  fs.writeFileSync(rutaProductos, htmlProd);
  console.log('  ✓ productos.html (catálogo sin JavaScript: ' + CATALOGO.length + ' precios)');
}

/* ── sitemap.xml y robots.txt (con SITE_URL de data.js) ───── */
const principales = ['', 'productos.html', 'recetario.html', 'contacto.html', 'nosotros.html', 'trabaja.html', 'privacidad.html'];
const prioridad = { '': '1.0', 'productos.html': '0.9', 'recetario.html': '0.8', 'contacto.html': '0.8', 'nosotros.html': '0.6', 'trabaja.html': '0.5', 'privacidad.html': '0.3' };
const hoy = new Date().toISOString().slice(0, 10);

const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  principales.map((p) => '  <url>\n    <loc>' + S + '/' + p + '</loc>\n    <lastmod>' + hoy +
    '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' + prioridad[p] + '</priority>\n  </url>').join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(raiz, 'sitemap.xml'), sitemap);
console.log('  ✓ sitemap.xml (' + principales.length + ' páginas)');

const robots = [
  '# PorciCentro — robots.txt',
  'User-agent: *',
  'Allow: /',
  '',
  '# El panel de administración no debe indexarse ni rastrearse',
  'Disallow: /crm.html',
  'Disallow: /api/',
  '',
  'Sitemap: ' + S + '/sitemap.xml',
  ''
].join('\n');
fs.writeFileSync(path.join(raiz, 'robots.txt'), robots);
console.log('  ✓ robots.txt');
console.log('');

console.log('Datos estructurados actualizados en', cambios, 'páginas.');
console.log('Productos incluidos:', CATALOGO.length, '· teléfono', telBonito);
