const fs = require('fs'); const path = require('path');
const dataDir = path.join(process.cwd(), 'data'); if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const uploads = path.join(process.cwd(), 'public', 'uploads'); if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
console.log('📁 postinstall: data/ & public/uploads prêts');
