require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const pasta = path.join(__dirname, '..', '..', 'web', 'public', 'images', 'products');

(async () => {
  const { rows } = await db.query(
    `SELECT id, sku, name, image_url FROM products ORDER BY id`
  );

  console.log('🔍 Verificando ' + rows.length + ' produtos...\n');

  const quebrados = [];
  for (const p of rows) {
    if (!p.image_url || !p.image_url.startsWith('/images/products/')) {
      quebrados.push({ ...p, motivo: 'sem image_url local' });
      continue;
    }
    const arquivo = path.join(pasta, path.basename(p.image_url));
    if (!fs.existsSync(arquivo)) {
      quebrados.push({ ...p, motivo: 'arquivo não existe: ' + path.basename(p.image_url) });
    }
  }

  if (quebrados.length === 0) {
    console.log('✅ Todos os produtos têm imagens válidas no disco!');
  } else {
    console.log('⚠️  ' + quebrados.length + ' produtos com problemas:\n');
    quebrados.forEach(p => {
      console.log(`   #${p.id} ${p.sku} - ${p.name}`);
      console.log(`      image_url atual: ${p.image_url || '(vazio)'}`);
      console.log(`      motivo: ${p.motivo}\n`);
    });
  }
  process.exit(0);
})();
