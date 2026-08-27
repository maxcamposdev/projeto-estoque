// scripts/seed-demo.js — Popula o banco com dados de demonstração
// Uso: node scripts/seed-demo.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const CATEGORIAS = [
  'Eletrônicos', 'Escritório', 'Limpeza', 'Alimentação', 'Ferramentas',
  'Saúde & Beleza', 'Automotivo', 'Pets', 'Utilidades Domésticas', 'Papelaria',
];

// [nome, sku, categoria, preco, estoque, estoqueMin, barcode]
const PRODUTOS = [
  // Eletrônicos (0)
  ['Smartphone Android 128GB', 'ELT-001', 'Eletrônicos', 1299.90, 25, 5, '7891000100011'],
  ['Fone Bluetooth', 'ELT-002', 'Eletrônicos', 89.90, 60, 15, '7891000100028'],
  ['Carregador USB-C 20W', 'ELT-003', 'Eletrônicos', 49.90, 120, 20, '7891000100035'],
  ['Mouse Óptico USB', 'ELT-004', 'Eletrônicos', 39.90, 3, 10, '7891000100042'], // estoque baixo
  ['Teclado USB ABNT2', 'ELT-005', 'Eletrônicos', 79.90, 40, 8, '7891000100059'],
  ['Monitor LED 24"', 'ELT-006', 'Eletrônicos', 899.90, 15, 3, '7891000100066'],
  ['Cabo HDMI 2m', 'ELT-007', 'Eletrônicos', 29.90, 80, 15, '7891000100073'],
  ['Webcam Full HD', 'ELT-008', 'Eletrônicos', 159.90, 12, 4, '7891000100080'],
  ['Caixa de Som Bluetooth', 'ELT-009', 'Eletrônicos', 149.90, 35, 8, '7891000100097'],
  ['Roteador Wi-Fi 6', 'ELT-010', 'Eletrônicos', 249.90, 20, 5, '7891000100103'],
  ['Pendrive 64GB', 'ELT-011', 'Eletrônicos', 49.90, 100, 20, '7891000100110'],
  ['HD Externo 1TB', 'ELT-012', 'Eletrônicos', 349.90, 18, 4, '7891000100127'],

  // Escritório (12)
  ['Cadeira de Escritório', 'ESC-001', 'Escritório', 399.90, 10, 2, '7892000100134'],
  ['Mesa de Escritório', 'ESC-002', 'Escritório', 599.90, 8, 2, '7892000100141'],
  ['Suporte Notebook', 'ESC-003', 'Escritório', 79.90, 45, 10, '7892000100158'],
  ['Organizador de Mesa', 'ESC-004', 'Escritório', 39.90, 30, 6, '7892000100165'],
  ['Luminária de Mesa LED', 'ESC-005', 'Escritório', 89.90, 22, 5, '7892000100172'],
  ['Grampeador', 'ESC-006', 'Escritório', 19.90, 50, 10, '7892000100189'],
  ['Furador de Papel', 'ESC-007', 'Escritório', 15.90, 45, 10, '7892000100196'],
  ['Pasta Arquivo (cx)', 'ESC-008', 'Escritório', 29.90, 60, 12, '7892000100202'],

  // Limpeza (20)
  ['Detergente Neutro 5L', 'LMP-001', 'Limpeza', 25.90, 150, 30, '7893000100219'],
  ['Água Sanitária 1L', 'LMP-002', 'Limpeza', 4.50, 200, 40, '7893000100226'],
  ['Desinfetante 2L', 'LMP-003', 'Limpeza', 12.90, 180, 35, '7893000100233'],
  ['Esponja de Limpeza (pct)', 'LMP-004', 'Limpeza', 5.90, 300, 50, '7893000100240'],
  ['Sabão em Pó 1kg', 'LMP-005', 'Limpeza', 15.90, 140, 30, '7893000100257'],
  ['Multiuso 500ml', 'LMP-006', 'Limpeza', 8.90, 90, 20, '7893000100264'],
  ['Limpador de Vidros 500ml', 'LMP-007', 'Limpeza', 9.90, 75, 15, '7893000100271'],
  ['Saco de Lixo 100L (cx)', 'LMP-008', 'Limpeza', 24.90, 60, 15, '7893000100288'],
  ['Papel Toalha (pct)', 'LMP-009', 'Limpeza', 14.90, 85, 20, '7893000100295'],
  ['Vassoura', 'LMP-010', 'Limpeza', 19.90, 40, 10, '7893000100301'],
  ['Rodo + Pano', 'LMP-011', 'Limpeza', 29.90, 35, 8, '7893000100318'],

  // Alimentação (31)
  ['Arroz Tipo 1 5kg', 'ALM-001', 'Alimentação', 24.90, 200, 40, '7894000100325'],
  ['Feijão Carioca 1kg', 'ALM-002', 'Alimentação', 8.90, 180, 40, '7894000100332'],
  ['Café Torrado 500g', 'ALM-003', 'Alimentação', 18.90, 160, 30, '7894000100349'],
  ['Açúcar Refinado 5kg', 'ALM-004', 'Alimentação', 22.90, 120, 25, '7894000100356'],
  ['Óleo de Soja 900ml', 'ALM-005', 'Alimentação', 6.90, 250, 50, '7894000100363'],
  ['Macarrão Espaguete 500g', 'ALM-006', 'Alimentação', 4.90, 220, 45, '7894000100370'],
  ['Molho de Tomate 340g', 'ALM-007', 'Alimentação', 3.90, 190, 40, '7894000100387'],
  ['Sal Refinado 1kg', 'ALM-008', 'Alimentação', 2.90, 210, 40, '7894000100394'],
  ['Biscoito Recheado (cx)', 'ALM-009', 'Alimentação', 3.50, 150, 30, '7894000100400'],
  ['Achocolatado 400g', 'ALM-010', 'Alimentação', 8.90, 100, 20, '7894000100417'],
  ['Leite UHT Integral 1L', 'ALM-011', 'Alimentação', 4.50, 300, 60, '7894000100424'],
  ['Farinha de Trigo 1kg', 'ALM-012', 'Alimentação', 5.90, 140, 30, '7894000100431'],

  // Ferramentas (43)
  ['Chave de Fenda', 'FRR-001', 'Ferramentas', 12.90, 80, 15, '7895000100448'],
  ['Martelo', 'FRR-002', 'Ferramentas', 24.90, 50, 10, '7895000100455'],
  ['Alicate Universal', 'FRR-003', 'Ferramentas', 34.90, 45, 10, '7895000100462'],
  ['Fita Métrica 5m', 'FRR-004', 'Ferramentas', 14.90, 70, 15, '7895000100479'],
  ['Parafusadeira', 'FRR-005', 'Ferramentas', 199.90, 20, 4, '7895000100486'],
  ['Serra Manual', 'FRR-006', 'Ferramentas', 39.90, 25, 5, '7895000100493'],
  ['Nível de Bolha', 'FRR-007', 'Ferramentas', 19.90, 35, 8, '7895000100509'],
  ['Caixa de Ferramentas', 'FRR-008', 'Ferramentas', 89.90, 15, 3, '7895000100516'],

  // Saúde & Beleza (51)
  ['Protetor Solar FPS50', 'SLD-001', 'Saúde & Beleza', 29.90, 90, 20, '7896000100523'],
  ['Shampoo 350ml', 'SLD-002', 'Saúde & Beleza', 15.90, 130, 25, '7896000100530'],
  ['Condicionador 350ml', 'SLD-003', 'Saúde & Beleza', 16.90, 120, 25, '7896000100547'],
  ['Creme Dental 90g', 'SLD-004', 'Saúde & Beleza', 6.90, 200, 40, '7896000100554'],
  ['Sabonete (cx 6un)', 'SLD-005', 'Saúde & Beleza', 12.90, 110, 20, '7896000100561'],
  ['Absorvente (pct)', 'SLD-006', 'Saúde & Beleza', 9.90, 95, 20, '7896000100578'],
  ['Fralda Descartável (pct)', 'SLD-007', 'Saúde & Beleza', 39.90, 60, 12, '7896000100585'],
  ['Esmalte (c/ cores)', 'SLD-008', 'Saúde & Beleza', 4.90, 80, 15, '7896000100592'],
  ['Algodão (pct)', 'SLD-009', 'Saúde & Beleza', 7.90, 70, 15, '7896000100608'],
  ['Soro Fisiológico 500ml', 'SLD-010', 'Saúde & Beleza', 8.90, 65, 15, '7896000100615'],

  // Automotivo (61)
  ['Óleo de Motor 5W30 1L', 'AUT-001', 'Automotivo', 34.90, 80, 15, '7897000100622'],
  ['Aditivo Radiador 1L', 'AUT-002', 'Automotivo', 14.90, 60, 12, '7897000100639'],
  ['Limpador de Para-brisa 1L', 'AUT-003', 'Automotivo', 8.90, 90, 18, '7897000100646'],
  ['Cera Automotiva', 'AUT-004', 'Automotivo', 29.90, 40, 8, '7897000100653'],
  ['Palheta de Limpador', 'AUT-005', 'Automotivo', 24.90, 35, 7, '7897000100660'],
  ['Cabo de Bateria', 'AUT-006', 'Automotivo', 49.90, 25, 5, '7897000100677'],
  ['Lâmpada Automotiva H4', 'AUT-007', 'Automotivo', 19.90, 55, 10, '7897000100684'],
  ['Flanela Microfibra', 'AUT-008', 'Automotivo', 9.90, 100, 20, '7897000100691'],

  // Pets (69)
  ['Ração Cães 15kg', 'PET-001', 'Pets', 89.90, 50, 10, '7898000100707'],
  ['Ração Gatos 10kg', 'PET-002', 'Pets', 79.90, 45, 9, '7898000100714'],
  ['Areia Higiênica 12kg', 'PET-003', 'Pets', 29.90, 70, 15, '7898000100721'],
  ['Coleira', 'PET-004', 'Pets', 19.90, 55, 10, '7898000100738'],
  ['Brinquedo Pet', 'PET-005', 'Pets', 14.90, 65, 12, '7898000100745'],
  ['Cama Pet M', 'PET-006', 'Pets', 79.90, 20, 4, '7898000100752'],
  ['Shampoo Pet 500ml', 'PET-007', 'Pets', 24.90, 40, 8, '7898000100769'],

  // Utilidades Domésticas (76)
  ['Jogo de Panelas', 'UTD-001', 'Utilidades Domésticas', 149.90, 20, 4, '7899000100776'],
  ['Potes Herméticos (c/5)', 'UTD-002', 'Utilidades Domésticas', 39.90, 45, 9, '7899000100783'],
  ['Tábua de Corte', 'UTD-003', 'Utilidades Domésticas', 24.90, 50, 10, '7899000100790'],
  ['Copos de Vidro (c/6)', 'UTD-004', 'Utilidades Domésticas', 29.90, 60, 12, '7899000100806'],
  ['Toalha de Banho', 'UTD-005', 'Utilidades Domésticas', 34.90, 55, 10, '7899000100813'],
  ['Cortina Blackout', 'UTD-006', 'Utilidades Domésticas', 89.90, 25, 5, '7899000100820'],
  ['Tapete de Entrada', 'UTD-007', 'Utilidades Domésticas', 49.90, 30, 6, '7899000100837'],
  ['Ventilador 40cm', 'UTD-008', 'Utilidades Domésticas', 159.90, 2, 5, '7899000100844'], // estoque baixo
  ['Ferro de Passar', 'UTD-009', 'Utilidades Domésticas', 99.90, 18, 4, '7899000100851'],
  ['Aspirador de Pó', 'UTD-010', 'Utilidades Domésticas', 249.90, 12, 3, '7899000100868'],
  ['Garrafa Térmica 1L', 'UTD-011', 'Utilidades Domésticas', 59.90, 40, 8, '7899000100875'],
  ['Lixeira 20L', 'UTD-012', 'Utilidades Domésticas', 34.90, 35, 8, '7899000100882'],

  // Papelaria (88)
  ['Caneta Esferográfica (cx)', 'PAP-001', 'Papelaria', 12.90, 300, 60, '7900000100899'],
  ['Lápis (cx)', 'PAP-002', 'Papelaria', 8.90, 250, 50, '7900000100905'],
  ['Caderno 96 Folhas', 'PAP-003', 'Papelaria', 14.90, 180, 35, '7900000100912'],
  ['Resma de Papel A4', 'PAP-004', 'Papelaria', 24.90, 200, 40, '7900000100929'],
  ['Caneta Marca-texto (c/4)', 'PAP-005', 'Papelaria', 9.90, 140, 28, '7900000100936'],
  ['Cola Branca 90g', 'PAP-006', 'Papelaria', 3.90, 190, 38, '7900000100943'],
  ['Tesoura Escolar', 'PAP-007', 'Papelaria', 7.90, 120, 24, '7900000100950'],
  ['Régua 30cm', 'PAP-008', 'Papelaria', 3.50, 160, 32, '7900000100967'],
  ['Borracha (cx)', 'PAP-009', 'Papelaria', 5.90, 170, 34, '7900000100974'],
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Iniciando seed de demonstração...');

    await client.query('BEGIN');

    // Limpa as tabelas (ordem correta por causa das FKs)
    await client.query('TRUNCATE stock_movements, products, categories, users RESTART IDENTITY CASCADE');

    // 1. Usuário de demonstração
    const passwordHash = await bcrypt.hash('123456', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)`,
      ['Max Campos', 'maxcamposdev@gmail.com', passwordHash, 'admin']
    );
    console.log('👤 Usuário demo criado: maxcamposdev@gmail.com / 123456');

    // 2. Categorias
    for (const nome of CATEGORIAS) {
      await client.query('INSERT INTO categories (name) VALUES ($1)', [nome]);
    }
    console.log(`📂 ${CATEGORIAS.length} categorias criadas`);

    // 3. Produtos
    const catMap = {};
    const { rows: cats } = await client.query('SELECT id, name FROM categories');
    for (const c of cats) catMap[c.name] = c.id;

    for (const [nome, sku, cat, preco, qtd, minQtd, barcode] of PRODUTOS) {
      await client.query(
        `INSERT INTO products (name, sku, description, category_id, quantity, min_quantity, price, barcode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [nome, sku, `Produto de demonstração: ${nome}`, catMap[cat], qtd, minQtd, preco, barcode]
      );
    }
    console.log(`📦 ${PRODUTOS.length} produtos criados`);

    // 4. Movimentações dos últimos 30 dias (entradas e saídas aleatórias)
    const { rows: prods } = await client.query('SELECT id, quantity FROM products');
    const agora = Date.now();
    let movCount = 0;
    const notas = ['Venda balcão', 'Reposição', 'Compra fornecedor', 'Venda delivery', 'Ajuste de inventário', 'Perda/avaria'];

    for (const p of prods) {
      const n = 3 + Math.floor(Math.random() * 5); // 3 a 7 movimentações por produto
      for (let i = 0; i < n; i++) {
        const diasAtras = Math.floor(Math.random() * 30);
        const data = new Date(agora - diasAtras * 86400000 - Math.floor(Math.random() * 86400000));
        const type = Math.random() > 0.5 ? 'IN' : 'OUT';
        const qtd = 1 + Math.floor(Math.random() * 15);
        const nota = notas[Math.floor(Math.random() * notas.length)];
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, note, user_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [p.id, type, qtd, nota, 1, data]
        );
        movCount++;
      }
    }
    console.log(`🔄 ${movCount} movimentações criadas (últimos 30 dias)`);

    await client.query('COMMIT');
    console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
    console.log('   Use o login: maxcamposdev@gmail.com / 123456');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();