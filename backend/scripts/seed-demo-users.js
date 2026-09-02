// scripts/seed-demo-users.js — Usuários genéricos para demonstração
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const USERS = [
  { name: 'Administrador', email: 'admin@estoque.test', role: 'admin', unit_id: null },
  { name: 'Gerente', email: 'gerente@estoque.test', role: 'gerente', unit_id: 1 },
  { name: 'Vendedor 1', email: 'vendedor1@estoque.test', role: 'operador', unit_id: 1 },
  { name: 'Vendedor 2', email: 'vendedor2@estoque.test', role: 'operador', unit_id: 2 },
];

(async () => {
  try {
    console.log('Migrando usuarios antigos...');
    const mig = await db.query(
      `UPDATE users SET email = 'admin@estoque.test' WHERE email = 'maxcamposdev@gmail.com'`
    );
    console.log('   Migrados: ' + mig.rowCount);

    console.log('Criando usuarios genericos de demonstracao...');
    const hash = await bcrypt.hash('123456', 10);
    for (const u of USERS) {
      const { rows } = await db.query(
        `INSERT INTO users (name, email, password_hash, role, unit_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           unit_id = EXCLUDED.unit_id,
           password_hash = EXCLUDED.password_hash
         RETURNING id, name, email, role, unit_id`,
        [u.name, u.email, hash, u.role, u.unit_id]
      );
      const r = rows[0];
      console.log('   OK #' + r.id + ' ' + r.name + ' (' + r.role + ') — ' + r.email);
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})();
