import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { sanitizeText, isValidNumber } from '../utils/security';

const router = Router();

/**
 * GET /barbers
 * Retorna todos os barbeiros ativos + produção semanal
 * Alinhado com: Tela "Gestão de Barbeiros" → cards + panel "Produção Semanal"
 * Campos retornados: id, nome, comissao_padrao, telefone, foto_url, ativo, producao_semanal
 */
router.get('/', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // Buscar barbeiros ativos (excluindo admin)
    const { rows: barbeiros } = await pool.query(`
      SELECT
        b.id,
        b.nome,
        b.comissao_padrao,
        b.telefone,
        b.foto_url,
        b.ativo,
        COALESCE(SUM(
          CASE WHEN m.categoria = 'servico' AND m.data_hora >= date_trunc('week', NOW()) THEN m.valor ELSE 0 END
        ), 0) AS producao_semanal
      FROM barbeiros b
      LEFT JOIN movimentacoes m ON m.barbeiro_id = b.id
      WHERE b.role = 'barber' AND b.ativo = true
      GROUP BY b.id
      ORDER BY b.nome
    `);

    // Total da equipe
    const totalEquipe = barbeiros.reduce(
      (sum, b) => sum + parseFloat(b.producao_semanal || '0'), 0
    );

    res.json({
      barbeiros: barbeiros.map(b => ({
        ...b,
        producao_semanal: parseFloat(b.producao_semanal),
      })),
      total_equipe: totalEquipe,
      total_integrantes: barbeiros.length,
    });
  } catch (error) {
    console.error('Erro ao listar barbeiros:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /barbers
 * Cria novo barbeiro
 * Alinhado com: Tela "Gestão de Barbeiros" → modal "Novo Barbeiro"
 * Campos do form: nome, comissao_padrao, telefone, (foto)
 */
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, comissao_padrao, telefone } = req.body;

    if (!nome || typeof nome !== 'string' || nome.trim() === '') {
      res.status(400).json({ error: 'Nome é obrigatório e deve ser um texto válido' });
      return;
    }

    // Sanitização de entradas
    const sanitizedNome = sanitizeText(nome);
    const sanitizedTelefone = telefone ? sanitizeText(telefone) : null;

    let parsedComissao = 40;
    if (comissao_padrao !== undefined && comissao_padrao !== null) {
      if (!isValidNumber(comissao_padrao) || Number(comissao_padrao) < 0 || Number(comissao_padrao) > 100) {
        res.status(400).json({ error: 'Comissão padrão deve ser um número entre 0 e 100.' });
        return;
      }
      parsedComissao = Number(comissao_padrao);
    }

    const senhaHash = await bcrypt.hash('1234', 10); // Senha padrão

    const { rows } = await pool.query(
      `INSERT INTO barbeiros (nome, comissao_padrao, telefone, senha_hash, role)
       VALUES ($1, $2, $3, $4, 'barber')
       RETURNING id, nome, comissao_padrao, telefone, foto_url, ativo`,
      [sanitizedNome, parsedComissao, sanitizedTelefone, senhaHash]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar barbeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * PUT /barbers/:id
 * Atualiza barbeiro existente
 */
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, comissao_padrao, telefone, ativo } = req.body;

    const parsedId = parseInt(String(id));
    if (isNaN(parsedId)) {
      res.status(400).json({ error: 'ID do barbeiro inválido.' });
      return;
    }

    // Sanitizar e validar
    const sanitizedNome = nome !== undefined ? sanitizeText(nome) : undefined;
    const sanitizedTelefone = telefone !== undefined ? (telefone ? sanitizeText(telefone) : null) : undefined;

    let parsedComissao = undefined;
    if (comissao_padrao !== undefined && comissao_padrao !== null) {
      if (!isValidNumber(comissao_padrao) || Number(comissao_padrao) < 0 || Number(comissao_padrao) > 100) {
        res.status(400).json({ error: 'Comissão padrão deve ser um número entre 0 e 100.' });
        return;
      }
      parsedComissao = Number(comissao_padrao);
    }

    let parsedAtivo = undefined;
    if (ativo !== undefined) {
      parsedAtivo = Boolean(ativo);
    }

    // Obter dados atuais para COALESCE manual ou construir query dinâmica segura
    const { rows: currentRows } = await pool.query(
      'SELECT nome, comissao_padrao, telefone, ativo FROM barbeiros WHERE id = $1',
      [parsedId]
    );

    if (currentRows.length === 0) {
      res.status(404).json({ error: 'Barbeiro não encontrado' });
      return;
    }

    const currentBarber = currentRows[0];

    const finalNome = sanitizedNome !== undefined ? sanitizedNome : currentBarber.nome;
    const finalComissao = parsedComissao !== undefined ? parsedComissao : currentBarber.comissao_padrao;
    const finalTelefone = sanitizedTelefone !== undefined ? sanitizedTelefone : currentBarber.telefone;
    const finalAtivo = parsedAtivo !== undefined ? parsedAtivo : currentBarber.ativo;

    const { rows } = await pool.query(
      `UPDATE barbeiros
       SET nome = $1,
           comissao_padrao = $2,
           telefone = $3,
           ativo = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, nome, comissao_padrao, telefone, foto_url, ativo`,
      [finalNome, finalComissao, finalTelefone, finalAtivo, parsedId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar barbeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * DELETE /barbers/:id
 * Soft delete (desativa barbeiro)
 */
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parsedId = parseInt(String(id));
    if (isNaN(parsedId)) {
      res.status(400).json({ error: 'ID do barbeiro inválido.' });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE barbeiros SET ativo = false, updated_at = NOW() WHERE id = $1 RETURNING id, nome`,
      [parsedId]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Barbeiro não encontrado' });
      return;
    }

    res.json({ message: `Barbeiro ${rows[0].nome} desativado com sucesso` });
  } catch (error) {
    console.error('Erro ao deletar barbeiro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
