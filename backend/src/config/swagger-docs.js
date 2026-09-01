// config/swagger-docs.js — Comentários das rotas para o Swagger

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Sistema]
 *     summary: Verifica se a API está online
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: API funcionando
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Cadastrar novo usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Administrador" }
 *               email: { type: string, example: "max@email.com" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       201: { description: Usuário criado }
 *       409: { description: Email já cadastrado }
 *
 * /api/auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Fazer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: "max@email.com" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: Login ok + token JWT }
 *       401: { description: Credenciais inválidas }
 */

/**
 * @openapi
 * /api/categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Listar categorias
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *         description: Filtrar por nome
 *     responses:
 *       200: { description: Lista de categorias }
 *   post:
 *     tags: [Categorias]
 *     summary: Criar categoria
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Eletrônicos" }
 *               description: { type: string, example: "Produtos eletrônicos" }
 *     responses:
 *       201: { description: Categoria criada }
 *
 * /api/categorias/{id}:
 *   get:
 *     tags: [Categorias]
 *     summary: Buscar categoria por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Dados da categoria }
 *   put:
 *     tags: [Categorias]
 *     summary: Atualizar categoria
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Categoria atualizada }
 *   delete:
 *     tags: [Categorias]
 *     summary: Excluir categoria
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Categoria excluída }
 */

/**
 * @openapi
 * /api/produtos:
 *   get:
 *     tags: [Produtos]
 *     summary: Listar produtos
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *       - in: query
 *         name: categoria
 *         schema: { type: integer }
 *       - in: query
 *         name: baixo
 *         schema: { type: string, enum: [true] }
 *     responses:
 *       200: { description: Lista de produtos }
 *   post:
 *     tags: [Produtos]
 *     summary: Criar produto
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Teclado USB" }
 *               sku: { type: string, example: "TEC-001" }
 *               category_id: { type: integer, example: 1 }
 *               quantity: { type: number, example: 10 }
 *               min_quantity: { type: number, example: 3 }
 *               price: { type: number, example: 89.90 }
 *     responses:
 *       201: { description: Produto criado }
 *
 * /api/produtos/{id}:
 *   get:
 *     tags: [Produtos]
 *     summary: Buscar produto por ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Dados do produto }
 *   put:
 *     tags: [Produtos]
 *     summary: Atualizar produto
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Produto atualizado }
 *   delete:
 *     tags: [Produtos]
 *     summary: Excluir produto
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Produto excluído }
 */

/**
 * @openapi
 * /api/movimentacoes:
 *   post:
 *     tags: [Movimentações]
 *     summary: Registrar entrada/saída
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id: { type: integer, example: 1 }
 *               type: { type: string, enum: [IN, OUT], example: "IN" }
 *               quantity: { type: number, example: 5 }
 *               note: { type: string, example: "Reposição" }
 *     responses:
 *       201: { description: Movimentação registrada }
 *       409: { description: Estoque insuficiente }
 *
 * /api/movimentacoes/resumo:
 *   get:
 *     tags: [Movimentações]
 *     summary: Resumo do estoque (dashboard)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Total de produtos, unidades, alertas }
 *
 * /api/movimentacoes/produto/{id}:
 *   get:
 *     tags: [Movimentações]
 *     summary: Histórico de movimentações de um produto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista de movimentações }
 */