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
            // 1. Tabla de Prospectos (Clientes)
            db.run(`CREATE TABLE IF NOT EXISTS prospectos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                whatsapp TEXT,
                producto_interes TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 2. Tabla de Productos
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

// Guardar nuevo prospecto
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto } = req.body;
    const sql = `INSERT INTO prospectos (nombre, whatsapp, producto_interes) VALUES (?, ?, ?)`;
    db.run(sql, [nombre, whatsapp, producto || 'Demo'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, id: this.lastID });
    });
});

// Panel de Administración Secreto
app.get('/admin-prospectos', (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error de base de datos");
        
        let html = `<html><head><title>Admin IPTV</title><style>
            body{font-family:sans-serif;background:#1a202c;color:white;padding:20px;}
            table{width:100%;border-collapse:collapse;margin-top:20px;}
            th,td{padding:12px;border:1px solid #4a5568;text-align:left;}
            th{background:#2d3748;}
            .btn-ws{background:#25d366;color:black;padding:6px 12px;border-radius:6px;text-decoration:none;font-weight:bold;}
        </style></head><body>
        <h1>Panel de Ventas - IPTV Pro Global</h1>
        <table><tr><th>Nombre</th><th>Producto</th><th>WhatsApp</th><th>Acción</th></tr>`;
        
        rows.forEach(r => {
            const tel = r.whatsapp.replace(/\D/g,''); 
            html += `<tr>
                <td>${r.nombre}</td>
                <td><strong>${r.producto_interes}</strong></td>
                <td>${r.whatsapp}</td>
                <td><a href="https://wa.me/${tel}?text=Hola%20${r.nombre},%20vi%20tu%20interés%20en%20el%20producto%20${r.producto_interes}" class="btn-ws" target="_blank">Contactar</a></td>
            </tr>`;
        });
        
        html += `</table></body></html>`;
        res.send(html);
    });
});

// Servir la Landing Page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicio del servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo y seguro en puerto ${PORT}`);
});
