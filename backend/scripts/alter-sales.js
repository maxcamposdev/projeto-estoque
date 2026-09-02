require('dotenv').config();
const db = require('../src/config/db');

const COLUNAS = {
  sales: [
    ['seller_id', 'INTEGER'],
    ['cash_register_id', 'INTEGER'],
    ['operator_id', 'INTEGER'],
    ['unit_id', 'INTEGER'],
    ['customer_name', 'TEXT'],
    ['customer_cpf', 'TEXT'],
    ['subtotal', 'NUMERIC(12,2)'],
    ['discount', 'NUMERIC(12,2)'],
    ['total', 'NUMERIC(12,2)'],
    ['payment_method', 'VARCHAR(10)'],
    ['amount_paid', 'NUMERIC(12,2)'],
    ['change_amount', 'NUMERIC(12,2)'],
    ['created_at', 'TIMESTAMPTZ'],
  ],
  sale_items: [
    ['sale_id', 'INTEGER'],
    ['product_id', 'INTEGER'],
    ['product_name', 'TEXT'],
    ['quantity', 'NUMERIC(12,3)'],
    ['unit_price', 'NUMERIC(12,2)'],
    ['subtotal', 'NUMERIC(12,2)'],
  ],
  cash_registers: [
    ['unit_id', 'INTEGER'],
    ['operator_id', 'INTEGER'],
    ['opening_amount', 'NUMERIC(12,2)'],
    ['closing_amount', 'NUMERIC(12,2)'],
    ['expected_amount', 'NUMERIC(12,2)'],
    ['status', "VARCHAR(10) DEFAULT 'OPEN'"],
    ['notes', 'TEXT'],
    ['opened_at', 'TIMESTAMPTZ'],
    ['closed_at', 'TIMESTAMPTZ'],
  ],
};

(async () => {
  try {
    for (const [tabela, cols] of Object.entries(COLUNAS)) {
      const { rows } = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [tabela]
      );
      if (rows.length === 0) { console.log('Tabela ' + tabela + ' nao existe.'); continue; }
      const existentes = new Set(rows.map(r => r.column_name));
      let n = 0;
      for (const [col, tipo] of cols) {
        if (existentes.has(col)) continue;
        await db.query('ALTER TABLE ' + tabela + ' ADD COLUMN IF NOT EXISTS ' + col + ' ' + tipo);
        console.log('   + adicionado: ' + col + ' em ' + tabela);
        n++;
      }
      if (n === 0) console.log('[' + tabela + '] ja atualizada.');
    }
    console.log('Migracao concluida com sucesso!');
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})();
