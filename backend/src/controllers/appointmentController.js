const pool = require('../config/database');
const { sanitizeText, isValidNumber } = require('../middlewares/security');

// Estado em memória (Fallback para demonstração offline)
let mockAppointments = [
  { 
    id: 1, 
    cliente_nome: 'Gabriel Silva', 
    cliente_telefone: '(11) 98888-7777', 
    barbeiro_id: 1, 
    barbeiro_nome: 'Lukinhas',
    tipo_servico: 'Corte Degradê', 
    valor: 45.00, 
    data: new Date().toISOString().split('T')[0], 
    horario: '09:00', 
    status: 'pendente' 
  },
  { 
    id: 2, 
    cliente_nome: 'Marcos Oliveira', 
    cliente_telefone: '(11) 98888-6666', 
    barbeiro_id: 2, 
    barbeiro_nome: 'Neguin do corte',
    tipo_servico: 'Barba Express', 
    valor: 35.00, 
    data: new Date().toISOString().split('T')[0], 
    horario: '10:30', 
    status: 'pendente' 
  },
  { 
    id: 3, 
    cliente_nome: 'Eduardo Santos', 
    cliente_telefone: '(11) 98888-5555', 
    barbeiro_id: 1, 
    barbeiro_nome: 'Lukinhas',
    tipo_servico: 'Corte + Barba', 
    valor: 85.00, 
    data: new Date().toISOString().split('T')[0], 
    horario: '14:00', 
    status: 'concluido' 
  }
];

exports.list = async (req, res) => {
  try {
    const { data, barbeiro_id } = req.query;

    if (!data) {
      return res.status(400).json({ error: 'Parâmetro de data é obrigatório (AAAA-MM-DD).' });
    }

    const sanitizedData = sanitizeText(data);

    let query = `
      SELECT a.*, b.nome as barbeiro_nome 
      FROM agendamentos a
      JOIN barbeiros b ON b.id = a.barbeiro_id
      WHERE a.data = $1
    `;
    const params = [sanitizedData];

    if (barbeiro_id && barbeiro_id !== 'todos') {
      const parsedId = parseInt(barbeiro_id);
      if (!isNaN(parsedId)) {
        query += ' AND a.barbeiro_id = $2';
        params.push(parsedId);
      }
    }

    query += ' ORDER BY a.horario ASC';

    try {
      const { rows } = await pool.query(query, params);
      
      // Se a query de banco rodar mas retornar vazio (e for a data de hoje), podemos mandar os mocks
      if (rows.length === 0 && sanitizedData === new Date().toISOString().split('T')[0]) {
        let filteredMocks = mockAppointments;
        if (barbeiro_id && barbeiro_id !== 'todos') {
          filteredMocks = mockAppointments.filter(app => app.barbeiro_id === parseInt(barbeiro_id));
        }
        return res.json(filteredMocks);
      }

      res.json(rows.map(r => ({
        ...r,
        valor: parseFloat(r.valor)
      })));

    } catch (dbError) {
      console.warn('⚠️ Banco de dados offline/erro ao buscar agendamentos. Usando fallback offline.', dbError.message);
      
      // Filtrar mocks em memória
      let filteredMocks = mockAppointments.filter(app => app.data === sanitizedData);
      if (barbeiro_id && barbeiro_id !== 'todos') {
        filteredMocks = filteredMocks.filter(app => app.barbeiro_id === parseInt(barbeiro_id));
      }
      res.json(filteredMocks);
    }
  } catch (error) {
    console.error('Erro geral ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    const { cliente_nome, cliente_telefone, barbeiro_id, tipo_servico, valor, data, horario } = req.body;

    if (!cliente_nome || !barbeiro_id || !tipo_servico || valor === undefined || valor === null || !data || !horario) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    if (!isValidNumber(valor) || Number(valor) <= 0) {
      return res.status(400).json({ error: 'Valor do serviço deve ser um número maior que zero.' });
    }

    const sanitizedNome = sanitizeText(cliente_nome);
    const sanitizedTelefone = cliente_telefone ? sanitizeText(cliente_telefone) : null;
    const sanitizedServico = sanitizeText(tipo_servico);
    const sanitizedData = sanitizeText(data);
    const sanitizedHorario = sanitizeText(horario);
    const parsedBarbeiroId = parseInt(barbeiro_id);

    try {
      // Tentar salvar no Banco PostgreSQL
      const { rows } = await pool.query(
        `INSERT INTO agendamentos (cliente_nome, cliente_telefone, barbeiro_id, tipo_servico, valor, data, horario, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente')
         RETURNING *`,
        [sanitizedNome, sanitizedTelefone, parsedBarbeiroId, sanitizedServico, Number(valor), sanitizedData, sanitizedHorario]
      );

      const { rows: bRows } = await pool.query('SELECT nome FROM barbeiros WHERE id = $1', [parsedBarbeiroId]);
      const appointment = {
        ...rows[0],
        valor: parseFloat(rows[0].valor),
        barbeiro_nome: bRows[0]?.nome || 'Barbeiro'
      };

      res.status(201).json(appointment);

    } catch (dbError) {
      console.warn('⚠️ Banco de dados offline/erro. Criando agendamento em memória.', dbError.message);

      // Fallback em memória
      const newApp = {
        id: mockAppointments.length + 1,
        cliente_nome: sanitizedNome,
        cliente_telefone: sanitizedTelefone,
        barbeiro_id: parsedBarbeiroId,
        barbeiro_nome: parsedBarbeiroId === 1 ? 'Lukinhas' : 'Neguin do corte',
        tipo_servico: sanitizedServico,
        valor: Number(valor),
        data: sanitizedData,
        horario: sanitizedHorario,
        status: 'pendente'
      };

      mockAppointments.push(newApp);
      res.status(201).json(newApp);
    }
  } catch (error) {
    console.error('Erro geral ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: 'ID de agendamento inválido.' });
    }

    const validStatuses = ['pendente', 'concluido', 'cancelado'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Escolha: pendente, concluido ou cancelado.' });
    }

    try {
      // Buscar agendamento atual no banco
      const { rows: appRows } = await pool.query('SELECT * FROM agendamentos WHERE id = $1', [parsedId]);
      if (appRows.length === 0) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      const appointment = appRows[0];

      // Atualizar status
      const { rows: updatedRows } = await pool.query(
        'UPDATE agendamentos SET status = $1 WHERE id = $2 RETURNING *',
        [status, parsedId]
      );

      // Se for CONCLUÍDO, gera automaticamente o faturamento (movimentação)
      if (status === 'concluido' && appointment.status !== 'concluido') {
        const valorServico = parseFloat(appointment.valor);
        
        // Obter comissão do barbeiro (padrão 50%)
        let comissaoPorcentagem = 50;
        const { rows: bRows } = await pool.query('SELECT comissao_padrao FROM barbeiros WHERE id = $1', [appointment.barbeiro_id]);
        if (bRows.length > 0) {
          comissaoPorcentagem = bRows[0].comissao_padrao;
        }

        const comissaoValor = (valorServico * comissaoPorcentagem) / 100;

        await pool.query(
          `INSERT INTO movimentacoes (descricao, categoria, tipo_servico, barbeiro_id, cliente_nome, valor, comissao, metodo_pagamento, status)
           VALUES ($1, 'servico', $2, $3, $4, $5, $6, 'pix', 'concluido')`,
          [
            `Serviço Concluído: ${appointment.tipo_servico}`,
            appointment.tipo_servico,
            appointment.barbeiro_id,
            appointment.cliente_nome,
            valorServico,
            comissaoValor
          ]
        );
        console.log(`✅ Faturamento de ${valorServico} gerado para o barbeiro ID ${appointment.barbeiro_id} com comissão de ${comissaoValor}`);
      }

      res.json({
        ...updatedRows[0],
        valor: parseFloat(updatedRows[0].valor)
      });

    } catch (dbError) {
      console.warn('⚠️ Banco de dados offline/erro ao atualizar status. Atualizando em memória.', dbError.message);

      // Fallback em memória
      const appIndex = mockAppointments.findIndex(app => app.id === parsedId);
      if (appIndex === -1) {
        return res.status(404).json({ error: 'Agendamento não encontrado.' });
      }

      const prevStatus = mockAppointments[appIndex].status;
      mockAppointments[appIndex].status = status;

      // Logar a movimentação simulada
      if (status === 'concluido' && prevStatus !== 'concluido') {
        const valorServico = mockAppointments[appIndex].valor;
        const comissaoValor = (valorServico * 50) / 100; // 50% comissão padrão
        console.log(`[MOCK] Faturamento simulado criado para ${mockAppointments[appIndex].cliente_nome} no valor de ${valorServico} (Comissão: ${comissaoValor})`);
      }

      res.json(mockAppointments[appIndex]);
    }
  } catch (error) {
    console.error('Erro geral ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
