// scripts/seed-images.js — Atribui imagens ilustrativas reais (Picsum) a todos os produtos
require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  try {
    console.log('⏳ Buscando produtos...');

    const { rows: produtos } = await db.query(
      'SELECT id, name FROM products ORDER BY id'
    );

    console.log(`📦 ${produtos.length} produtos encontrados. Aplicando imagens...\n`);

    let atualizados = 0;
    for (const p of produtos) {
      // Picsum gera foto real baseada em um "seed" (estável por produto)
      const url = `https://picsum.photos/seed/produto-${p.id}/600/400`;
      await db.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [url, p.id]
      );
      atualizados++;
      if (atualizados % 10 === 0) {
        console.log(`   ... ${atualizados}/${produtos.length}`);
      }
    }

    console.log(`\n✅ ${atualizados} produtos atualizados com imagens!`);
    console.log('🌐 Fonte: https://picsum.photos (fotos reais, estáveis por ID)');

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
