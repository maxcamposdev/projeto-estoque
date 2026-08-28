// scripts/generate-product-images.js — Gera SVGs locais com nome + categoria
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

// Paleta de gradientes bonitos (cor1, cor2)
const PALETA = [
  ['#137f9b', '#4566d1'], // azul
  ['#8b5cf6', '#ec4899'], // roxo → rosa
  ['#10b981', '#06b6d4'], // verde → ciano
  ['#f59e0b', '#ef4444'], // laranja → vermelho
  ['#6366f1', '#8b5cf6'], // índigo → roxo
  ['#ec4899', '#f43f5e'], // rosa
  ['#14b8a6', '#0ea5e9'], // teal → sky
  ['#84cc16', '#22c55e'], // lima → verde
  ['#f97316', '#fbbf24'], // laranja → amarelo
  ['#a855f7', '#6366f1'], // roxo → índigo
];

// Ícone por categoria (emoji funciona bem em SVG)
const ICONES = {
  'eletrônicos': '📱', 'eletronicos': '📱',
  'informática': '💻', 'informatica': '💻',
  'escritório': '📝', 'escritorio': '📝',
  'papelaria': '📝',
  'limpeza': '🧹',
  'alimentação': '🍞', 'alimentacao': '🍞',
  'bebidas': '🥤',
  'ferramentas': '🔧',
  'saúde': '💊', 'saude': '💊',
  'higiene': '🧴',
  'automotivo': '🚗',
  'pet': '🐾', 'pets': '🐾',
  'utilidades': '🏠',
  'cozinha': '🍳',
  'roupas': '👕',
  'vestuário': '👕', 'vestuario': '👕',
  'calçados': '👟', 'calcados': '👟',
  'brinquedos': '🧸',
  'esportes': '⚽',
  'livros': '📚',
  'música': '🎵', 'musica': '🎵',
  'jardinagem': '🌱',
  'beleza': '💄',
  'construção': '🧱', 'construcao': '🧱',
};

function corDoProduto(id) {
  return PALETA[id % PALETA.length];
}

function iconeDaCategoria(nome) {
  if (!nome) return '📦';
  return ICONES[nome.toLowerCase().trim()] || '📦';
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Quebra texto em até N linhas para caber no SVG
function quebrarLinhas(texto, maxLen = 22) {
  const palavras = texto.split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > maxLen) {
      if (atual) linhas.push(atual);
      atual = p;
    } else {
      atual = (atual ? atual + ' ' : '') + p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.slice(0, 3); // máximo 3 linhas
}

function gerarSVG({ id, name, categoria }) {
  const [cor1, cor2] = corDoProduto(id);
  const icone = iconeDaCategoria(categoria);
  const linhas = quebrarLinhas(name);
  const totalLinhas = linhas.length;

  // Posição vertical do texto: começa em y=180, com 36px de altura de linha
  const startY = 180 - ((totalLinhas - 1) * 36) / 2;
  const linhasTexto = linhas
    .map((linha, i) =>
      `  <text x="50%" y="${startY + i * 36}" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="700" fill="white" text-anchor="middle" letter-spacing="-0.5">${escapeXml(linha)}</text>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cor1}"/>
      <stop offset="100%" stop-color="${cor2}"/>
    </linearGradient>
  </defs>

  <!-- Fundo gradiente -->
  <rect width="600" height="400" fill="url(#grad${id})"/>

  <!-- Círculos decorativos sutis -->
  <circle cx="80" cy="80" r="60" fill="rgba(255,255,255,0.08)"/>
  <circle cx="540" cy="340" r="90" fill="rgba(255,255,255,0.06)"/>

  <!-- Nome do produto -->
${linhasTexto}

  <!-- Categoria (discreta) -->
  <text x="50%" y="270" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="500" fill="rgba(255,255,255,0.75)" text-anchor="middle">${escapeXml(categoria || 'Produto')}</text>

  <!-- Ícone grande embaixo -->
  <text x="50%" y="355" font-size="50" text-anchor="middle">${icone}</text>
</svg>
`;
}

(async () => {
  try {
    console.log('⏳ Buscando produtos...');

    const { rows: produtos } = await db.query(`
      SELECT p.id, p.name, c.name AS categoria
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.id
    `);

    console.log(`📦 ${produtos.length} produtos encontrados.\n`);

    const pasta = path.join(__dirname, '..', '..', 'web', 'public', 'images', 'products');
    fs.mkdirSync(pasta, { recursive: true });

    let count = 0;
    for (const p of produtos) {
      const svg = gerarSVG({ id: p.id, name: p.name, categoria: p.categoria });
      const arquivo = path.join(pasta, `produto-${p.id}.svg`);
      fs.writeFileSync(arquivo, svg, 'utf8');
      count++;
    }

    console.log(`✅ ${count} imagens SVG geradas em:`);
    console.log(`   ${pasta}\n`);
    console.log('🌐 Cada imagem está acessível em: /images/products/produto-{id}.svg');
    console.log('💡 Para usar foto real depois: drope o arquivo (jpg/png) com o mesmo nome "produto-{id}.jpg" na pasta.');

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
