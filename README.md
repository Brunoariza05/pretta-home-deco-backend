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
├── vercel.json            # configuración de despliegue para vercel
├── .env                   # variables de entorno (no se sube al repo)
├── .env.example           # ejemplo de variables de entorno
├── .gitignore             # archivos y carpetas ignorados por git
├── package.json           # dependencias y scripts del proyecto
│
├── config/
│   └── cloudinary.js      # conexión y subida de imágenes a Cloudinary
│   └── mailer.js          # conexión y envio de mail 
│
├── middleware/
│   ├── auth.js            # valida el token JWT en las rutas protegidas
│   └── upload.js          # procesa los archivos subidos (multer)
│
├── models/                # esquemas de MongoDB
│   ├── Usuario.js         # login de la dueña
│   ├── Producto.js        # productos del catálogo
│   ├── Venta.js           # ventas registradas
│   ├── Datos.js           # contenido editable de la página principal
│   └── CodigoRecuperacion.js # códigos temporales para recuperar contraseña
│   └── Contador.js 
│
├── routes/                # endpoints de la API
│   ├── auth.js            # POST /api/auth/login y cambio de clave
│   ├── productos.js       # CRUD de productos y gestión de imágenes
│   ├── ventas.js          # registrar, editar, listar y eliminar ventas
│   ├── datos.js           # GET/PUT de la configuración de la home
│   └── recuperacion.js    # flujo de recuperación de clave por correo
│
├── seeds/                 # scripts para cargar datos de prueba (uso único)
│   ├── seed-usuario.js
│   ├── seed-productos.js
│   └── seed-imagenes.js
│
└── public/                # todo lo que ve el navegador
    ├── index.html         # tienda (catálogo + carrito + contacto)
    ├── admin.html         # panel de gestión de la dueña
    ├── recuperar.html     # pantalla de recuperación de contraseña
    ├── placeholder.svg    # imagen comodín por defecto
    ├── favicon.svg        # icono del sitio
    └── js/
        ├── app.js         # lógica de la tienda (carrito, catálogo, WhatsApp)
        ├── admin.js       # lógica del panel (productos, ventas, login, reportes pdf)
        └── recuperar.js   # lógica del flujo de recuperación de clave
    └── css/
        ├── tienda.css      # css de la tienda (carrito, catálogo, WhatsApp)
        ├── admin.css       # css del panel (productos, ventas, login, reportes pdf)
        └── base.css        # css base