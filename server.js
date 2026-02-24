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
    fs.mkdirSync(dataDir, { recursive: true });
}

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Conexión a la Base de Datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
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

// Ruta de salud (la que ves como OK)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Ruta para guardar datos del formulario
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    
    db.run(sql, [nombre, whatsapp, plan || 'Demo Gratis'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

/**
 * 4. RUTA SECRETA PARA VER TUS CLIENTES
 * Entra a: tu-app.up.railway.app/admin-prospectos
 */
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).send("Error al leer la base de datos");
        }
        
        // Creamos una tabla HTML simple para que lo veas bonito en el navegador
        let html = `<h1>Lista de Prospectos IPTV</h1><table border="1"><tr><th>ID</th><th>Nombre</th><th>WhatsApp</th><th>Fecha</th></tr>`;
        rows.forEach((row) => {
            html += `<tr><td>${row.id}</td><td>${row.nombre}</td><td>${row.whatsapp}</td><td>${row.fecha}</td></tr>`;
        });
        html += `</table>`;
        
        res.send(html);
    });
});

// Captura cualquier otra ruta y sirve el index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Encendido del servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
