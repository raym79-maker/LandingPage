const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

const dbDir = '/app/data'; 
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true }); 
const dbPath = path.join(dbDir, 'smartplay.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS prospectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nombre TEXT, whatsapp TEXT, producto TEXT, dispositivo TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.run(`ALTER TABLE prospectos ADD COLUMN dispositivo TEXT`, () => {
                console.log("DB lista.");
            });
        });
    }
});

const auth = basicAuth({ users: { 'admin': 'smartplay2026' }, challenge: true });

app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto, dispositivo } = req.body;
    db.run(`INSERT INTO prospectos (nombre, whatsapp, producto, dispositivo) VALUES (?, ?, ?, ?)`, 
    [nombre, whatsapp, producto || 'Demo', dispositivo || 'No especificado'], (err) => {
        if (err) return res.status(500).json({ error: "Error de servidor" });
        res.status(200).json({ success: true });
    });
});

app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `<body style="font-family:sans-serif;background:#0f172a;color:white;padding:40px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;">
                <h1>Registros de Demos - Smartplay</h1>
                <a href="/admin-reset-confirm" style="background:#ef4444;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;border-radius:8px;font-size:12px;">BORRAR TODOS LOS REGISTROS</a>
            </div>
            <table border="1" style="width:100%;border-collapse:collapse;text-align:center;border-color:#1e293b;">
                <tr style="background:#25D366;color:black;">
                    <th style="padding:12px;">Fecha</th><th>Nombre</th><th>WhatsApp</th>
                    <th>Producto</th><th>Dispositivo</th><th>Acción</th>
                </tr>`;
        rows.forEach(r => {
            const p = r.whatsapp.replace(/\D/g,'');
            html += `<tr style="border-bottom:1px solid #1e293b;">
                <td style="padding:12px;">${r.fecha}</td><td>${r.nombre}</td><td>${r.whatsapp}</td>
                <td>${r.producto}</td><td style="color:#25D366;font-weight:bold;">${r.dispositivo||'N/A'}</td>
                <td><a href="https://wa.me/${p}?text=Hola%20${r.nombre}" 
                   style="background:#25D366;color:black;padding:5px 12px;text-decoration:none;font-weight:bold;border-radius:5px;font-size:11px;"
                   target="_blank">Contactar</a></td></tr>`;
        });
        if (rows.length === 0) html += `<tr><td colspan="6" style="padding:40px;color:#64748b;">No hay registros.</td></tr>`;
        res.send(html + "</table></body>");
    });
});

app.get('/admin-reset-confirm', auth, (req, res) => {
    res.send(`<body style="font-family:sans-serif;background:#0f172a;color:white;text-align:center;padding:100px;">
        <h1 style="color:#ef4444;">⚠ ¿ESTÁS SEGURO?</h1>
        <p style="margin-bottom:30px;">Esta acción eliminará todos los registros permanentemente.</p>
        <div style="display:flex;justify-content:center;gap:20px;">
            <a href="/admin-prospectos" style="background:#1e293b;color:white;padding:15px 30px;text-decoration:none;border-radius:10px;font-weight:bold;">CANCELAR</a>
            <a href="/admin-reset-execute" style="background:#ef4444;color:white;padding:15px 30px;text-decoration:none;border-radius:10px;font-weight:bold;">SÍ, BORRAR TODO</a>
        </div></body>`);
});

app.get('/admin-reset-execute', auth, (req, res) => {
    db.run("DELETE FROM prospectos", (err) => {
        if (err) return res.status(500).send("Error");
        res.redirect('/admin-prospectos');
    });
});

// SEO
app.get('/sitemap.xml', (req, res) => { res.setHeader('Content-Type','application/xml'); res.sendFile(path.join(__dirname,'public','sitemap.xml')); });
app.get('/robots.txt', (req, res) => { res.setHeader('Content-Type','text/plain'); res.sendFile(path.join(__dirname,'public','robots.txt')); });
app.get('/mundial-2026.html', (req, res) => res.sendFile(path.join(__dirname,'public','mundial-2026.html')));

// Blog ES
app.get('/blog/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_index.html')));
app.get('/blog/iptv-sin-cortes-mundial-2026/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_1_iptv-sin-cortes.html')));
app.get('/blog/como-instalar-iptv-smart-tv/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_2_como_instalar.html')));
app.get('/blog/mejor-iptv-mexico-2026/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_3_mejor_iptv.html')));
app.get('/blog/iptv-para-ver-el-mundial-2026/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_4_iptv-para-ver-el-mundial.html')));
app.get('/blog/mejor-iptv-con-pase-al-mundial-2026/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_5_mejor-iptv-mundial.html')));
app.get('/blog/iptv-vs-cable-mexico-2026/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_4_iptv_cable.html')));
app.get('/blog/mejor-android-box-iptv-mexico/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_5_android_box.html')));

// Blog EN
app.get('/blog/how-to-install-iptv-usa/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_usa_1_how_to_install.html')));
app.get('/blog/iptv-vs-cable-usa/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_usa_2_iptv_vs_cable.html')));
app.get('/blog/best-iptv-usa/', (req, res) => res.sendFile(path.join(__dirname,'public','blog','blog_post_usa_3_best_iptv.html')));

// USA Landing
app.get('/en/', (req, res) => res.sendFile(path.join(__dirname,'public','en','index.html')));

// Catch-all
app.get('*', (req, res) => res.sendFile(path.join(__dirname,'public','index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor Smartplay corriendo en puerto ${PORT}`));
