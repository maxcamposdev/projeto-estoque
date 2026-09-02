const db = require('../config/db');

async function listarRotinas(req, res, next) {
  try {
    const result = await db.query(`
      SELECT
        r.*,
        COUNT(DISTINCT rt.id)::int AS total_tarefas,
        COUNT(
          DISTINCT CASE
            WHEN rtc.completed = TRUE
             AND rtc.execution_date = CURRENT_DATE
            THEN rt.id
          END
        )::int AS tarefas_concluidas
      FROM routines r
      LEFT JOIN routine_tasks rt
        ON rt.routine_id = r.id
       AND rt.active = TRUE
      LEFT JOIN routine_task_completions rtc
        ON rtc.task_id = rt.id
       AND rtc.user_id = $1
       AND rtc.execution_date = CURRENT_DATE
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

async function buscarRotina(req, res, next) {
  try {
    const { id } = req.params;

    const rotinaResult = await db.query(
      `
      SELECT
        r.*,
        u.name AS created_by_name
      FROM routines r
      LEFT JOIN users u ON u.id = r.created_by
      WHERE r.id = $1
      `,
      [id]
    );

    if (rotinaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rotina não encontrada.',
      });
    }

    const tarefasResult = await db.query(
      `
      SELECT
        rt.*,
        COALESCE(rtc.completed, FALSE) AS completed,
        rtc.completed_at,
        rtc.note AS completion_note
      FROM routine_tasks rt
      LEFT JOIN routine_task_completions rtc
        ON rtc.task_id = rt.id
       AND rtc.user_id = $2
       AND rtc.execution_date = CURRENT_DATE
      WHERE rt.routine_id = $1
        AND rt.active = TRUE
      ORDER BY rt.order_position ASC, rt.id ASC
      `,
      [id, req.user.id]
    );

    const tarefas = tarefasResult.rows;

    const total = tarefas.length;
    const concluidas = tarefas.filter(t => t.completed).length;

    res.json({
      ...rotinaResult.rows[0],
      tasks: tarefas,
      progress: {
        total,
        completed: concluidas,
        pending: total - concluidas,
        percentage: total > 0
          ? Math.round((concluidas / total) * 100)
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function criarRotina(req, res, next) {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da rotina é obrigatório.',
      });
    }

    const result = await db.query(
      `
      INSERT INTO routines
        (name, description, created_by)
      VALUES
        ($1, $2, $3)
      RETURNING *
      `,
      [
        name.trim(),
        description?.trim() || null,
        req.user.id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function criarTarefa(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, required = false } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome da tarefa é obrigatório.',
      });
    }

    const rotina = await db.query(
      `SELECT id FROM routines WHERE id = $1`,
      [id]
    );

    if (rotina.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rotina não encontrada.',
      });
    }

    const ordem = await db.query(
      `
      SELECT COALESCE(MAX(order_position), 0) + 1 AS next_order
      FROM routine_tasks
      WHERE routine_id = $1
      `,
      [id]
    );

    const result = await db.query(
      `
      INSERT INTO routine_tasks
        (routine_id, title, description, order_position, required)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        id,
        title.trim(),
        description?.trim() || null,
        ordem.rows[0].next_order,
        Boolean(required),
      ]
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
    const { completed = true, note } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado.',
      });
    }

    const tarefa = await db.query(
      `SELECT id FROM routine_tasks WHERE id = $1`,
      [id]
    );

    if (tarefa.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada.',
      });
    }

    const result = await db.query(
      `
      INSERT INTO routine_task_completions
        (
          task_id,
          user_id,
          execution_date,
          completed,
          completed_at,
          note
        )
      VALUES
        ($1, $2, CURRENT_DATE, $3, $4, $5)
      ON CONFLICT (task_id, user_id, execution_date)
      DO UPDATE SET
        completed = EXCLUDED.completed,
        completed_at = EXCLUDED.completed_at,
        note = EXCLUDED.note,
        updated_at = NOW()
      RETURNING *
      `,
      [
        id,
        userId,
        Boolean(completed),
        completed ? new Date() : null,
        note?.trim() || null,
      ]
    );

    res.json({
      success: true,
      completion: result.rows[0],
    });
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
