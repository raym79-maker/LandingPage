const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de persistencia para Railway
const dbDir = '/app/data'; 
if (!fs.existsSync(dbDir)) { 
    fs.mkdirSync(dbDir, { recursive: true }); 
}
const dbPath = path.join(dbDir, 'smartplay.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error DB:", err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS prospectos (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            nombre TEXT, 
            whatsapp TEXT, 
            producto TEXT, 
            dispositivo TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (!err) {
                db.run(`ALTER TABLE prospectos ADD COLUMN dispositivo TEXT`, (err) => {
                    if (err) console.log("La columna dispositivo ya está lista.");
                });
            }
        });
    }
});

// Autenticación para administración
const auth = basicAuth({
    users: { 'admin': 'smartplay2026' },
    challenge: true
});

// Ruta para guardar prospectos
app.post('/api/prospectos', (req, res) => {
    const { nombre, whatsapp, producto, dispositivo } = req.body;
    db.run(`INSERT INTO prospectos (nombre, whatsapp, producto, dispositivo) VALUES (?, ?, ?, ?)`, 
    [nombre, whatsapp, producto || 'Demo', dispositivo || 'No especificado'], (err) => {
        if (err) {
            console.error("Error al insertar:", err.message);
            return res.status(500).json({ error: "Error de servidor" });
        }
        res.status(200).json({ success: true });
    });
});

// PANEL DE ADMINISTRACIÓN
app.get('/admin-prospectos', auth, (req, res) => {
    db.all("SELECT * FROM prospectos ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).send("Error");
        let html = `
        <body style="font-family:sans-serif;background:#0f172a;color:white;padding:40px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                <h1>Registros de Demos - Smartplay</h1>
                <a href="/admin-reset-confirm" style="background:#ef4444; color:white; padding:10px 20px; text-decoration:none; font-weight:bold; border-radius:8px; font-size:12px;">BORRAR TODOS LOS REGISTROS</a>
            </div>
            <table border="1" style="width:100%; border-collapse:collapse; text-align:center; border-color:#1e293b;">
                <tr style="background:#25D366; color:black;">
                    <th style="padding:12px;">Fecha</th>
                    <th>Nombre</th>
                    <th>WhatsApp</th>
                    <th>Producto</th>
                    <th>Dispositivo</th>
                    <th>Acción</th>
                </tr>`;
        
        rows.forEach(r => {
            const cleanPhone = r.whatsapp.replace(/\D/g,'');
            html += `
                <tr style="border-bottom:1px solid #1e293b;">
                    <td style="padding:12px;">${r.fecha}</td>
                    <td>${r.nombre}</td>
                    <td>${r.whatsapp}</td>
                    <td>${r.producto}</td>
                    <td style="color:#25D366; font-weight:bold;">${r.dispositivo || 'N/A'}</td>
                    <td>
                        <a href="https://wa.me/${cleanPhone}?text=Hola%20${r.nombre},%20veo%20que%20usas%20${r.dispositivo || 'Smart TV'}.%20Vengo%20de%20Smartplay" 
                           style="background:#25D366; color:black; padding:5px 12px; text-decoration:none; font-weight:bold; border-radius:5px; font-size:11px;" 
                           target="_blank">Contactar</a>
                    </td>
                </tr>`;
        });

        if (rows.length === 0) {
            html += `<tr><td colspan="6" style="padding:40px; color:#64748b;">No hay registros nuevos actualmente.</td></tr>`;
        }

        res.send(html + "</table></body>");
    });
});

// RUTA DE CONFIRMACIÓN DE REINICIO
app.get('/admin-reset-confirm', auth, (req, res) => {
    res.send(`
        <body style="font-family:sans-serif;background:#0f172a;color:white;text-align:center;padding:100px;">
            <h1 style="color:#ef4444;">⚠ ¿ESTÁS SEGURO?</h1>
            <p style="margin-bottom:30px;">Esta acción eliminará todos los registros de la base de datos de forma permanente.</p>
            <div style="display:flex; justify-content:center; gap:20px;">
                <a href="/admin-prospectos" style="background:#1e293b; color:white; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">CANCELAR</a>
                <a href="/admin-reset-execute" style="background:#ef4444; color:white; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">SÍ, BORRAR TODO</a>
            </div>
        </body>
    `);
});

// EJECUCIÓN DEL REINICIO
app.get('/admin-reset-execute', auth, (req, res) => {
    db.run("DELETE FROM prospectos", (err) => {
        if (err) return res.status(500).send("Error al limpiar base de datos");
        res.redirect('/admin-prospectos');
    });
});

// Rutas explícitas para archivos XML y TXT
app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/mundial-2026.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mundial-2026.html'));
});

// RUTAS DEL BLOG
app.get('/blog/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_index.html'));
});
app.get('/blog/iptv-sin-cortes-mundial-2026/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_1_iptv-sin-cortes.html'));
});
app.get('/blog/como-instalar-iptv-smart-tv/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_2_como_instalar.html'));
});
app.get('/blog/mejor-iptv-mexico-2026/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_3_mejor_iptv.html'));
});
app.get('/blog/iptv-vs-cable-mexico-2026/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_4_iptv_cable.html'));
});
app.get('/blog/mejor-android-box-iptv-mexico/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_5_android_box.html'));
});

// ENGLISH BLOG POSTS (USA)
app.get('/blog/how-to-install-iptv-usa/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_usa_1_how_to_install.html'));
});
app.get('/blog/iptv-vs-cable-usa/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_usa_2_iptv_vs_cable.html'));
});
app.get('/blog/best-iptv-usa/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog', 'blog_post_usa_3_best_iptv.html'));
});

// LANDING EN INGLÉS (USA)
app.get('/en/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'en', 'index.html'));
});

// ============================================================
// PROXY LIVESCORE-API — Mundial 2026 (competition_id = 362)
// Key y secret OCULTOS en el servidor + sistema de caché
// para no exceder el límite de requests del plan.
// ============================================================
const LS_KEY    = process.env.LS_KEY    || '3JytHawX7epwFT4N';
const LS_SECRET = process.env.LS_SECRET || 'dkeD4a3HtuGgSatVU2pCcVzkaYRPSWD5';
const WC_COMP_ID = '362';

// Caché en memoria
const cache = {
    live:      { data: null, ts: 0 },
    fixtures:  { data: null, ts: 0 },
    standings: { data: null, ts: 0 }
};

// Tiempos de caché (milisegundos)
const CACHE_TTL = {
    live:      90 * 1000,           // En vivo: 90 seg
    fixtures:  6 * 60 * 60 * 1000,  // Fixtures: 6 horas
    standings: 5 * 60 * 1000        // Tabla: 5 min
};

// Endpoints reales de livescore-api
const LS_ENDPOINTS = {
    live:      'matches/live.json',
    fixtures:  'fixtures/list.json',
    standings: 'leagues/table.json'
};

// Llamada a livescore-api
function fetchLiveScore(endpointPath, callback) {
    const sep = endpointPath.includes('?') ? '&' : '?';
    const fullPath = `/api-client/${endpointPath}${sep}key=${LS_KEY}&secret=${LS_SECRET}&competition_id=${WC_COMP_ID}`;

    const options = {
        hostname: 'livescore-api.com',
        path: fullPath,
        method: 'GET'
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => callback(null, data));
    });
    request.on('error', (err) => callback(err, null));
    request.end();
}

// Endpoint con caché: /api/mundial/live, /api/mundial/fixtures, /api/mundial/standings
app.get('/api/mundial/:tipo', (req, res) => {
    const tipo = req.params.tipo;

    if (!LS_ENDPOINTS[tipo]) {
        return res.status(400).json({ error: 'Tipo no válido. Usa: live, fixtures o standings' });
    }

    const now = Date.now();
    const cached = cache[tipo];

    // ¿Caché válido?
    if (cached.data && (now - cached.ts) < CACHE_TTL[tipo]) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Cache', 'HIT');
        return res.send(cached.data);
    }

    // Llamar a la API
    fetchLiveScore(LS_ENDPOINTS[tipo], (err, data) => {
        if (err) {
            console.error(`Error livescore (${tipo}):`, err.message);
            if (cached.data) {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('X-Cache', 'STALE');
                return res.send(cached.data);
            }
            return res.status(500).json({ error: 'Error al consultar datos del Mundial' });
        }
        cache[tipo] = { data: data, ts: now };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Cache', 'MISS');
        res.send(data);
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Smartplay corriendo en puerto ${PORT}`);
});
