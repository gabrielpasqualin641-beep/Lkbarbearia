import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
  TrendingUp, TrendingDown, DollarSign, Award, Plus, 
  Search, Filter, Calendar, CreditCard, ChevronLeft, ChevronRight, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';

const Movimentacoes = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    resumo: { saldo_liquido: 0, producao_total: 0, vales_pendentes_total: 0, entrada_total: 0, saida_total: 0 },
    movimentacoes: [],
    paginacao: { pagina_atual: 1, total_paginas: 1, total_registros: 0 }
  });

  const [periodo, setPeriodo] = useState('semana');
  const [metodo, setMetodo] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [termoBusca, setTermoBusca] = useState('');

  // Modal Novo Lançamento state
  const [modalOpen, setModalOpen] = useState(false);
  const [barbeiros, setBarbeiros] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('servico');
  const [tipoServico, setTipoServico] = useState('');
  const [barbeiroId, setBarbeiroId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [valor, setValor] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/movements', {
        params: {
          periodo,
          metodo,
          pagina,
          limite: 8
        }
      });
      setData(response.data);
    } catch (err) {
      console.error('Erro ao buscar movimentações (usando local mock):', err);
      setData({
        resumo: {
          saldo_liquido: 0.00,
          producao_total: 0.00,
          vales_pendentes_total: 0.00,
          entrada_total: 0.00,
          saida_total: 0.00
        },
        movimentacoes: [],
        paginacao: { pagina_atual: 1, total_paginas: 1, total_registros: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [periodo, metodo, pagina]);

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const res = await api.get('/auth/barbers');
        setBarbeiros(res.data);
      } catch (err) {
        console.error('Erro ao carregar barbeiros (usando local mock):', err);
        setBarbeiros([
          { id: 1, nome: 'Lukinhas' },
          { id: 2, nome: 'Neguin do corte' }
        ]);
      }
    };
    fetchBarbers();
  }, []);

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!descricao || !categoria || !valor) {
      setFormError('Preencha os campos obrigatórios (Descrição, Categoria, Valor).');
      return;
    }

    try {
      await api.post('/movements', {
        descricao,
        categoria,
        tipo_servico: categoria === 'servico' ? tipoServico : null,
        barbeiro_id: categoria === 'servico' && barbeiroId ? parseInt(barbeiroId) : null,
        cliente_nome: clienteNome || null,
        valor: parseFloat(valor),
        metodo_pagamento: categoria !== 'despesa' ? metodoPagamento : null
      });

      setFormSuccess('Lançamento registrado com sucesso!');
      setDescricao('');
      setTipoServico('');
      setBarbeiroId('');
      setClienteNome('');
      setValor('');
      
      // Recarregar dados
      fetchMovements();
      
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      console.warn('Erro ao salvar lançamento na API. Simulando localmente (Modo Demo):', err);
      const newMov = {
        id: Date.now(),
        data_hora: new Date().toISOString(),
        descricao,
        categoria,
        barbeiro_nome: categoria === 'servico' ? (barbeiroId === '1' ? 'Lukinhas' : 'Neguin do corte') : null,
        cliente_nome: clienteNome || null,
        metodo_pagamento: categoria !== 'despesa' ? metodoPagamento : null,
        comissao: categoria === 'servico' ? parseFloat(valor) * 0.5 : null,
        valor: categoria === 'despesa' || categoria === 'vale' ? -parseFloat(valor) : parseFloat(valor)
      };
      
      setData(prev => {
        const newMovs = [newMov, ...prev.movimentacoes];
        const val = newMov.valor;
        const isEntrada = val > 0;
        return {
          resumo: {
            ...prev.resumo,
            entrada_total: prev.resumo.entrada_total + (isEntrada ? val : 0),
            saida_total: prev.resumo.saida_total + (!isEntrada ? Math.abs(val) : 0),
            saldo_liquido: prev.resumo.saldo_liquido + val,
            producao_total: prev.resumo.producao_total + (categoria === 'servico' ? val : 0)
          },
          movimentacoes: newMovs,
          paginacao: { ...prev.paginacao, total_registros: prev.paginacao.total_registros + 1 }
        };
      });

      setFormSuccess('Lançamento registrado com sucesso (Modo Demo)!');
      setDescricao('');
      setTipoServico('');
      setBarbeiroId('');
      setClienteNome('');
      setValor('');
      
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);
    }
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex min-h-screen bg-lk-dark text-white overflow-x-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Fluxo de Caixa Detalhado" />
        
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          
          {/* KPI Cards Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Entrada */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-semibold uppercase tracking-wider block">Entradas</span>
                <h3 className="text-2xl font-bold mt-1 text-emerald-400">
                  {formatBRL(data.resumo.entrada_total)}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Saida */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-semibold uppercase tracking-wider block">Saídas</span>
                <h3 className="text-2xl font-bold mt-1 text-red-400">
                  {formatBRL(data.resumo.saida_total)}
                </h3>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* Saldo Liquido */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-semibold uppercase tracking-wider block">Saldo Líquido</span>
                <h3 className={`text-2xl font-bold mt-1 ${data.resumo.saldo_liquido >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {formatBRL(data.resumo.saldo_liquido)}
                </h3>
              </div>
              <div className="p-3 bg-lk-border rounded-xl text-white">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Producao Total */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-semibold uppercase tracking-wider block">Produção Total</span>
                <h3 className="text-2xl font-bold mt-1 text-lk-yellow">
                  {formatBRL(data.resumo.producao_total)}
                </h3>
              </div>
              <div className="p-3 bg-lk-yellow/10 rounded-xl text-lk-yellow">
                <Award size={24} />
              </div>
            </div>
          </div>

          {/* Filtros e Tabela Container */}
          <div className="bg-lk-card border border-lk-border rounded-2xl overflow-hidden flex flex-col">
            
            {/* Header / Toolbar */}
            <div className="p-6 border-b border-lk-border flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Filtro Período */}
              <div className="flex bg-lk-dark p-1.5 rounded-xl border border-lk-border w-full lg:w-auto">
                <button 
                  onClick={() => { setPeriodo('hoje'); setPagina(1); }}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${periodo === 'hoje' ? 'bg-lk-yellow text-lk-dark' : 'text-lk-muted hover:text-white'}`}
                >
                  Hoje
                </button>
                <button 
                  onClick={() => { setPeriodo('semana'); setPagina(1); }}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${periodo === 'semana' ? 'bg-lk-yellow text-lk-dark' : 'text-lk-muted hover:text-white'}`}
                >
                  Semana
                </button>
                <button 
                  onClick={() => { setPeriodo('mes'); setPagina(1); }}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${periodo === 'mes' ? 'bg-lk-yellow text-lk-dark' : 'text-lk-muted hover:text-white'}`}
                >
                  Mês
                </button>
              </div>

              {/* Filtro Método de Pagamento */}
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-56">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-lk-muted">
                    <CreditCard size={16} />
                  </span>
                  <select
                    value={metodo}
                    onChange={(e) => { setMetodo(e.target.value); setPagina(1); }}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 pl-10 pr-4 rounded-xl focus:outline-none focus:border-lk-yellow transition-colors appearance-none"
                  >
                    <option value="todos">Todos Métodos</option>
                    <option value="pix">Pix</option>
                    <option value="credito">Cartão de Crédito</option>
                    <option value="debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>

                <button 
                  onClick={() => setModalOpen(true)}
                  className="bg-lk-yellow text-lk-dark hover:bg-[#e0b810] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-lk-yellow/10 transition-all duration-300"
                >
                  <Plus size={16} />
                  <span>Novo Lançamento</span>
                </button>
              </div>

            </div>

            {/* Tabela de Movimentações (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-lk-border bg-lk-dark/20 text-lk-muted text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4 pl-6">Data</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Barbeiro</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Método</th>
                    <th className="p-4 text-right">Comissão</th>
                    <th className="p-4 pr-6 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lk-border text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-lk-muted">
                        Carregando lançamentos...
                      </td>
                    </tr>
                  ) : data.movimentacoes.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-12 text-center text-lk-muted">
                        Nenhuma movimentação registrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    data.movimentacoes.map((m) => (
                      <tr key={m.id} className="hover:bg-lk-border/20 transition-colors">
                        <td className="p-4 pl-6 text-lk-muted whitespace-nowrap">
                          {new Date(m.data_hora).toLocaleDateString('pt-BR')} {new Date(m.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="p-4 font-semibold text-white">{m.descricao}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            m.categoria === 'servico' ? 'bg-emerald-500/10 text-emerald-400' :
                            m.categoria === 'vale' ? 'bg-amber-500/10 text-amber-400' :
                            m.categoria === 'produto' ? 'bg-blue-500/10 text-blue-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {m.categoria === 'servico' ? 'Serviço' :
                             m.categoria === 'vale' ? 'Vale' :
                             m.categoria === 'produto' ? 'Produto' : 'Despesa'}
                          </span>
                        </td>
                        <td className="p-4 text-lk-muted">{m.barbeiro_nome || '—'}</td>
                        <td className="p-4 text-lk-muted">{m.cliente_nome || '—'}</td>
                        <td className="p-4 text-lk-muted capitalize">{m.metodo_pagamento || '—'}</td>
                        <td className="p-4 text-right text-lk-yellow font-medium">
                          {m.comissao ? formatBRL(m.comissao) : '—'}
                        </td>
                        <td className={`p-4 pr-6 text-right font-bold ${m.valor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatBRL(m.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Lista de Cards (Mobile) */}
            <div className="block md:hidden divide-y divide-lk-border/50">
              {loading ? (
                <div className="p-8 text-center text-lk-muted text-sm">Carregando lançamentos...</div>
              ) : data.movimentacoes.length === 0 ? (
                <div className="p-8 text-center text-lk-muted text-sm">Nenhuma movimentação registrada no período selecionado.</div>
              ) : (
                data.movimentacoes.map((m) => (
                  <div key={m.id} className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-white text-base">{m.descricao}</h4>
                        <span className="text-xs text-lk-muted block mt-0.5">
                          {new Date(m.data_hora).toLocaleDateString('pt-BR')} {new Date(m.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.categoria === 'servico' ? 'bg-emerald-500/10 text-emerald-400' :
                        m.categoria === 'vale' ? 'bg-amber-500/10 text-amber-400' :
                        m.categoria === 'produto' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {m.categoria === 'servico' ? 'Serviço' :
                         m.categoria === 'vale' ? 'Vale' :
                         m.categoria === 'produto' ? 'Produto' : 'Despesa'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-lk-muted">
                      {m.barbeiro_nome && (
                        <div>
                          <span className="font-bold text-white/95">Barbeiro:</span> {m.barbeiro_nome}
                        </div>
                      )}
                      {m.cliente_nome && (
                        <div>
                          <span className="font-bold text-white/95">Cliente:</span> {m.cliente_nome}
                        </div>
                      )}
                      {m.metodo_pagamento && (
                        <div className="capitalize">
                          <span className="font-bold text-white/95">Método:</span> {m.metodo_pagamento}
                        </div>
                      )}
                      {m.comissao && (
                        <div>
                          <span className="font-bold text-white/95 text-lk-yellow">Comissão:</span> <span className="text-lk-yellow font-extrabold">{formatBRL(m.comissao)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-lk-border/30">
                      <span className="text-xs font-semibold text-lk-muted">Valor da Transação</span>
                      <span className={`text-base font-black ${m.valor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatBRL(m.valor)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination footer */}
            {data.paginacao.total_paginas > 1 && (
              <div className="p-6 border-t border-lk-border flex items-center justify-between bg-lk-dark/10">
                <span className="text-xs text-lk-muted">
                  Mostrando página {data.paginacao.pagina_atual} de {data.paginacao.total_paginas} ({data.paginacao.total_registros} registros)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="p-2 bg-lk-dark border border-lk-border rounded-xl text-lk-muted hover:text-white hover:border-lk-yellow/50 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPagina(p => Math.min(data.paginacao.total_paginas, p + 1))}
                    disabled={pagina === data.paginacao.total_paginas}
                    className="p-2 bg-lk-dark border border-lk-border rounded-xl text-lk-muted hover:text-white hover:border-lk-yellow/50 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>

      {/* Modal - Novo Lançamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          
          <div className="w-full max-w-lg bg-lk-card border border-lk-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-4">
            <h3 className="text-xl font-bold">Registrar Novo Lançamento</h3>
            
            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                {formError}
              </div>
            )}
            
            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Categoria */}
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  >
                    <option value="servico">Serviço</option>
                    <option value="produto">Venda de Produto</option>
                    <option value="vale">Vale/Adiantamento</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 85.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Corte Degradê + Barba"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                />
              </div>

              {categoria === 'servico' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Barbeiro */}
                  <div>
                    <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Barbeiro</label>
                    <select
                      value={barbeiroId}
                      onChange={(e) => setBarbeiroId(e.target.value)}
                      className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                    >
                      <option value="">Selecione...</option>
                      {barbeiros.map(b => (
                        <option key={b.id} value={b.id}>{b.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo Serviço */}
                  <div>
                    <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Tipo de Serviço</label>
                    <input
                      type="text"
                      placeholder="Ex: Corte + Barba"
                      value={tipoServico}
                      onChange={(e) => setTipoServico(e.target.value)}
                      className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                    />
                  </div>
                </div>
              )}

              {categoria !== 'despesa' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Cliente */}
                  <div>
                    <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      placeholder="Ex: Rafael Silva"
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                    />
                  </div>

                  {/* Método Pagamento */}
                  <div>
                    <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Pagamento</label>
                    <select
                      value={metodoPagamento}
                      onChange={(e) => setMetodoPagamento(e.target.value)}
                      className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                    >
                      <option value="pix">Pix</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-lk-border text-lk-muted hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-lk-yellow text-lk-dark font-bold py-3 rounded-xl hover:bg-[#e0b810] transition-colors"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Movimentacoes;
