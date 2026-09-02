const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

async function criarUsuarioDemo() {
  try {
    const email = 'admin@estoque.test';

    const { rows: existentes } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existentes.length > 0) {
      console.log('✅ Usuário demo já existe (id:', existentes[0].id, '). Nada a fazer.');
      process.exit(0);
    }

    const senhaHash = await bcrypt.hash('demo123', 10);

    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      ['Usuário Demo', email, senhaHash, 'admin']
    );

    console.log('✅ Usuário demo criado com sucesso:');
    console.log(rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário demo:', error.message);
    process.exit(1);
  }
}

criarUsuarioDemo();
