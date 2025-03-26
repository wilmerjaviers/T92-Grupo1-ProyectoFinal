# Sistema de Gestión de Autolote

API REST desarrollada con Node.js y Express para la gestión de un autolote, permitiendo administrar vehículos, clientes, vendedores y ventas.

## Características

- Gestión de usuarios con diferentes roles (admin, vendedor, cliente)
- Autenticación mediante JWT (JSON Web Tokens)
- Gestión completa de vehículos (CRUD)
- Registro de clientes y sus consultas
- Registro y seguimiento de ventas
- Tasas de cambio para ventas

## Requisitos previos

- Node.js (v14.x o superior)
- MySQL (v5.7 o superior)

## Instalación

1. Clonar el repositorio:
   ```
  
2. Instalar dependencias:
   ```
   npm install
   ```

3. Crear la base de datos:
   ```
   mysql -u root -p < AutoloteDB.sql
   ```

4. Configurar variables de entorno:
   - Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:
   ```
   DB_HOST=localhost
   DB_NAME=AutoloteDB
   DB_PASSWORD=tu_contraseña
   DB_USER=root
   PORT=3000
   SECRET_KEY=AutoloteSecretKey2025
   ```

5. Iniciar el servidor:
   ```
   npm start
   ```


## Estructura del proyecto

```
autolote/
├── config/
│   └── db.js              # Configuración de la base de datos
├── middleware/
│   └── authMiddleware.js  # Middleware de autenticación
├── routes/
│   ├── authUsers.js      # Rutas de autenticación y usuarios
│   ├── vehiculos.js # Rutas para gestión de vehículos
│   ├── clientes.js  # Rutas para gestión de clientes
│   └── ventas.js    # Rutas para gestión de ventas
├── utils/
│   ├── tasasDeCambio.js     # Rutas de API de terceros para tasas de cambio
├── .env                   # Variables de entorno
├── app.js                 # Punto de entrada de la aplicación
├── package.json           # Dependencias y scripts
└── README.md              # Documentación
```

## Endpoints

### Autenticación

- `POST /api/login` - Iniciar sesión
- `POST /api/usuarios/registro` - Registrar nuevo usuario

### Usuarios

- `GET /api/usuarios` - Obtener todos los usuarios (solo admin)
- `GET /api/usuarios/:id` - Obtener un usuario por ID
- `PUT /api/usuarios/:id` - Actualizar un usuario
- `DELETE /api/usuarios/:id` - Eliminar un usuario (solo admin)

### Vehículos

- `GET /api/vehiculos` - Obtener todos los vehículos
- `GET /api/vehiculos/:id` - Obtener un vehículo por ID
- `POST /api/vehiculos` - Crear nuevo vehículo (admin, vendedor)
- `PUT /api/vehiculos/:id` - Actualizar un vehículo (admin, vendedor)
- `DELETE /api/vehiculos/:id` - Eliminar un vehículo (solo admin)


### Clientes

- `GET /api/clientes` - Obtener todos los clientes (admin, vendedor)
- `GET /api/clientes/:id` - Obtener un cliente por ID
- `POST /api/clientes` - Registrar nuevo cliente
- `PUT /api/clientes/:id` - Actualizar un cliente
- `DELETE /api/clientes/:id` - Eliminar un cliente (solo admin)

### Consultas

- `POST /api/consultas` - Registrar nueva consulta
- `GET /api/consultas` - Obtener consultas (con filtros opcionales)

### Ventas

- `POST /api/ventas` - Registrar nueva venta y mostrar tasas de cambio en Euros, Lempiras y Yen (admin, vendedor)
- `GET /api/ventas` - Obtener todas las ventas (admin, vendedor)
-

## Credenciales de prueba


- **Administrador:**
  - Email: admin@autolote.hn
  - Contraseña: admin123

- **Vendedor 1:**
  - Email: juan@autolote.hn
  - Contraseña: vendedor123

- **Vendedor 2:**
  - Email: maria@autolote.hn
  - Contraseña: vendedor123

