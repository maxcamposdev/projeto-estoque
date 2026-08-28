// scripts/migrate-images.js — Adiciona colunas de imagem na tabela products
require('dotenv').config();
const db = require('../src/config/db');

(async () => {
  try {
    console.log('⏳ Aplicando migration de imagens...');

    await db.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS image_data TEXT;
    `);

    console.log('✅ Colunas image_url e image_data adicionadas!');

    // Verificar
    const { rows } = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('image_url', 'image_data')
      ORDER BY column_name;
    `);

    console.log('\n📋 Colunas verificadas:');
    rows.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
