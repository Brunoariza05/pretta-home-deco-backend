# Pretta Home Deco — Backend

E-commerce de decoración + panel de gestión. Node / Express / MongoDB Atlas / Cloudinary.

## Instalación

```bash
npm install
```

Variables de entorno (`.env`): `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

```bash
npm start
```

## Estructura

```
pretta-home-deco-backend/
├── server.js              # arranca el servidor y conecta todo
├── .env                    # variables de entorno (no se sube al repo)
├── .gitignore
├── package.json
│
├── config/
│   └── cloudinary.js       # conexión y subida de imágenes a Cloudinary
│
├── middleware/
│   ├── auth.js              # valida el token JWT en las rutas protegidas
│   └── upload.js             # procesa los archivos subidos (multer)
│
├── models/                  # esquemas de MongoDB
│   ├── Usuario.js            # login de la dueña
│   ├── Producto.js           # productos del catálogo
│   ├── Venta.js               # ventas registradas
│   └── Datos.js               # contenido editable de la página principal
│
├── routes/                  # endpoints de la API
│   ├── auth.js                # POST /api/auth/login
│   ├── productos.js           # CRUD de productos
│   ├── ventas.js               # registrar/editar/listar ventas
│   └── datos.js                 # GET/PUT de la página principal
│
├── seeds/                   # scripts para cargar datos de prueba (uso único)
│   ├── seed-usuario.js
│   ├── seed-productos.js
│   └── seed-imagenes.js
│
└── public/                  # todo lo que ve el navegador
    ├── index.html             # tienda (catálogo + carrito + contacto)
    ├── admin.html              # panel de gestión de la dueña
    ├── style.css                # estilos de todo el sitio
    ├── placeholder.svg
    ├── favicon.svg
    └── js/
        ├── app.js                # lógica de la tienda (carrito, catálogo, WhatsApp)
        └── admin.js                # lógica del panel (productos, ventas, login)
```
