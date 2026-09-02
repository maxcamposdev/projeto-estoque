-- schema.sql — Estrutura do banco de dados do Controle de Estoque
-- Executado uma única vez (via scripts/setup-db.js)
-- Tabela: usuários (admin/operadores)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: categorias
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: produtos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    sku VARCHAR(60) NOT NULL UNIQUE,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE
    SET NULL,
        quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        min_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        barcode VARCHAR(60),
        image_url TEXT,
    image_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Tabela: movimentações de estoque (entradas e saídas)
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    note TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at);
-- ============================================================
-- COMUNICAÇÃO ENTRE UNIDADES
-- ============================================================

CREATE TABLE IF NOT EXISTS internal_conversations (
    id SERIAL PRIMARY KEY,
    unit_a_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    unit_b_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    transfer_request_id INTEGER,
    purchase_order_id INTEGER,
    purchase_return_id INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT internal_conversations_units_different
        CHECK (unit_a_id <> unit_b_id)
);

CREATE TABLE IF NOT EXISTS internal_conversation_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL
        REFERENCES internal_conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS internal_conversations_unit_a_idx
    ON internal_conversations(unit_a_id);

CREATE INDEX IF NOT EXISTS internal_conversations_unit_b_idx
    ON internal_conversations(unit_b_id);

CREATE UNIQUE INDEX IF NOT EXISTS internal_conversations_units_unique
    ON internal_conversations(unit_a_id, unit_b_id)
    WHERE transfer_request_id IS NULL
      AND purchase_order_id IS NULL
      AND purchase_return_id IS NULL;

CREATE INDEX IF NOT EXISTS internal_conversation_messages_conversation_idx
    ON internal_conversation_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS internal_conversation_messages_unread_idx
    ON internal_conversation_messages(conversation_id, read_at)
    WHERE read_at IS NULL;
