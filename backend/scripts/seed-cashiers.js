// scripts/seed-cashiers.js — Cria funcionários de caixa para cada unidade
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const CAIXAS = [
  { name: 'Caixa Loja 01', email: 'caixa01@estoque.test', unit_id: 1 },
  { name: 'Caixa Loja 02', email: 'caixa02@estoque.test', unit_id: 2 },
  { name: 'Caixa Loja 03', email: 'caixa03@estoque.test', unit_id: 3 },
  { name: 'Caixa Loja 04', email: 'caixa04@estoque.test', unit_id: 4 },
  { name: 'Gerente Loja 01', email: 'gerente01@estoque.test', unit_id: 1 },
  { name: 'Gerente Loja 02', email: 'gerente02@estoque.test', unit_id: 2 },
];

(async () => {
  try {
    console.log('⏳ Criando funcionários de caixa...');
    const hash = await bcrypt.hash('123456', 10);

    for (const c of CAIXAS) {
      // Tenta inserir (ou atualizar se já existir)
      const { rows } = await db.query(`
        INSERT INTO users (name, email, password_hash, role, unit_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET 
          name = EXCLUDED.name, 
          role = EXCLUDED.role, 
          unit_id = EXCLUDED.unit_id
        RETURNING id, email
      `, [c.name, c.email, hash, c.email.startsWith('gerente') ? 'gerente' : 'operador', c.unit_id]);

      console.log(`   ✅ ${rows[0].email} → unidade ${c.unit_id}`);
    }

    // Conferir
    const { rows: all } = await db.query(`
      SELECT id, email, name, role, unit_id FROM users ORDER BY id
    `);
    console.log(`\n📊 Total de usuários: ${all.length}`);
    all.forEach(u => console.log(`   #${u.id} ${u.email} (${u.role}) → unidade ${u.unit_id || '-'}`));

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
