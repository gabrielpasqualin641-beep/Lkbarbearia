import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /closing
 * Retorna fechamento semanal consolidado (visão admin)
 * Alinhado com: Tela "Dashboard" → cards de resumo financeiro
 *
 * Query params:
 *   - semana: número da semana (default: semana atual)
 *   - ano: ano (default: ano atual)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const { semana, ano } = req.query as Record<string, string>;

    // Calcular semana e ano atuais se não informados
    const currentWeek = semana ? parseInt(semana) : getWeekNumber(now);
    const currentYear = ano ? parseInt(ano) : now.getFullYear();

    // Calcular dados por barbeiro
    const { rows: barbeiros } = await pool.query(`
      SELECT
        b.id AS barbeiro_id,
        b.nome,
        b.comissao_padrao,
        COALESCE(SUM(CASE WHEN m.categoria = 'servico' THEN m.valor ELSE 0 END), 0) AS valor_bruto,
        COALESCE(SUM(CASE WHEN m.categoria = 'servico' THEN m.comissao ELSE 0 END), 0) AS valor_comissao,
        COALESCE((
          SELECT SUM(v.valor)
          FROM vales v
          WHERE v.barbeiro_id = b.id AND v.status = 'ativo'
        ), 0) AS total_vales_descontados,
        COUNT(CASE WHEN m.categoria = 'servico' THEN 1 END) AS total_cortes
      FROM barbeiros b
      LEFT JOIN movimentacoes m ON m.barbeiro_id = b.id
        AND EXTRACT(WEEK FROM m.data_hora) = $1
        AND EXTRACT(YEAR FROM m.data_hora) = $2
      WHERE b.role = 'barber' AND b.ativo = true
      GROUP BY b.id
      ORDER BY valor_bruto DESC
    `, [currentWeek, currentYear]);

    // Calcular líquido a receber para cada barbeiro
    const barbeirosComLiquido = barbeiros.map(b => {
      const bruto = parseFloat(b.valor_bruto);
      const comissao = parseFloat(b.valor_comissao);
      const vales = parseFloat(b.total_vales_descontados);
      return {
        barbeiro_id: b.barbeiro_id,
        nome: b.nome,
        comissao_padrao: b.comissao_padrao,
        valor_bruto: bruto,
        valor_comissao: comissao,
        total_vales_descontados: vales,
        liquido_a_receber: comissao - vales,
        total_cortes: parseInt(b.total_cortes),
        variacao_semanal: 12, // TODO: calcular vs semana anterior
      };
    });

    // Totais consolidados
    const totais = {
      valor_bruto_total: barbeirosComLiquido.reduce((s, b) => s + b.valor_bruto, 0),
      comissao_total: barbeirosComLiquido.reduce((s, b) => s + b.valor_comissao, 0),
      vales_total: barbeirosComLiquido.reduce((s, b) => s + b.total_vales_descontados, 0),
      liquido_total: barbeirosComLiquido.reduce((s, b) => s + b.liquido_a_receber, 0),
    };

    // Calcular período legível
    const weekStart = getDateOfWeek(currentWeek, currentYear);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    res.json({
      semana: currentWeek,
      ano: currentYear,
      periodo: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      barbeiros: barbeirosComLiquido,
      totais,
    });
  } catch (error) {
    console.error('Erro ao buscar fechamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /closing/barbeiro/:id
 * Retorna fechamento individual de um barbeiro (visão barbeiro)
 * Alinhado com: Tela "Área do Barbeiro" → cards de resumo + lista "Serviços Recentes"
 *
 * Campos retornados alinhados com a UI:
 *   - liquido_a_receber → "Líquido a Receber"
 *   - total_cortes → "Cortes"
 *   - valor_bruto → "Bruto"
 *   - valor_comissao → "Comissão"
 *   - total_vales_descontados → "Vales"
 *   - servicos[].tipo_servico → "Corte de Cabelo + Barba"
 *   - servicos[].cliente_nome → "João M."
 *   - servicos[].valor_total → "R$ 85,00"
 *   - servicos[].comissao → "COM: R$ 34,00"
 */
router.get('/barbeiro/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const { semana, ano } = req.query as Record<string, string>;

    const currentWeek = semana ? parseInt(semana) : getWeekNumber(now);
    const currentYear = ano ? parseInt(ano) : now.getFullYear();

    // Verificar autorização (barbeiro só pode ver seus próprios dados)
    if (req.userRole === 'barber' && req.userId !== parseInt(String(id))) {
      res.status(403).json({ error: 'Acesso negado: você só pode ver seus próprios dados' });
      return;
    }

    // Dados do barbeiro
    const { rows: bRows } = await pool.query(
      'SELECT id, nome, comissao_padrao, foto_url FROM barbeiros WHERE id = $1',
      [id]
    );

    if (bRows.length === 0) {
      res.status(404).json({ error: 'Barbeiro não encontrado' });
      return;
    }

    const barbeiro = bRows[0];

    // Resumo semanal
    const { rows: resumoRows } = await pool.query(`
      SELECT
        COALESCE(SUM(valor), 0) AS valor_bruto,
        COALESCE(SUM(comissao), 0) AS valor_comissao,
        COUNT(*) AS total_cortes
      FROM movimentacoes
      WHERE barbeiro_id = $1
        AND categoria = 'servico'
        AND EXTRACT(WEEK FROM data_hora) = $2
        AND EXTRACT(YEAR FROM data_hora) = $3
    `, [id, currentWeek, currentYear]);

    // Vales ativos
    const { rows: valesRows } = await pool.query(`
      SELECT COALESCE(SUM(valor), 0) AS total_vales
      FROM vales WHERE barbeiro_id = $1 AND status = 'ativo'
    `, [id]);

    const bruto = parseFloat(resumoRows[0].valor_bruto);
    const comissao = parseFloat(resumoRows[0].valor_comissao);
    const vales = parseFloat(valesRows[0].total_vales);

    // Serviços recentes (lista "Serviços Recentes" na Área do Barbeiro)
    const { rows: servicos } = await pool.query(`
      SELECT
        id,
        tipo_servico,
        cliente_nome,
        data_hora,
        valor AS valor_total,
        comissao
      FROM movimentacoes
      WHERE barbeiro_id = $1 AND categoria = 'servico'
      ORDER BY data_hora DESC
      LIMIT 10
    `, [id]);

    res.json({
      barbeiro_id: barbeiro.id,
      nome: barbeiro.nome,
      comissao_padrao: barbeiro.comissao_padrao,
      valor_bruto: bruto,
      valor_comissao: comissao,
      total_vales_descontados: vales,
      liquido_a_receber: comissao - vales,
      total_cortes: parseInt(resumoRows[0].total_cortes),
      variacao_semanal: 12, // TODO: calcular dinâmicamente
      servicos: servicos.map(s => ({
        ...s,
        valor_total: parseFloat(s.valor_total),
        comissao: s.comissao ? parseFloat(s.comissao) : null,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar fechamento do barbeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── Utility Functions ───────────────────────────────────────────────

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDateOfWeek(week: number, year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const days = (week - 1) * 7;
  const result = new Date(jan1.getTime() + days * 86400000);
  const dayOfWeek = result.getDay();
  result.setDate(result.getDate() - dayOfWeek + 1); // Monday
  return result;
}

function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export default router;
