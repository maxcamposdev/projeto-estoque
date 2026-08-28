// scripts/set-local-images.js — Aponta todos os produtos para /images/products/produto-{id}.svg
require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  try {
    console.log('⏳ Atualizando URLs das imagens no banco...');

    const { rows: prods } = await db.query('SELECT id FROM products ORDER BY id');

    let count = 0;
    for (const p of prods) {
      await db.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [`/images/products/produto-${p.id}.svg`, p.id]
      );
      count++;
    }

    console.log(`✅ ${count} produtos atualizados!`);
    console.log('🌐 Todos apontam agora para: /images/products/produto-{id}.svg');
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
