const pool = require('../config/database');
const { sanitizeText, isValidNumber } = require('../middlewares/security');

exports.list = async (req, res) => {
  try {
    const {
      periodo = 'semana',
      metodo = 'todos',
      pagina = '1',
      limite = '10'
    } = req.query;

    // Validação estrita
    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(limite) || 10));
    const offset = (page - 1) * limit;

    const validPeriodos = ['hoje', 'semana', 'mes'];
    if (!validPeriodos.includes(periodo)) {
      return res.status(400).json({ error: 'Parâmetro de período inválido.' });
    }

    const validMetodos = ['pix', 'credito', 'debito', 'dinheiro', 'todos'];
    if (!validMetodos.includes(metodo)) {
      return res.status(400).json({ error: 'Parâmetro de método de pagamento inválido.' });
    }

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

    let metodoFilter = '';
    const queryParams = [limit, offset];

    if (metodo !== 'todos') {
      metodoFilter = 'AND m.metodo_pagamento = $3';
      queryParams.push(metodo);
    }

    // Resumo
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

    // Vales
    const { rows: valesRows } = await pool.query(`
      SELECT COALESCE(SUM(valor), 0) AS vales_pendentes_total
      FROM vales WHERE status = 'ativo'
    `);

    // Receita por serviço
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

    // Movimentações
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
        variacao_percentual: 12,
        entrada_total: parseFloat(resumo.entrada_total),
        saida_total: parseFloat(resumo.saida_total)
      },
      receita_por_servico: receitaPorServico.map(r => ({
        tipo_servico: r.tipo_servico,
        valor: parseFloat(r.valor),
        percentual: parseInt(r.percentual) || 0
      })),
      movimentacoes: movimentacoes.map(m => ({
        ...m,
        valor: parseFloat(m.valor),
        comissao: m.comissao ? parseFloat(m.comissao) : null
      })),
      paginacao: {
        pagina_atual: page,
        total_paginas: Math.ceil(totalRegistros / limit),
        total_registros: totalRegistros
      }
    });
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      descricao,
      categoria,
      tipo_servico,
      barbeiro_id,
      cliente_nome,
      valor,
      metodo_pagamento
    } = req.body;

    if (!descricao || !categoria || valor === undefined || valor === null) {
      return res.status(400).json({ error: 'descricao, categoria e valor são obrigatórios' });
    }

    const sanitizedDescricao = sanitizeText(descricao);
    const sanitizedClienteNome = cliente_nome ? sanitizeText(cliente_nome) : null;
    const sanitizedTipoServico = tipo_servico ? sanitizeText(tipo_servico) : null;
    const sanitizedMetodoPagamento = metodo_pagamento ? sanitizeText(metodo_pagamento) : null;

    const validCategorias = ['servico', 'vale', 'produto', 'despesa'];
    if (!validCategorias.includes(categoria)) {
      return res.status(400).json({ error: 'Categoria inválida. Categorias aceitas: servico, vale, produto, despesa' });
    }

    if (sanitizedMetodoPagamento) {
      const validMetodos = ['pix', 'credito', 'debito', 'dinheiro'];
      if (!validMetodos.includes(sanitizedMetodoPagamento)) {
        return res.status(400).json({ error: 'Método de pagamento inválido.' });
      }
    }

    if (!isValidNumber(valor)) {
      return res.status(400).json({ error: 'Valor deve ser um número válido.' });
    }

    let parsedBarbeiroId = null;
    if (barbeiro_id !== undefined && barbeiro_id !== null && barbeiro_id !== '') {
      parsedBarbeiroId = parseInt(barbeiro_id);
      if (isNaN(parsedBarbeiroId)) {
        return res.status(400).json({ error: 'barbeiro_id deve ser um número inteiro válido.' });
      }
    }

    // Calcular comissão
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
        sanitizedMetodoPagamento
      ]
    );

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
      barbeiro_nome
    });
  } catch (error) {
    console.error('Erro ao criar movimentação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
