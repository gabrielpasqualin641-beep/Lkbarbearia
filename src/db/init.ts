import pool from './pool';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  console.log('🔧 Inicializando banco de dados LK Barbearia...');

  try {
    // Executar schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✅ Schema criado com sucesso!');

    // Verificar se já existem barbeiros
    const { rows } = await pool.query('SELECT COUNT(*) FROM barbeiros');
    if (parseInt(rows[0].count) > 0) {
      console.log('ℹ️  Dados já existem. Pulando seed.');
      await pool.end();
      return;
    }

    // Seed: Criar barbeiros iniciais (alinhados com as telas do Stitch)
    const senha = await bcrypt.hash('1234', 10);

    const barbeiros = [
      { nome: 'Lukinhas', comissao: 50, telefone: '(11) 99999-0001' },
      { nome: 'Neguin do corte', comissao: 50, telefone: '(11) 99999-0002' },
    ];

    for (const b of barbeiros) {
      await pool.query(
        `INSERT INTO barbeiros (nome, comissao_padrao, telefone, senha_hash, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [b.nome, b.comissao, b.telefone, senha, 'barber']
      );
    }

    // Criar admin
    const adminSenha = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO barbeiros (nome, comissao_padrao, telefone, senha_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['Admin Master', 0, '(11) 99999-0000', adminSenha, 'admin']
    );

    console.log('✅ 2 barbeiros + 1 admin criados (senha padrão: 1234 / admin123)');

    // Seed: Movimentações de exemplo
    const movimentacoes = [
      { desc: 'Corte Degradê + Barba', cat: 'servico', tipo: 'Corte + Barba', barb: 1, cli: 'Rafael Costa', val: 85.00, met: 'pix' },
      { desc: 'Vale Antecipado', cat: 'vale', tipo: null, barb: 2, cli: null, val: -150.00, met: 'pix' },
      { desc: 'Pomada Premium LK', cat: 'produto', tipo: null, barb: null, cli: 'Cliente Avulso', val: 60.00, met: 'dinheiro' },
      { desc: 'Barba Terapia', cat: 'servico', tipo: 'Barba Terapia', barb: 1, cli: 'Paulo Henrique', val: 45.00, met: 'credito' },
      { desc: 'Manutenção Ar-Condicionado', cat: 'despesa', tipo: null, barb: null, cli: null, val: -350.00, met: 'pix' },
      { desc: 'Corte de Cabelo + Barba', cat: 'servico', tipo: 'Corte + Barba', barb: 1, cli: 'João M.', val: 85.00, met: 'dinheiro' },
      { desc: 'Barba Express', cat: 'servico', tipo: 'Barba Express', barb: 1, cli: 'Carlos Alberto', val: 35.00, met: 'pix' },
      { desc: 'Corte Kids', cat: 'servico', tipo: 'Corte Kids', barb: 1, cli: 'Enzo (Ref: Pedro)', val: 50.00, met: 'credito' },
      { desc: 'Corte Degradê', cat: 'servico', tipo: 'Corte Degradê', barb: 2, cli: 'Marcos Silva', val: 45.00, met: 'credito' },
      { desc: 'Sobrancelha', cat: 'servico', tipo: 'Sobrancelha', barb: 3, cli: 'Lucas Oliveira', val: 15.00, met: 'dinheiro' },
    ];

    for (const m of movimentacoes) {
      const comissao = m.cat === 'servico' && m.barb
        ? (Math.abs(m.val) * (barbeiros[(m.barb as number) - 1]?.comissao || 40) / 100)
        : null;

      await pool.query(
        `INSERT INTO movimentacoes (descricao, categoria, tipo_servico, barbeiro_id, cliente_nome, valor, comissao, metodo_pagamento, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [m.desc, m.cat, m.tipo, m.barb, m.cli, m.val, comissao, m.met, 'concluido']
      );
    }
    console.log('✅ 10 movimentações de exemplo criadas');

    // Seed: Vales de exemplo
    const vales = [
      { barb: 1, val: 150.00, desc: 'Empréstimo emergencial', data: '2024-05-10', status: 'pago' },
      { barb: 3, val: 50.00, desc: 'Vale combustível', data: '2024-05-15', status: 'pago' },
      { barb: 1, val: 400.00, desc: 'Adiantamento quinzenal', data: '2024-05-14', status: 'ativo' },
      { barb: 2, val: 120.00, desc: 'Compra de suprimentos pessoais', data: '2024-05-12', status: 'ativo' },
      { barb: 1, val: 150.00, desc: 'Vale vencido - pendência', data: '2024-05-01', status: 'vencido', venc: '2024-05-12' },
      { barb: 2, val: 200.00, desc: 'Adiantamento solicitado', data: '2024-05-16', status: 'pendente_aprovacao' },
    ];

    for (const v of vales) {
      await pool.query(
        `INSERT INTO vales (barbeiro_id, valor, descricao, data, data_vencimento, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [v.barb, v.val, v.desc, v.data, (v as any).venc || null, v.status]
      );
    }
    console.log('✅ 6 vales de exemplo criados');

    console.log('\n🎉 Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();
