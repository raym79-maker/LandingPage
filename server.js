const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
// Railway inyecta el puerto automáticamente en process.env.PORT
const PORT = process.env.PORT || 3000;

// Configuración de la Base de Datos con el Volumen
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

// Crear la carpeta si no existe (Vital para evitar fallos de inicio)
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexión a la DB
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir base de datos:", err.message);
    } else {
        console.log("Base de datos conectada en: " + dbPath);
        db.run(`CREATE TABLE IF NOT EXISTS prospectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            whatsapp TEXT,
            plan_interes TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// --- RUTAS ---

// 1. Health Check (Esto le dice a Railway que la app está viva)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 2. Guardar Prospectos
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    
    db.run(sql, [nombre, whatsapp, plan || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// 3. Servir la Landing (Asegura que cargue el index.html)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});
