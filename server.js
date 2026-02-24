const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
// Railway asigna el puerto dinámicamente, por eso usamos process.env.PORT
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE RUTAS Y PERSISTENCIA
// Usamos /app/data porque es donde montaste el volumen en Railway
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

// 2. VERIFICACIÓN DE CARPETA (Evita el error 'Application failed to respond')
if (!fs.existsSync(dataDir)) {
    console.log("Creando carpeta de datos en:", dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
}

// 3. MIDDLEWARES
app.use(cors());
app.use(express.json());
// Sirve los archivos de la carpeta 'public' (tu index.html)
app.use(express.static(path.join(__dirname, 'public')));

// 4. CONEXIÓN A LA BASE DE DATOS
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error crítico al abrir la base de datos:", err.message);
    } else {
        console.log("Base de datos conectada exitosamente en:", dbPath);
        // Crear la tabla si no existe
        db.run(`CREATE TABLE IF NOT EXISTS prospectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            whatsapp TEXT,
            plan_interes TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// 5. RUTAS DE LA API
// Ruta para recibir los datos del formulario de la landing
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;

    if (!nombre || !whatsapp) {
        return res.status(400).json({ error: "Nombre y WhatsApp son requeridos" });
    }

    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, plan || 'Demo Gratis'], function(err) {
        if (err) {
            console.error("Error al insertar:", err.message);
            return res.status(500).json({ error: "Error interno del servidor" });
        }
        res.status(200).json({ 
            success: true, 
            message: "Prospecto guardado correctamente",
            id: this.lastID 
        });
    });
});

// Ruta de salud (Health check) para que Railway sepa que el app está viva
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 6. ENCENDIDO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor IPTV activo en puerto ${PORT}`);
});
