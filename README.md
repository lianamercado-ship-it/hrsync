# HRSync — Distribuidor de Horas Extras

## Stack
- **Frontend:** React + Vercel
- **Base de datos:** Supabase (PostgreSQL)
- **Motor:** Google Apps Script (Web App)
- **Archivos:** Google Drive

## Pasos de instalación

### 1. Supabase
1. Ve a tu proyecto en https://supabase.com
2. SQL Editor → New Query
3. Pega el contenido de `sql/schema.sql` y ejecuta
4. Ve a Authentication → Settings → desactiva "Confirm email" (para desarrollo)

### 2. Apps Script
1. Abre el Google Sheet de Quest
2. Extensions → Apps Script
3. Crea un nuevo archivo llamado `WebAppAPI.gs`
4. Pega el contenido de `apps-script/WebAppAPI.gs`
5. Pega también TODO el contenido del script v5 (las funciones auxiliares)
6. Deploy → New deployment → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copia la URL del deployment
8. Pega esa URL en `frontend/src/pages/Distribucion.js` donde dice `TU_APPS_SCRIPT_URL_AQUI`

### 3. GitHub
1. Crea un repositorio en GitHub llamado `hrsync`
2. Sube todos los archivos de esta carpeta
   ```
   git init
   git add .
   git commit -m "Initial HRSync setup"
   git remote add origin https://github.com/TU_USUARIO/hrsync.git
   git push -u origin main
   ```

### 4. Vercel
1. Ve a https://vercel.com → New Project
2. Importa el repositorio `hrsync` de GitHub
3. Framework: Create React App
4. Root Directory: `frontend`
5. Variables de entorno (ya están en vercel.json)
6. Deploy

### 5. Dominio personalizado
1. En Vercel → Settings → Domains
2. Agrega `hrsync.app` (o el dominio que elijas)
3. Configura el DNS según las instrucciones de Vercel

### 6. Primer usuario admin
En Supabase → Authentication → Users → Add user:
- Email: tu@email.com
- Password: tu contraseña segura
Luego en SQL Editor:
```sql
UPDATE perfiles SET rol = 'admin' WHERE email = 'tu@email.com';
```

## Estructura del proyecto
```
hrsync/
├── sql/
│   └── schema.sql          # Esquema Supabase
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.js           # Router principal
│       ├── supabaseClient.js
│       ├── index.css        # Colores STT
│       └── pages/
│           ├── Login.js     # Pantalla de login
│           ├── Dashboard.js # Selección de empresa
│           ├── Distribucion.js # Panel de ejecución
│           └── Admin.js     # Gestión usuarios/empresas
├── apps-script/
│   └── WebAppAPI.gs         # API del motor
├── vercel.json
└── README.md
```
