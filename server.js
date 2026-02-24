const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
            // Tabla de Prospectos
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Tabla de Productos con columna de Imagen
            db.run(`CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                precio TEXT,
                conexiones INTEGER,
                caracteristicas TEXT,
                imagen TEXT
            )`);

            // Inicializar productos con sus imágenes
            db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO productos (nombre, precio, conexiones, caracteristicas, imagen) VALUES (?, ?, ?, ?, ?)");
                    
                    // NOTA: Reemplaza estos enlaces por las URLs reales de tus imágenes
                    stmt.run("M327", "$10.00", 1, "Estabilidad Premium, Canales MX, FHD/4K", "https://images.unsplash.com/photo-1593784991095-a205039470b6?auto=format&fit=crop&w=400&q=80");
                    stmt.run("TU LATINO", "$12.00", 2, "Contenido Latam, Deportes en Vivo, Series", "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=400&q=80");
                    stmt.run("LEDTV", "$15.00", 3, "Ultra HD, Multi-dispositivo, Sin Cortes", "
