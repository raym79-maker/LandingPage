const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Esto sirve tu index.html automáticamente

// Base de Datos (Se creará en Railway)
const db = new sqlite3.Database('./data/iptv.db', (err) => {
    if (err) console.error("Error al abrir DB:", err);
    else console.log("Base de datos conectada.");
});

// Crear tabla de prospectos si no existe
db.run(`CREATE TABLE IF NOT EXISTS prospectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    whatsapp TEXT,
    plan_interes TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Ruta para recibir datos del formulario
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, plan } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, plan_interes) VALUES (?, ?, ?)`;
    
    db.run(sql, [nombre, whatsapp, plan], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "¡Datos guardados con éxito!", id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});