import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { sanitizeText, isValidNumber } from '../utils/security';

const router = Router();

/**
 * GET /vales
 * Retorna alertas + histórico de vales
 * Alinhado com: Tela "Módulo de Vales"
 *
 * Query params:
 *   - status: 'ativo' | 'pago' | 'vencido' | 'todos' (default: 'todos')
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status = 'todos' } = req.query as Record<string, string>;

    const validStatuses = ['ativo', 'pago', 'vencido', 'pendente_aprovacao', 'todos'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Filtro de status inválido.' });
      return;
    }

    // Alertas: vales vencidos e pendentes de aprovação
    const { rows: alertas } = await pool.query(`
      SELECT
        v.id,
        CASE
          WHEN v.status = 'vencido' THEN 'vencido'
          WHEN v.status = 'pendente_aprovacao' THEN 'pendente_aprovacao'
          ELSE v.status
        END AS tipo,
        v.barbeiro_id,
        b.nome AS barbeiro_nome,
        v.valor,
        v.data_vencimento,
        v.status
      FROM vales v
      JOIN barbeiros b ON b.id = v.barbeiro_id
      WHERE v.status IN ('vencido', 'pendente_aprovacao')
      ORDER BY v.data DESC
    `);

    // Total de vales ativos (card "Resumo Mensal")
    const { rows: totalRows } = await pool.query(`
      SELECT COALESCE(SUM(valor), 0) AS total_vales_ativos
      FROM vales WHERE status = 'ativo'
    `);

    // Histórico filtrado por status (tabela "Histórico Recente")
    let statusFilter = '';
    const queryParams: any[] = [];
    if (status !== 'todos') {
      statusFilter = 'AND v.status = $1';
      queryParams.push(status);
    }

    const { rows: historico } = await pool.query(`
      SELECT
        v.id,
        v.data,
        v.barbeiro_id,
        b.nome AS barbeiro_nome,
        v.descricao,
        v.valor,
        v.status
      FROM vales v
      JOIN barbeiros b ON b.id = v.barbeiro_id
      WHERE 1=1 ${statusFilter}
      ORDER BY v.data DESC
    `, queryParams);

    res.json({
      alertas: alertas.map(a => ({
        ...a,
        valor: parseFloat(a.valor),
      })),
      total_vales_ativos: parseFloat(totalRows[0].total_vales_ativos),
      historico: historico.map(h => ({
        ...h,
        valor: parseFloat(h.valor),
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar vales:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /vales
 * Registra novo vale
 * Alinhado com: Tela "Módulo de Vales" → form "Registrar Novo Vale"
 * Campos do form: barbeiro_id (select), valor (number), data (date), descricao (textarea)
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { barbeiro_id, valor, data, descricao } = req.body;

    if (!barbeiro_id || valor === undefined || valor === null || !data) {
      res.status(400).json({ error: 'barbeiro_id, valor e data são obrigatórios' });
      return;
    }

    // Validação de tipo e formato
    const parsedBarbeiroId = parseInt(barbeiro_id);
    if (isNaN(parsedBarbeiroId)) {
      res.status(400).json({ error: 'barbeiro_id deve ser um número inteiro válido.' });
      return;
    }

    if (!isValidNumber(valor) || Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor deve ser um número válido e maior que zero.' });
      return;
    }

    // Sanitização de entradas de texto
    const sanitizedDescricao = descricao ? sanitizeText(descricao) : null;
    const sanitizedData = sanitizeText(data); // Previne injeções via string de data

    // Verificar se o barbeiro existe
    const { rows: bRows } = await pool.query(
      'SELECT nome FROM barbeiros WHERE id = $1 AND ativo = true',
      [parsedBarbeiroId]
    );

    if (bRows.length === 0) {
      res.status(404).json({ error: 'Barbeiro associado não encontrado ou inativo.' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO vales (barbeiro_id, valor, data, descricao, status)
       VALUES ($1, $2, $3, $4, 'ativo')
       RETURNING *`,
      [parsedBarbeiroId, Number(valor), sanitizedData, sanitizedDescricao]
    );

    res.status(201).json({
      ...rows[0],
      valor: parseFloat(rows[0].valor),
      barbeiro_nome: bRows[0].nome,
    });
  } catch (error) {
    console.error('Erro ao criar vale:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PATCH /vales/:id/status
 * Atualiza status de um vale (ex: marcar como pago, resolver vencido)
 * Alinhado com: botões "Resolver Agora" e "Ver Detalhes" nos cards de alerta
 */
router.patch('/:id/status', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const parsedId = parseInt(String(id));
    if (isNaN(parsedId)) {
      res.status(400).json({ error: 'ID do vale inválido.' });
      return;
    }

    const validStatuses = ['ativo', 'pago', 'vencido', 'pendente_aprovacao'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}` });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE vales SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, barbeiro_id, valor, descricao, data, status`,
      [status, parsedId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Vale não encontrado' });
      return;
    }

    res.json({
      ...rows[0],
      valor: parseFloat(rows[0].valor),
    });
  } catch (error) {
    console.error('Erro ao atualizar status do vale:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
