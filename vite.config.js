import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function exportPlugin() {
  return {
    name: 'export-to-disk',
    configureServer(server) {
      server.middlewares.use('/__export', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { filename, data } = JSON.parse(body);
            const exportsDir = path.resolve(process.cwd(), 'exports');
            if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
            const filePath = path.resolve(exportsDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

// SSL: serve HTTPS when certs are present in .ssl/, fall back to HTTP otherwise.
// Generate certs with mkcert: mkdir -p .ssl && cd .ssl && mkcert "*.local.test" "local.test"
const sslCert = path.resolve(process.cwd(), '.ssl/_wildcard.local.test+1.pem');
const sslKey = path.resolve(process.cwd(), '.ssl/_wildcard.local.test+1-key.pem');
const hasSSL = fs.existsSync(sslCert) && fs.existsSync(sslKey);

if (!hasSSL) {
  console.warn('No SSL certs found in .ssl/ — running HTTP only.');
  console.warn('  Generate with: mkdir -p .ssl && cd .ssl && mkcert "*.local.test" "local.test"');
}

export default defineConfig({
  plugins: [react(), exportPlugin()],
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '443'),
    ...(hasSSL ? {
      https: {
        cert: fs.readFileSync(sslCert),
        key: fs.readFileSync(sslKey)
      }
    } : {}),
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/zooniverse': {
        target: 'https://www.zooniverse.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/zooniverse/, ''),
        cookieDomainRewrite: { '.zooniverse.org': 'localhost' }
      }
    }
  }
})
