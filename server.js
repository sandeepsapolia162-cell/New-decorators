// Simple Node.js HTTP backend for portfolio management (no external dependencies)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'portfolio.json');
try { fs.mkdirSync(dataDir, { recursive: true }); } catch(e) {}
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

function serveStatic(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/portfolio' && req.method === 'GET') {
    const items = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(items));
  } else if (url.pathname === '/api/portfolio' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newItem = JSON.parse(body);
        if (!newItem || !newItem.img) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid item' }));
        }
        const items = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        items.push(newItem);
        fs.writeFileSync(dataFile, JSON.stringify(items, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: newItem }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad JSON' }));
      }
    });
  } else {
    // Serve static assets (css, js, images, etc.)
    if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/assets/')) {
      const assetPath = path.join(__dirname, url.pathname);
      serveStatic(assetPath, res);
      return;
    }
    // Serve static files, default to index.html
    let filePath = path.join(__dirname, url.pathname);
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        filePath = path.join(__dirname, 'index.html');
      }
    } else {
      // If file does not exist, fallback to index.html for SPA routes
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'index.html');
      }
    }
    serveStatic(filePath, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


