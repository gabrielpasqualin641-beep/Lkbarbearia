import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sanitizeText, isValidNumber } from '../utils/security';

const router = Router();

/**
 * GET /movements
 * Retorna resumo financeiro + lista de movimentações paginada
 * Alinhado com: Tela "Dashboard" (mobile) e "Financeiro" (desktop)
 *
 * Query params:
 *   - periodo: 'hoje' | 'semana' | 'mes' (default: 'semana')
 *   - semana: número da semana (ex: 43)
 *   - ano: ano (ex: 2024)
 *   - metodo: 'pix' | 'credito' | 'debito' | 'dinheiro' | 'todos' (default: 'todos')
 *   - pagina: número da página (default: 1)
 *   - limite: registros por página (default: 10)
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      periodo = 'semana',
      metodo = 'todos',
      pagina = '1',
      limite = '10',
    } = req.query as Record<string, string>;

    // Validação estrita dos parâmetros de paginação
    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limite) || 10)); // Cap limit at 100 for security
    const offset = (page - 1) * limit;

    // Validação e higienização estrita de inputs
    const validPeriodos = ['hoje', 'semana', 'mes'];
    if (!validPeriodos.includes(periodo)) {
      res.status(400).json({ error: 'Parâmetro de período inválido.' });
      return;
    }

    const validMetodos = ['pix', 'credito', 'debito', 'dinheiro', 'todos'];
    if (!validMetodos.includes(metodo)) {
      res.status(400).json({ error: 'Parâmetro de método de pagamento inválido.' });
      return;
    }

    // Construir filtro de período (seguro pois vem de valores fixos)
    let dateFilter = '';
    switch (periodo) {
      case 'hoje':
        dateFilter = "AND m.data_hora >= CURRENT_DATE";
        break;
      case 'mes':
        dateFilter = "AND m.data_hora >= date_trunc('month', NOW())";
        break;
      case 'semana':
      default:
        dateFilter = "AND m.data_hora >= date_trunc('week', NOW())";
        break;
    }

    // Filtro de método de pagamento (preparado contra SQL Injection)
    let metodoFilter = '';
    const queryParams: any[] = [limit, offset];
    
    if (metodo !== 'todos') {
      metodoFilter = 'AND m.metodo_pagamento = $3';
      queryParams.push(metodo);
    }

    // Resumo financeiro (KPI cards da Dashboard)
    const { rows: resumoRows } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END), 0) AS entrada_total,
        COALESCE(SUM(CASE WHEN valor < 0 THEN ABS(valor) ELSE 0 END), 0) AS saida_total,
        COALESCE(SUM(valor), 0) AS saldo_liquido,
        COALESCE(SUM(CASE WHEN categoria = 'servico' THEN valor ELSE 0 END), 0) AS producao_total
      FROM movimentacoes m
      WHERE 1=1 ${dateFilter}
    `);

    const resumo = resumoRows[0];

    // Vales pendentes
    const { rows: valesRows } = await pool.query(`
      SELECT COALESCE(SUM(valor), 0) AS vales_pendentes_total
      FROM vales WHERE status = 'ativo'
    `);

    // Receita por serviço (gráfico de barras no Financeiro desktop)
    const { rows: receitaPorServico } = await pool.query(`
      SELECT
        tipo_servico,
        SUM(valor) AS valor,
        ROUND(SUM(valor) * 100.0 / NULLIF((SELECT SUM(valor) FROM movimentacoes WHERE categoria = 'servico' ${dateFilter}), 0)) AS percentual
      FROM movimentacoes m
      WHERE categoria = 'servico' AND tipo_servico IS NOT NULL ${dateFilter}
      GROUP BY tipo_servico
      ORDER BY valor DESC
      LIMIT 5
    `);

    // Movimentações paginadas (tabela "Fluxo de Caixa Detalhado") com queries parametrizadas
    const { rows: movimentacoes } = await pool.query(`
      SELECT
        m.id,
        m.data_hora,
        m.descricao,
        m.categoria,
        m.tipo_servico,
        m.barbeiro_id,
        b.nome AS barbeiro_nome,
        m.cliente_nome,
        m.valor,
        m.comissao,
        m.metodo_pagamento,
        m.status
      FROM movimentacoes m
      LEFT JOIN barbeiros b ON b.id = m.barbeiro_id
      WHERE 1=1 ${dateFilter} ${metodoFilter}
      ORDER BY m.data_hora DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    // Contagem total para paginação
    const countParams = metodo !== 'todos' ? [metodo] : [];
    const countMetodoFilter = metodo !== 'todos' ? 'AND m.metodo_pagamento = $1' : '';

    const { rows: countRows } = await pool.query(`
      SELECT COUNT(*) as total
      FROM movimentacoes m
      WHERE 1=1 ${dateFilter} ${countMetodoFilter}
    `, countParams);

    const totalRegistros = parseInt(countRows[0].total);

    res.json({
      resumo: {
        saldo_liquido: parseFloat(resumo.saldo_liquido),
        producao_total: parseFloat(resumo.producao_total),
        meta_mensal: 24000.00,
        percentual_meta: Math.round((parseFloat(resumo.producao_total) / 24000) * 100),
        vales_pendentes_total: parseFloat(valesRows[0].vales_pendentes_total),
        variacao_percentual: 12, // TODO: calcular dinâmicamente vs período anterior
        entrada_total: parseFloat(resumo.entrada_total),
        saida_total: parseFloat(resumo.saida_total),
      },
      receita_por_servico: receitaPorServico.map(r => ({
        tipo_servico: r.tipo_servico,
        valor: parseFloat(r.valor),
        percentual: parseInt(r.percentual) || 0,
      })),
      movimentacoes: movimentacoes.map(m => ({
        ...m,
        valor: parseFloat(m.valor),
        comissao: m.comissao ? parseFloat(m.comissao) : null,
      })),
      paginacao: {
        pagina_atual: page,
        total_paginas: Math.ceil(totalRegistros / limit),
        total_registros: totalRegistros,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /movements
 * Registra nova movimentação
 * Alinhado com: formulários de entrada de serviço no front-end
 * Campos: descricao, categoria, tipo_servico, barbeiro_id, cliente_nome, valor, metodo_pagamento
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      descricao,
      categoria,
      tipo_servico,
      barbeiro_id,
      cliente_nome,
      valor,
      metodo_pagamento,
    } = req.body;

    if (!descricao || !categoria || valor === undefined || valor === null) {
      res.status(400).json({ error: 'descricao, categoria e valor são obrigatórios' });
      return;
    }

    // Validar e sanitizar inputs
    const sanitizedDescricao = sanitizeText(descricao);
    const sanitizedClienteNome = cliente_nome ? sanitizeText(cliente_nome) : null;
    const sanitizedTipoServico = tipo_servico ? sanitizeText(tipo_servico) : null;
    const sanitizedMetodoPagamento = metodo_pagamento ? sanitizeText(metodo_pagamento) : null;

    const validCategorias = ['servico', 'vale', 'produto', 'despesa'];
    if (!validCategorias.includes(categoria)) {
      res.status(400).json({ error: 'Categoria inválida. Categorias aceitas: servico, vale, produto, despesa' });
      return;
    }

    if (sanitizedMetodoPagamento) {
      const validMetodos = ['pix', 'credito', 'debito', 'dinheiro'];
      if (!validMetodos.includes(sanitizedMetodoPagamento)) {
        res.status(400).json({ error: 'Método de pagamento inválido.' });
        return;
      }
    }

    if (!isValidNumber(valor)) {
      res.status(400).json({ error: 'Valor deve ser um número válido.' });
      return;
    }

    let parsedBarbeiroId: number | null = null;
    if (barbeiro_id !== undefined && barbeiro_id !== null && barbeiro_id !== '') {
      parsedBarbeiroId = parseInt(barbeiro_id);
      if (isNaN(parsedBarbeiroId)) {
        res.status(400).json({ error: 'barbeiro_id deve ser um número inteiro válido.' });
        return;
      }
    }

    // Calcular comissão automaticamente se for serviço com barbeiro
    let comissao = null;
    if (categoria === 'servico' && parsedBarbeiroId) {
      const { rows: bRows } = await pool.query(
        'SELECT comissao_padrao FROM barbeiros WHERE id = $1',
        [parsedBarbeiroId]
      );
      if (bRows.length > 0) {
        comissao = (Math.abs(Number(valor)) * bRows[0].comissao_padrao) / 100;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO movimentacoes (descricao, categoria, tipo_servico, barbeiro_id, cliente_nome, valor, comissao, metodo_pagamento, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'concluido')
       RETURNING *`,
      [
        sanitizedDescricao,
        categoria,
        sanitizedTipoServico,
        parsedBarbeiroId,
        sanitizedClienteNome,
        Number(valor),
        comissao,
        sanitizedMetodoPagamento,
      ]
    );

    // Pegar nome do barbeiro para a resposta
    let barbeiro_nome = null;
    if (parsedBarbeiroId) {
      const { rows: bRows } = await pool.query(
        'SELECT nome FROM barbeiros WHERE id = $1',
        [parsedBarbeiroId]
      );
      barbeiro_nome = bRows[0]?.nome || null;
    }

    res.status(201).json({
      ...rows[0],
      valor: parseFloat(rows[0].valor),
      comissao: rows[0].comissao ? parseFloat(rows[0].comissao) : null,
      barbeiro_nome,
    });
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
