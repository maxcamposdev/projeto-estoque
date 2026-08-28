// scripts/delete-products.js — Remove produtos específicos do banco e suas imagens
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

// SKUs que você quer apagar
const SKUS_PARA_APAGAR = [
  'ALM-009', // Biscoito Recheado
  'ELT-007', // Cabo HDMI
  'ELT-003', // Carregador USB-C
  'ELT-002', // Fone Bluetooth
  'ELT-011', // Pendrive 64GB
  'PAP-007', // Tesoura Escolar
  'UTD-005', // Toalha de Banho
];

(async () => {
  try {
    console.log('⏳ Buscando produtos para apagar...');

    // Pega os produtos (id, nome, image_url) antes de apagar
    const { rows: produtos } = await db.query(
      'SELECT id, sku, name, image_url FROM products WHERE sku = ANY($1::text[])',
      [SKUS_PARA_APAGAR]
    );

    if (produtos.length === 0) {
      console.log('⚠️  Nenhum produto encontrado com esses SKUs.');
      process.exit(0);
    }

    console.log(`📦 ${produtos.length} produtos encontrados:\n`);
    produtos.forEach(p => console.log(`   • #${p.id} ${p.sku} - ${p.name} → ${p.image_url || '(sem imagem)'}`));

    // Apaga movimentações relacionadas primeiro (foreign key)
    console.log('\n⏳ Apagando movimentações relacionadas...');
    const ids = produtos.map(p => p.id);
    await db.query('DELETE FROM stock_movements WHERE product_id = ANY($1::int[])', [ids]);
    console.log('✅ Movimentações removidas.');

    // Apaga os produtos
    console.log('\n⏳ Apagando produtos do banco...');
    await db.query('DELETE FROM products WHERE id = ANY($1::int[])', [ids]);
    console.log(`✅ ${produtos.length} produtos removidos do banco.`);

    // Apaga imagens locais associadas
    console.log('\n⏳ Apagando imagens locais associadas...');
    const pastaImagens = path.join(__dirname, '..', '..', 'web', 'public', 'images', 'products');
    let imagensApagadas = 0;
    let imagensJaApagadas = [];

    for (const p of produtos) {
      if (p.image_url && p.image_url.startsWith('/images/products/')) {
        const arquivo = path.join(pastaImagens, p.basename || path.basename(p.image_url));
        // Pega só o nome do arquivo (sem o caminho do banco)
        const nomeArquivo = path.basename(p.image_url);
        const caminhoCompleto = path.join(pastaImagens, nomeArquivo);

        if (fs.existsSync(caminhoCompleto)) {
          fs.unlinkSync(caminhoCompleto);
          imagensApagadas++;
          imagensJaApagadas.push(nomeArquivo);
        }
      }
    }
    console.log(`✅ ${imagensApagadas} imagens apagadas do disco.`);
    if (imagensJaApagadas.length > 0) {
      console.log('   Arquivos removidos:');
      imagensJaApagadas.forEach(a => console.log(`     • ${a}`));
    }

    console.log('\n📊 RESUMO FINAL:');
    console.log(`   🗑️  ${produtos.length} produtos removidos do banco`);
    console.log(`   🖼️  ${imagensApagadas} imagens removidas do disco`);

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
