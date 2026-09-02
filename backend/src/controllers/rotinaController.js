const db = require('../config/db');

async function listarRotinas(req, res, next) {
  try {
    const result = await db.query(`
      SELECT
        r.*,
        COUNT(DISTINCT rt.id)::int AS total_tarefas
      FROM routines r
      LEFT JOIN routine_tasks rt ON rt.routine_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

async function buscarRotina(req, res, next) {
  try {
    const { id } = req.params;

    const rotina = await db.query(
      `SELECT * FROM routines WHERE id = $1`,
      [id]
    );

    if (rotina.rows.length === 0) {
      return res.status(404).json({ error: 'Rotina não encontrada.' });
    }

    const tarefas = await db.query(
      `
      SELECT *
      FROM routine_tasks
      WHERE routine_id = $1
      ORDER BY id ASC
      `,
      [id]
    );

    res.json({
      ...rotina.rows[0],
      tasks: tarefas.rows,
    });
  } catch (error) {
    next(error);
  }
}

async function criarRotina(req, res, next) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Nome da rotina é obrigatório.',
      });
    }

    const result = await db.query(
      `
      INSERT INTO routines (name)
      VALUES ($1)
      RETURNING *
      `,
      [name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function criarTarefa(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Nome da tarefa é obrigatório.',
      });
    }

    const rotina = await db.query(
      `SELECT id FROM routines WHERE id = $1`,
      [id]
    );

    if (rotina.rows.length === 0) {
      return res.status(404).json({
        error: 'Rotina não encontrada.',
      });
    }

    const result = await db.query(
      `
      INSERT INTO routine_tasks
        (routine_id, name, description)
      VALUES
        ($1, $2, $3)
      RETURNING *
      `,
      [id, name.trim(), description?.trim() || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function concluirTarefa(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Usuário não autenticado.',
      });
    }

    const tarefa = await db.query(
      `SELECT id FROM routine_tasks WHERE id = $1`,
      [id]
    );

    if (tarefa.rows.length === 0) {
      return res.status(404).json({
        error: 'Tarefa não encontrada.',
      });
    }

    const result = await db.query(
      `
      INSERT INTO routine_task_completions
        (task_id, user_id, completed_at)
      VALUES
        ($1, $2, NOW())
      RETURNING *
      `,
      [id, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listarRotinas,
  buscarRotina,
  criarRotina,
  criarTarefa,
  concluirTarefa,
};
