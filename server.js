const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia en Railway
const dataDir = '/app/data';
const dbPath = path.join(dataDir, 'iptv.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Inicialización de Base de Datos
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
                        stmt.run("M327", "$200 MXN", 3, "2000 Canales, 40000 Películas", "/img/m327.jpg");
                        stmt.run("TU LATINO", "$250 MXN", 3, "11000 Canales, 55000 Películas", "/img/tu latino.jpg");
                        stmt.run("LEDTV", "$130 MXN", 3, "2400 Canales, 19000 Películas", "/img/ledtv.jpg");
                        stmt.run("ALFATV", "$180 MXN", 3, "1500 Canales, 25000 Películas", "/img/alfatv.jpg");
                        stmt.finalize();
                    }
                });
            });
        });
    }
});

app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    if (!nombre || !whatsapp) return res.status(400).json({ error: "Faltan datos" });
    
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true });
    });
});

const auth = basicAuth({
    users: { 'admin': 'smartplay2026' }, 
    challenge: true,
    realm: 'SmartplayAdmin'
});

app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error de DB");
        let html = `<html><head><title>Admin</title><style>body{font-family:sans-serif;background:#0f172a;color:white;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:12px;border:1px solid #334155;}th{background:#25D366;color:black;}</style></head><body><h1>Ventas Smartplay</h1><table><tr><th>Fecha</th><th>Nombre</th><th>WhatsApp</th><th>Producto</th></tr>`;
        rows.forEach(r => {
            html += `<tr><td>${r.fecha}</td><td>${r.nombre}</td><td>${r.whatsapp}</td><td>${r.producto_interes}</td></tr>`;
        });
        res.send(html + "</table></body></html>");
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Puerto ${PORT}`));
