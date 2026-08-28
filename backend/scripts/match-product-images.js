// scripts/match-product-images.js — Liga cada produto à imagem certa
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

// ============================================================
// NORMALIZAÇÃO: tira acento, lower-case, remove pontuação
// ============================================================
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[_\-\.\,]/g, ' ')                      // hífen/underline = espaço
    .replace(/[^a-z0-9\s]/g, ' ')                    // remove outros símbolos
    .replace(/\s+/g, ' ')                            // colapsa espaços
    .trim();
}

// Stopwords (palavras que NÃO contam para o match)
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'e', 'a', 'o',
  'para', 'com', 'sem', 'ou', 'un', 'kit', 'pack', 'c/', 's/',
  'cor', 'tamanho', 'tipo', 'modelo', 'original', 'novo'
]);

function palavrasSignificativas(texto) {
  return normalizar(texto)
    .split(' ')
    .filter(p => p.length > 2 && !STOPWORDS.has(p));
}

// ============================================================
// Pontuação de match entre nome do produto e nome do arquivo
// ============================================================
function pontuar(produtoNorm, arquivoNorm) {
  if (produtoNorm === arquivoNorm) return 100;

  const prodPalavras = palavrasSignificativas(produtoNorm);
  const arqPalavras = new Set(palavrasSignificativas(arquivoNorm).map(p => p.replace(/\.(jpg|jpeg|png|webp)$/i, '')));

  if (prodPalavras.length === 0) return 0;

  // Match exato por palavra
  let exatas = 0;
  let contidas = 0;
  for (const p of prodPalavras) {
    if (arqPalavras.has(p)) exatas++;
    else {
      // Match parcial (uma palavra contém a outra)
      for (const a of arqPalavras) {
        if (a.includes(p) || p.includes(a)) { contidas++; break; }
      }
    }
  }

  const total = exatas + contidas;
  if (total === 0) return 0;

  // Se bateu pelo menos 1 palavra exata E cobre a maioria
  if (exatas > 0) {
    return 60 + (total / prodPalavras.length) * 30 + exatas * 2;
  }

  // Match só parcial (contida)
  return 30 + (total / prodPalavras.length) * 25;
}

(async () => {
  try {
    console.log('⏳ Lendo imagens salvas na pasta...');

    const pastaImagens = path.join(__dirname, '..', '..', 'web', 'public', 'images', 'products');
    const arquivos = fs.readdirSync(pastaImagens)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`🖼️  ${arquivos.length} imagens encontradas.\n`);

    if (arquivos.length === 0) {
      console.log('⚠️  Nenhuma imagem encontrada na pasta. Saindo...');
      process.exit(0);
    }

    // Pré-normaliza os arquivos
    const arquivosNorm = arquivos.map(arq => ({
      original: arq,
      normalizado: normalizar(arq.replace(/\.(jpg|jpeg|png|webp)$/i, ''))
    }));

    console.log('⏳ Buscando produtos do banco...');
    const { rows: produtos } = await db.query('SELECT id, name FROM products ORDER BY id');
    console.log(`📦 ${produtos.length} produtos no banco.\n`);

    let matched = 0;
    let unmatched = 0;
    const semMatch = [];

    for (const p of produtos) {
      const prodNorm = normalizar(p.name);

      // Acha o melhor arquivo
      let melhor = null;
      let melhorScore = 0;
      for (const a of arquivosNorm) {
        const score = pontuar(prodNorm, a.normalizado);
        if (score > melhorScore) {
          melhorScore = score;
          melhor = a;
        }
      }

      if (melhor && melhorScore >= 60) {
        await db.query(
          'UPDATE products SET image_url = $1 WHERE id = $2',
          [`/images/products/${melhor.original}`, p.id]
        );
        matched++;
        if (matched <= 10) {
          console.log(`   ✅ #${p.id} "${p.name}" → ${melhor.original} (score ${Math.round(melhorScore)})`);
        }
      } else {
        unmatched++;
        semMatch.push({ id: p.id, name: p.name, melhor: melhor?.original || '-', score: Math.round(melhorScore) });
      }
    }

    console.log(`\n📊 RESULTADO:`);
    console.log(`   ✅ ${matched} produtos COM imagem`);
    console.log(`   ⚠️  ${unmatched} produtos SEM imagem`);
    console.log(`\n🌐 Fonte: pasta local web/public/images/products/`);

    if (semMatch.length > 0) {
      console.log(`\n📋 Produtos SEM match (para você saber o que falta baixar):`);
      semMatch.forEach(s => {
        console.log(`   ⚠️  #${s.id} "${s.name}" → melhor tentativa: ${s.melhor} (score ${s.score})`);
      });
    }

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
