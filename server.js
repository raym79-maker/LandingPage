const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia en Railway (Volumen 5GB)
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
    } else {
        db.serialize(() => {
            // 1. Tabla de Prospectos (Clientes que se registran)
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 2. Tabla de Productos (Catálogo visual)
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT,
                imagen TEXT
            )`);

            // 3. Inicializar productos solo si la tabla está vacía
            db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
                    
                    stmt.run("M327", "$10.00", 1, "Estabilidad Premium, Canales MX, FHD/4K", "/img/m327.jpg");
                    stmt.run("TU LATINO", "$12.00", 2, "Contenido Latam, Deportes en Vivo, Series", "/img/tu latino.jpg");
                    stmt.run("LEDTV", "$15.00", 3, "Ultra HD, Multi-dispositivo, Sin Cortes", "/img/ledtv.jpg");
                    stmt.run("ALFATV", "$18.00", 3, "Todo Incluido, Eventos Especiales, Soporte VIP", "/img/alfatv.jpg");
                    
                    stmt.finalize();
                    console.log("Productos inicializados exitosamente.");
                }
            });
        });
    }
});

// --- APIS ---

// Obtener catálogo para la Landing
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Guardar nuevo prospecto desde el formulario
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Panel de Administración (Ruta Secreta)
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error de base de datos");
