const http = require('http');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

const PORT = 3000;
const BASE_DIR = path.join(__dirname, 'files');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure files directory exists
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR);
}

// Serve HTML and handle file operations
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    // Serve the HTML form
    const filePath = path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading HTML');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }

  else if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const parsed = new URLSearchParams(body);
      const action = parsed.get('action');
      const filename = parsed.get('filename');
      const content = parsed.get('content') || '';
      const fullPath = path.join(BASE_DIR, filename);

      res.writeHead(200, { 'Content-Type': 'text/plain' });

      if (action === 'create') {
        fs.writeFile(fullPath, content, err => {
          if (err) return res.end('Error creating file');
          res.end(`File '${filename}' created.`);
        });
      } else if (action === 'read') {
        fs.readFile(fullPath, 'utf8', (err, data) => {
          if (err) return res.end('Error reading file');
          res.end(`Content of '${filename}':\n\n${data}`);
        });
      } else if (action === 'delete') {
        fs.unlink(fullPath, err => {
          if (err) return res.end('Error deleting file');
          res.end(`File '${filename}' deleted.`);
        });
      } else {
        res.end('Invalid action.');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
