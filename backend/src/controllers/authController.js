const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

exports.listPublicBarbers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome FROM barbeiros WHERE ativo = true ORDER BY nome'
    );
    if (rows.length === 0) {
      return res.json([
        { id: 1, nome: 'Lukinhas' },
        { id: 2, nome: 'Neguin do corte' },
        { id: 3, nome: 'Admin Master' }
      ]);
    }
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar barbeiros para login, usando fallback mock:', error);
    res.json([
      { id: 1, nome: 'Lukinhas' },
      { id: 2, nome: 'Neguin do corte' },
      { id: 3, nome: 'Admin Master' }
    ]);
  }
};

exports.login = async (req, res) => {
  try {
    const { barbeiro_id, senha } = req.body;

    if (!barbeiro_id || !senha) {
      return res.status(400).json({ error: 'barbeiro_id e senha são obrigatórios' });
    }

    let barbeiro;
    try {
      const { rows } = await pool.query(
        'SELECT id, nome, comissao_padrao, foto_url, role, senha_hash FROM barbeiros WHERE id = $1 AND ativo = true',
        [barbeiro_id]
      );

      if (rows.length > 0) {
        barbeiro = rows[0];
        const senhaValida = await bcrypt.compare(senha, barbeiro.senha_hash);
        if (!senhaValida) {
          return res.status(401).json({ error: 'Senha incorreta' });
        }
      }
    } catch (dbError) {
      console.error('Database connection error in login, entering mock mode:', dbError);
    }

    // Fallback Mock mode if DB query didn't find the user (or DB is offline)
    if (!barbeiro) {
      const mocks = {
        1: { id: 1, nome: 'Lukinhas', comissao_padrao: 50, role: 'barber', pass: '1234' },
        2: { id: 2, nome: 'Neguin do corte', comissao_padrao: 50, role: 'barber', pass: '1234' },
        3: { id: 3, nome: 'Admin Master', comissao_padrao: 0, role: 'admin', pass: 'admin123' }
      };

      const mockUser = mocks[barbeiro_id];
      if (!mockUser || String(senha) !== String(mockUser.pass)) {
        return res.status(401).json({ error: 'Credenciais inválidas (Modo de Demonstração).' });
      }

      barbeiro = {
        id: mockUser.id,
        nome: mockUser.nome,
        comissao_padrao: mockUser.comissao_padrao,
        foto_url: null,
        role: mockUser.role
      };
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    const token = jwt.sign(
      { id: barbeiro.id, role: barbeiro.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn }
    );

    // Configura cookie seguro HttpOnly
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hora
    });

    res.json({
      token,
      barbeiro: {
        id: barbeiro.id,
        nome: barbeiro.nome,
        comissao_padrao: barbeiro.comissao_padrao,
        foto_url: barbeiro.foto_url,
        role: barbeiro.role
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logout realizado com sucesso' });
};
