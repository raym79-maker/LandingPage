const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Configuración de persistencia (Volumen de Railway)
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

// Crear carpeta si no existe para evitar errores al arrancar
if (!fs.existsSync(dataDir)) {
    console.log("Creando directorio de datos...");
    fs.mkdirSync(dataDir, { recursive: true });
}

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Conexión a la Base de Datos SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error crítico al abrir DB:", err.message);
    } else {
        console.log("Base de datos conectada en volumen: " + dbPath);
        // Tabla para tu MVP de gestión de clientes
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

// Health Check para Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Guardar prospectos desde la landing
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    
    db.run(sql, [nombre, whatsapp, plan || 'Demo Gratis'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

/**
 * 4. RUTA SECRETA PARA ADMINISTRACIÓN
 * Entra a: tu-app.up.railway.app/admin-prospectos
 */
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error al leer la base de datos");
        
        let html = `
        <html>
        <head>
            <title>Panel Admin - Prospectos IPTV</title>
            <style>
                body { font-family: sans-serif; background: #1a202c; color: white; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: #2d3748; }
                th, td { padding: 12px; border: 1px solid #4a5568; text-align: left; }
                th { background: #4a5568; }
                tr:nth-child(even) { background: #2d3748; }
                h1 { color: #63b3ed; }
            </style>
        </head>
        <body>
            <h1>Lista de Prospectos - Gestión IPTV</h1>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>WhatsApp</th>
                    <th>Plan</th>
                    <th>Fecha</th>
                </tr>`;
        
        rows.forEach((row) => {
            html += `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.nombre}</td>
                    <td>${row.whatsapp}</td>
                    <td>${row.plan_interes}</td>
                    <td>${row.fecha}</td>
                </tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// Servir la landing para cualquier otra ruta
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Encendido del servidor en 0.0.0.0 para acceso externo
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor iniciado y escuchando en puerto ${PORT}`);
});
