const fs = require('fs'); const path = require('path');
const mustEnv = ['ADMIN_PASSWORD'];
const missing = mustEnv.filter((k) => !process.env[k]);
if (missing.length) { console.error('❌ Variables manquantes:', missing.join(', ')); process.exit(1); }
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) console.warn('ℹ️  data/ inexistant (créé au seed).');
['properties.json','programs.json','reviews.json','leads.json'].forEach(f=>{
  const p=path.join(dataDir,f); if (!fs.existsSync(p)) console.warn('ℹ️',f,'absent (seed recommandé)');
});
console.log('✅ Doctor OK');
