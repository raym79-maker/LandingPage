const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia para Railway
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Inicialización de la Base de Datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir DB:", err.message);
    } else {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT, precio TEXT, conexiones INTEGER, caracteristicas TEXT, imagen TEXT
            )`, () => {
                db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                    if (row && row.count === 0) {
                        const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
                        stmt.run("M327", "$200 MXN", 3, "2000 Canales, 40000 Películas, 20000 Series", "/img/m327.jpg");
                        stmt.run("TU LATINO", "$250 MXN", 3, "11000 Canales, 55000 Películas, 14000 Series", "/img/tu latino.jpg");
                        stmt.run("LEDTV", "$130 MXN", 3, "2400 Canales, 19000 Películas, 5000 Series", "/img/ledtv.jpg");
                        stmt.run("ALFATV", "$180 MXN", 3, "1500 Canales, 25000 Películas, 3000 Series", "/img/alfatv.jpg");
                        stmt.finalize();
                    }
                });
            });
        });
    }
});

// API de Productos
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API de Registro de Prospectos (Mejorada para evitar bloqueos)
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    if (!nombre || !whatsapp) return res.status(400).json({ error: "Faltan datos obligatorios" });
    
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) {
            console.error("Error al guardar:", err.message);
            return res.status(500).json({ error: "No se pudo guardar en la base de datos" });
        }
        res.status(200).json({ success: true });
    });
});

// Panel Admin
const auth = basicAuth({
    users: { 'admin': 'smartplay2026' }, 
    challenge: true,
    realm: 'SmartplayAdmin'
});

app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<html><head><title>Admin</title><style>body{font-family:sans-serif;background:#0f172a;color:white;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:12px;border:1px solid #334155;}th{background:#25D366;color:black;}</style></head><body><h1>Panel de Ventas</h1><table><tr><th>Fecha</th><th>Nombre</th><th>WhatsApp</th><th>Producto</th></tr>`;
        rows.forEach(r => html += `<tr><td>${r.fecha}</td><td>${r.nombre}</td><td>${r.whatsapp}</td><td>${r.producto_interes}</td></tr>`);
        res.send(html + "</table></body></html>");
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`));
