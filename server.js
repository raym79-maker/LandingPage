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
            // Tablas base
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT,
                imagen TEXT
            )`);

            // --- ACTUALIZACIÓN DE DATOS ---
            // Esta línea limpia la tabla para que se graben los nuevos datos de TU LATINO
            db.run("DELETE FROM productos"); 

            const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
            
            // Configuración M327
            stmt.run(
                "M327", 
                "$200 MXN", 
                3, 
                "Mas de 2000 Canales de TV en vivo, Mas de 40000 Peliculas, Mas de 20000 Series, 3 Dispositivos", 
                "/img/m327.jpg"
            );

            // Configuración TU LATINO solicitada
            stmt.run(
                "TU LATINO", 
                "$250 MXN", 
                3, 
                "Mas de 11000 Canales de TV en vivo, Mas de 55000 Peliculas, Mas de 14000 Series, 3 Dispositivos", 
                "/img/tu latino.jpg"
            );

            // Otros planes (puedes editarlos luego si lo necesitas)
            stmt.run("LEDTV", "$15.00", 3, "Resolución 4K, Multi-dispositivo, Sin Contratos, Soporte Técnico", "/img/ledtv.jpg");
            stmt.run("ALFATV", "$18.00", 3, "Contenido VIP, Eventos PPV, Actualizaciones Diarias, Ultra Estabilidad", "/img/alfatv.jpg");
            
            stmt.finalize();
            console.log("Catálogo Smartplay actualizado: M327 y TU LATINO listos.");
        });
    }
});

// APIs
app.get('/api/productos', (req, res) => {
    db.all("SELECT * FROM productos", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res
