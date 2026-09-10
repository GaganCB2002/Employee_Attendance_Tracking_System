const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes
app.use('/api', routes);

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  █████╗  ██████╗██╗██╗  ██╗███████╗X╗████████╗██╗  ██╗██╗   ██╗██████╗ `);
  console.log(`  ██╔══██╗██╔════╝██║╚██╗██╔╝██╔════╝╚══██╔══╝██║  ██║██║   ██║██╔══██╗`);
  console.log(`  ███████║██║     ██║ ╚███╔╝ █████╗     ██║   ███████║██║   ██║██████╔╝`);
  console.log(`  ██╔══██║██║     ██║ ██╔██╗ ██╔══╝     ██║   ██╔══██║██║   ██║██╔═══╝ `);
  console.log(`  ██║  ██║╚██████╗██║██╔╝ ██╗███████╗   ██║   ██║  ██║╚██████╔╝██║     `);
  console.log(`  ╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝     `);
  console.log(`\n  Server:    http://localhost:${PORT}`);
  console.log(`  Super Admin:  SUPER-001 / admin123`);
  console.log(`  Section Admin: SA-ENG-01 / section123`);
  console.log(`  Employee:      EMP-09411 / emp123\n`);
});
