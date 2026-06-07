import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool';

const router = Router();

/**
 * GET /auth/barbers
 * Público — retorna lista de barbeiros para popular o select de login
 * Alinhado com: Tela "Área do Barbeiro" → <select> BARBEIRO
 */
router.get('/barbers', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome FROM barbeiros WHERE ativo = true ORDER BY nome'
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar barbeiros para login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /auth/login
 * Alinhado com: Tela "Área do Barbeiro" → form login
 * Campos esperados do front: barbeiro_id (do select), senha (input password)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { barbeiro_id, senha } = req.body;

    if (!barbeiro_id || !senha) {
      res.status(400).json({ error: 'barbeiro_id e senha são obrigatórios' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, nome, comissao_padrao, foto_url, role, senha_hash FROM barbeiros WHERE id = $1 AND ativo = true',
      [barbeiro_id]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Barbeiro não encontrado' });
      return;
    }

    const barbeiro = rows[0];
    const senhaValida = await bcrypt.compare(senha, barbeiro.senha_hash);

    if (!senhaValida) {
      res.status(401).json({ error: 'Senha incorreta' });
      return;
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const token = jwt.sign(
      { id: barbeiro.id, role: barbeiro.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: expiresIn as any }
    );

    // Configurar cookie seguro HttpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hora
    });

    res.json({
      token,
      barbeiro: {
        id: barbeiro.id,
        nome: barbeiro.nome,
        comissao_padrao: barbeiro.comissao_padrao,
        foto_url: barbeiro.foto_url,
        role: barbeiro.role,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /auth/logout
 * Limpa o cookie do token JWT
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logout realizado com sucesso' });
});

export default router;
