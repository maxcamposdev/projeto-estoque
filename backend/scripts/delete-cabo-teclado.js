require('dotenv').config();
const db = require('../src/config/db');

const SKUS = ['AUT-006', 'ELT-005'];

(async () => {
  console.log('⏳ Buscando produtos...');
  const { rows: produtos } = await db.query(
    'SELECT id, sku, name, image_url FROM products WHERE sku = ANY($1::text[])',
    [SKUS]
  );

  if (produtos.length === 0) {
    console.log('⚠️  Nenhum produto encontrado.');
    return process.exit(0);
  }

  console.log(`📦 ${produtos.length} produtos encontrados:`);
  produtos.forEach(p => console.log(`   • #${p.id} ${p.sku} - ${p.name}`));

  // Apaga movimentações relacionadas
  const ids = produtos.map(p => p.id);
  await db.query('DELETE FROM stock_movements WHERE product_id = ANY($1::int[])', [ids]);
  console.log('✅ Movimentações removidas.');

  // Apaga os produtos
  await db.query('DELETE FROM products WHERE id = ANY($1::int[])', [ids]);
  console.log(`✅ ${produtos.length} produtos removidos do banco.`);

  process.exit(0);
})();
