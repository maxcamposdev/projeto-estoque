// scripts/fix-broken-images.js — Remapeia produtos com imagem quebrada para arquivos válidos
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const pasta = path.join(__dirname, '..', '..', 'web', 'public', 'images', 'products');

// ============================================================
// ALIASES MANUAIS — chave = trecho do nome, valor = arquivo real
// (a primeira regra que casar vence)
// ============================================================
const ALIASES = [
  // #5 Teclado USB ABNT2 → mouse (periférico de PC mais próximo)
  { match: 'teclado', arquivo: 'mouse.jpeg' },

  // #8 Webcam Full HD → webcam.jpeg (existe!)
  { match: 'webcam', arquivo: 'webcam.jpeg' },

  // #9 Caixa de Som Bluetooth → fone.jpeg (áudio, mais próximo)
  { match: 'caixa de som', arquivo: 'fone.jpeg' },

  // #22 Água Sanitária → agua-sanitaria.jpeg (existe!)
  { match: 'agua sanitaria', arquivo: 'agua-sanitaria.jpeg' },

  // #29 Papel Toalha → toalha.jpeg (existe! é a Toalha de Banho)
  { match: 'papel toalha', arquivo: 'toalha.jpeg' },

  // #30 Vassoura → vassoura.jpeg (existe!)
  { match: 'vassoura', arquivo: 'vassoura.jpeg' },

  // #36 Óleo de Soja → oleo-soja.jpeg (existe!)
  { match: 'oleo de soja', arquivo: 'oleo-soja.jpeg' },

  // #62 Óleo de Motor → oleo-motor.jpeg (existe!)
  { match: 'oleo de motor', arquivo: 'oleo-motor.jpeg' },

  // #67 Cabo de Bateria → usb.jpeg (cabo)
  { match: 'cabo de bateria', arquivo: 'usb.jpeg' },

  // #79 Tábua de Corte → tabua.jpeg (existe!)
  { match: 'tabua', arquivo: 'tabua.jpeg' },

  // #84 Ventilador → ventilador.jpeg (existe!)
  { match: 'ventilador', arquivo: 'ventilador.jpeg' },
];

function normalizar(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

(async () => {
  try {
    console.log('⏳ Buscando produtos com imagem quebrada...\n');

    const { rows: todos } = await db.query('SELECT id, sku, name, image_url FROM products ORDER BY id');

    // Filtra só os quebrados (que NÃO existem no disco)
    const quebrados = [];
    for (const p of todos) {
      if (!p.image_url || !p.image_url.startsWith('/images/products/')) {
        quebrados.push(p);
        continue;
      }
      const arquivo = path.join(pasta, path.basename(p.image_url));
      if (!fs.existsSync(arquivo)) {
        quebrados.push(p);
      }
    }

    console.log('⚠️  ' + quebrados.length + ' produtos com imagem quebrada.\n');

    let corrigidos = 0;
    let naoCorrigidos = [];

    for (const p of quebrados) {
      const nomeNorm = normalizar(p.name);

      // Procura primeiro nos aliases manuais
      let arquivoEscolhido = null;
      for (const alias of ALIASES) {
        if (nomeNorm.includes(alias.match)) {
          // Confirma que o arquivo existe na pasta
          const caminhoCompleto = path.join(pasta, alias.arquivo);
          if (fs.existsSync(caminhoCompleto)) {
            arquivoEscolhido = alias.arquivo;
            break;
          }
        }
      }

      // Fallback: tenta match automático (similar ao match-products.js)
      if (!arquivoEscolhido) {
        const arquivos = fs.readdirSync(pasta).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        let melhorScore = 0;
        let melhorArq = null;
        for (const arq of arquivos) {
          const arqNorm = normalizar(arq.replace(/\.(jpg|jpeg|png|webp)$/i, ''));
          // Match simples: produto contém arquivo OU arquivo contém produto
          if (nomeNorm.includes(arqNorm.replace(/-/g, ' '))) {
            const score = arqNorm.length * 10;
            if (score > melhorScore) { melhorScore = score; melhorArq = arq; }
          }
        }
        arquivoEscolhido = melhorArq;
      }

      if (arquivoEscolhido) {
        const novoUrl = `/images/products/${arquivoEscolhido}`;
        await db.query('UPDATE products SET image_url = $1 WHERE id = $2', [novoUrl, p.id]);
        console.log(`   ✅ #${p.id} ${p.sku} - ${p.name}`);
        console.log(`      → ${novoUrl}`);
        corrigidos++;
      } else {
        naoCorrigidos.push(p);
      }
    }

    console.log('\n📊 RESULTADO:');
    console.log('   ✅ ' + corrigidos + ' produtos remapeados');
    console.log('   ⚠️  ' + naoCorrigidos.length + ' produtos AINDA sem imagem');

    if (naoCorrigidos.length > 0) {
      console.log('\n📋 Produtos que AINDA faltam imagem (você precisa baixar):');
      naoCorrigidos.forEach(p => console.log('   • #' + p.id + ' ' + p.sku + ' - ' + p.name));
    }

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
