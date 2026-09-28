# 🐖 PorciCentro — sitio web y CRM

Sitio del negocio de carne de cerdo **PorciCentro** (Ciudad de Guatemala) y su panel
de administración. No hay frameworks ni build: HTML + CSS + JavaScript plano, más
dos funciones de servidor para el login y el registro de pedidos.

| Página | Qué es |
| --- | --- |
| `index.html` | Inicio: hero, cortes destacados, valores, testimonios, FAQ |
| `productos.html` | Catálogo completo con filtros y carrito |
| `recetario.html` | 9 recetas, cada una enlazada al corte que se vende |
| `nosotros.html` | Historia, valores y por qué elegirnos |
| `trabaja.html` | Vacantes y formulario de aplicación |
| `contacto.html` | Datos de contacto, formulario y ubicación |
| `privacidad.html` | Aviso de privacidad (qué datos se usan y cómo pedir su eliminación) |
| `crm.html` | **Panel interno**: clientes, pedidos, seguimiento y pipeline |

Archivos compartidos: `data.js` (una sola fuente para precios, WhatsApp y catálogo),
`shared.js` (carrito, menú, utilidades, envío de pedidos) y `shared.css`.

---

## 1. Para escoger y ajustar el catálogo

Todo se edita en **`data.js`**:

```js
const CONFIG = {
  SITE_URL: 'https://erikgpaiz-lgtm.github.io/Porcicentro',
  WHATSAPP: '50248890091',      // sin +, sin espacios
  ENVIO_GRATIS_LB: 25,          // libras para envío gratis
  HORARIO: 'Lun a Dom · 8:00 AM – 5:00 PM'
};

const CATALOGO = [
  { id:'chuleta', name:'Chuleta de Cerdo', price:23.50, unit:'libra',
    cat:'cerdo', destacado:true, desc:'…' },
  …
];
```

Al cambiar un precio aquí, se actualiza en **todas** las páginas (catálogo, home,
recetario, nota de precios y carrito). Si además hay precios escritos a mano en
algún HTML, el cargador los reemplaza por los de `data.js` (los elementos llevan
`data-pc-precio="id"`).

Después de cambiar precios o productos conviene ejecutar:

```bash
node scripts/gen-structured-data.mjs   # regenera los datos de Google (JSON-LD)
node scripts/check.mjs                 # revisa enlaces, precios y sintaxis
```

## 2. Cambiar el dominio

```bash
node scripts/set-domain.mjs https://porcicentro.gt
```

Actualiza `SITE_URL`, los `canonical`, las etiquetas Open Graph y el `sitemap.xml`.

---

## 3. El CRM (`crm.html`)

Funciona en **dos modos**:

* **Modo servidor (recomendado).** El login se valida contra `/api/auth`; cada
  cambio del panel se guarda solo en `/api/datos` (Netlify Blobs) y los pedidos
  del sitio llegan con el botón *“🔄 Sincronizar pedidos del sitio”*. Así el CRM
  se ve igual desde cualquier dispositivo: al entrar, si el servidor tiene una
  versión más reciente, se adopta (gana el último cambio, según la fecha).
* **Modo local (sin servidor).** Si se abre el CRM en GitHub Pages o sin las
  funciones desplegadas, el panel avisa con un banner amarillo y guarda todo en el
  `localStorage` de ese navegador. Sirve para trabajar, pero **no protege el
  acceso** y los datos no se comparten: usa *“💾 Respaldar datos”* y
  *“📂 Restaurar respaldo”* para mover la información. El panel muestra en todo
  momento el estado de la nube (“☁ Guardado en el servidor”, “⚠ Sin conexión…”).

### Configurar el acceso seguro (Netlify)

0. Para probar todo sin cuenta de Netlify, salta al
   [desarrollo local](#4-desarrollo-local): `npm run dev` ya trae un usuario y un
   almacén de prueba.

1. **Crear el usuario y su contraseña** (nunca se guarda la contraseña, solo su
   hash scrypt):

   ```bash
   node scripts/hash-password.mjs erik 'MiClaveMuySegura'
   ```

   El comando imprime dos valores: `ADMIN_USERS` y `AUTH_SECRET`.
   (Si ya tienes usuarios configurados, agrega `--agregar` para no perderlos.)

2. **Cargar las variables de entorno** en Netlify →
   *Project configuration → Environment variables*:

   | Variable | Valor | Para qué |
   | --- | --- | --- |
   | `ADMIN_USERS` | `{"erik":"scrypt$…"}` | Usuarios y contraseñas del CRM |
   | `AUTH_SECRET` | cadena larga aleatoria | Firma las sesiones (12 h) |

   Sin estas dos variables las funciones responden con un error explícito que dice
   justamente cuál falta.

3. **Desplegar** el repositorio en Netlify (build: `npm install`, publish `.`).
   El archivo `netlify.toml` ya define `functions = "netlify/functions"`, las rutas
   `/api/auth` y `/api/pedidos`, y las cabeceras de seguridad.

4. Entrar a `https://TU-SITIO/crm.html`, iniciar sesión y usar
   *“🔄 Sincronizar pedidos del sitio”* para traer los pedidos hechos en la web.

> El token de sesión se guarda en `sessionStorage`: al cerrar el navegador se cierra
> la sesión. Hay un retardo de 350 ms por intento fallido para dificultar la fuerza
> bruta, pero para producción se recomienda además activar la protección por
> contraseña de Netlify (Site configuration → Access control).

### Pedidos desde el sitio web

Cuando alguien arma su pedido y toca *“Pedir por WhatsApp”*, el sitio:

1. envía el pedido a `/api/pedidos` (el servidor **recalcula el total** contra
   `data.js`, así nadie puede alterar precios desde el navegador);
2. guarda el pedido en **Netlify Blobs** (no hace falta base de datos);
3. abre WhatsApp con el mensaje listo para enviar.

Si el servidor no está disponible, el paso por WhatsApp se completa igual: el sitio
nunca depende del backend para vender. Los pedidos guardados se leen desde el CRM
con el botón de sincronizar.

---

## 4. Desarrollo local

```bash
npm install     # instala @netlify/blobs
npm run dev     # sitio + API en http://localhost:8888
```

`npm run dev` levanta un servidor propio (sin dependencias extra) que sirve el
sitio y monta las mismas funciones que usa Netlify: `/api/auth`, `/api/pedidos`
y `/api/datos`. La primera vez genera `.env.local` con un usuario de desarrollo
(**erik**) y una contraseña aleatoria que se muestra en la consola; los datos se
guardan en `.datos-locales/` (borra esa carpeta para empezar de cero). Ambos
archivos están en `.gitignore`.

Abre <http://localhost:8888/crm.html>, entra con esas credenciales y prueba el
flujo completo: agrega cortes al carrito en `/productos.html`, pulsa
*“Pedir por WhatsApp”* y luego *“🔄 Sincronizar pedidos del sitio”* en el CRM.

¿Prefieres el entorno real de Netlify? `npm run serve` (Netlify CLI) usa Blobs de
verdad. Y sin servidor alguno, abre `index.html` directamente: el carrito y el
catálogo funcionan, el CRM entra en modo local y los pedidos viajan solo por
WhatsApp.

Verificaciones antes de publicar:

```bash
node scripts/check.mjs                # enlaces, precios, noscript, sintaxis y SEO
node scripts/gen-structured-data.mjs  # deja los datos de Google al día
```

---

## 5. Publicar

* **GitHub Pages** (como está hoy): `git push origin main` — sirve el sitio
  estático; el CRM queda en modo local.
* **Netlify** (recomendado): conecta el repositorio; cada push a `main` despliega
  sitio + funciones. Con las variables de entorno configuradas, el CRM y el
  registro de pedidos quedan activos.

## 6. Imágenes

El sitio usa **fotografía de producto propia** en `img/foto/`: los 16 cortes, el
hero y los platos del recetario. Cada foto se publica en cuatro archivos para
que cargue rápido sin perder nitidez:

```
img/foto/chuleta-450.webp   450 px  (celular)   ← WebP, el más liviano
img/foto/chuleta-450.jpg    450 px              ← respaldo universal
img/foto/chuleta-900.webp   900 px  (escritorio/pantalla retina)
img/foto/chuleta-900.jpg    900 px
```

Las páginas las arman con `<picture>` + `srcset` (el helper `pcFoto()` de
`shared.js`), así el navegador elige el archivo correcto y solo descarga lo que
necesita. La ruta base de cada producto está en `data.js` (`img:'img/foto/…'`)
y la de cada receta en el mapa `RECETAS`.

**Para cambiar una foto** reemplaza los cuatro archivos con el mismo nombre, o
apunta a otra ruta desde `data.js`. Si vas a usar fotos reales del negocio
(siempre venden más que cualquier imagen de estudio):

```bash
# instala ImageMagick y genera los 4 tamaños desde una sola foto
convert original.jpg -resize 900x675^ -gravity center -extent 900x675 img/foto/chuleta-900.jpg
convert original.jpg -resize 450x338^ -gravity center -extent 450x338 img/foto/chuleta-450.jpg
# luego convierte a .webp con la herramienta que prefieras (o pídelo en el chat)
```

## 7. Estructura

```
├── index.html · productos.html · recetario.html
├── nosotros.html · trabaja.html · contacto.html · crm.html · 404.html
├── data.js          # catálogo, precios, WhatsApp, utilidades
├── shared.js        # carrito, menú, formularios, pedidos
├── shared.css       # estilos del sitio público
├── img/             # 16 ilustraciones SVG propias (cortes, despiece, hero)
├── netlify.toml     # rutas, cabeceras y configuración de despliegue
├── netlify/
│   ├── functions/auth.mjs      # POST /api/auth   (login del CRM)
│   ├── functions/pedidos.mjs   # POST /api/pedidos (web) · GET (CRM)
│   ├── functions/datos.mjs     # GET/POST /api/datos  (clientes, pedidos, notas)
│   ├── lib/store.mjs           # Netlify Blobs, con respaldo local para desarrollar
│   └── lib/auth.mjs            # scrypt + tokens HMAC
└── scripts/
    ├── hash-password.mjs       # crea usuarios del CRM
    ├── set-domain.mjs          # cambia el dominio en todo el sitio
    ├── gen-structured-data.mjs # SEO: JSON-LD, sitemap, robots, catálogo sin JS
    └── check.mjs               # revisión automática del sitio
```

---

Todos los formularios y el carrito muestran el enlace al
[aviso de privacidad](privacidad.html), y el panel interno guarda los datos con
acceso protegido.

¿Dudas o pedidos? WhatsApp **+502 4889-0091** — *Lun a Dom, 8:00 AM – 5:00 PM*.
