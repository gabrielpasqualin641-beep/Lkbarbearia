import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
  Landmark, AlertTriangle, ShieldCheck, Plus, CheckCircle2, 
  Calendar, CreditCard, Clock, Check, RefreshCw 
} from 'lucide-react';
import api from '../services/api';

const Vales = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    alertas: [],
    total_vales_ativos: 0,
    historico: []
  });

  const [status, setStatus] = useState('todos');
  const [barbeiros, setBarbeiros] = useState([]);

  // Modal Novo Vale state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [valor, setValor] = useState('');
  const [dataVale, setDataVale] = useState(new Date().toISOString().split('T')[0]);
  const [descricao, setDescricao] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadVales = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vales', {
        params: { status }
      });
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar vales (usando local mock):', err);
      setData({
        alertas: [
          { id: 1, status: 'pendente_aprovacao', barbeiro_nome: 'Neguin do corte', valor: 50.00 }
        ],
        total_vales_ativos: 150.00,
        historico: [
          { id: 1, data: new Date().toISOString().split('T')[0], barbeiro_nome: 'Lukinhas', descricao: 'Adiantamento final de semana', status: 'ativo', valor: 100.00 },
          { id: 2, data: new Date(Date.now() - 86400000).toISOString().split('T')[0], barbeiro_nome: 'Neguin do corte', descricao: 'Vale farmácia', status: 'pendente_aprovacao', valor: 50.00 },
          { id: 3, data: new Date(Date.now() - 172800000).toISOString().split('T')[0], barbeiro_nome: 'Lukinhas', descricao: 'Adiantamento mercado', status: 'pago', valor: 150.00 },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVales();
  }, [status]);

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

  const handleCreateVale = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedBarberId || !valor || !dataVale) {
      setFormError('Por favor, preencha todos os campos obrigatórios (Barbeiro, Valor, Data).');
      return;
    }

    try {
      await api.post('/vales', {
        barbeiro_id: parseInt(selectedBarberId),
        valor: parseFloat(valor),
        data: dataVale,
        descricao: descricao || null
      });

      setFormSuccess('Vale registrado com sucesso!');
      setSelectedBarberId('');
      setValor('');
      setDescricao('');
      
      loadVales();
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      console.warn('Erro ao criar vale na API. Simulando localmente (Modo Demo):', err);
      const newVale = {
        id: Date.now(),
        data: dataVale,
        barbeiro_nome: selectedBarberId === '1' ? 'Lukinhas' : 'Neguin do corte',
        descricao: descricao || 'Vale Lançado',
        status: 'ativo',
        valor: parseFloat(valor)
      };
      
      setData(prev => ({
        ...prev,
        total_vales_ativos: prev.total_vales_ativos + newVale.valor,
        historico: [newVale, ...prev.historico]
      }));

      setFormSuccess('Vale registrado com sucesso (Modo Demo)!');
      setSelectedBarberId('');
      setValor('');
      setDescricao('');
      
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);
    }
  };

  const handleResolveStatus = async (id, newStatus) => {
    if (confirm(`Deseja alterar o status do vale para "${newStatus}"?`)) {
      try {
        await api.patch(`/vales/${id}/status`, { status: newStatus });
        loadVales();
      } catch (err) {
        console.warn('Erro ao atualizar status do vale na API. Simulando localmente (Modo Demo):', err);
        setData(prev => {
          const updatedHistorico = prev.historico.map(v => v.id === id ? { ...v, status: newStatus } : v);
          const updatedAlertas = prev.alertas.filter(a => a.id !== id);
          const targetVale = prev.historico.find(v => v.id === id);
          let diffVal = 0;
          if (targetVale && targetVale.status === 'ativo' && newStatus === 'pago') {
            diffVal = -targetVale.valor;
          }
          return {
            alertas: updatedAlertas,
            total_vales_ativos: Math.max(0, prev.total_vales_ativos + diffVal),
            historico: updatedHistorico
          };
        });
      }
    }
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex min-h-screen bg-lk-dark text-white overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Controle de Comissões e Vales" />

        <main className="flex-1 p-8 overflow-y-auto space-y-6">

          {/* Cards Principais */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Total Ativos Card */}
            <div className="bg-lk-card border border-lk-border p-6 rounded-2xl flex items-center justify-between col-span-1">
              <div>
                <span className="text-xs text-lk-muted font-bold uppercase tracking-wider block">Vales Ativos a Descontar</span>
                <h3 className="text-2xl font-black mt-1 text-lk-yellow">
                  {formatBRL(data.total_vales_ativos)}
                </h3>
              </div>
              <div className="p-3 bg-lk-yellow/10 rounded-xl text-lk-yellow">
                <Landmark size={24} />
              </div>
            </div>

            {/* Alertas Rápidos */}
            <div className="bg-lk-card border border-lk-border p-6 rounded-2xl col-span-2 flex flex-col justify-center space-y-3">
              <span className="text-xs text-lk-muted font-bold uppercase tracking-wider block">Notificações Críticas</span>
              <div className="flex flex-wrap gap-3">
                {data.alertas.length === 0 ? (
                  <span className="text-xs text-lk-muted flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Sem pendências ou vales vencidos pendentes.
                  </span>
                ) : (
                  data.alertas.map(alerta => (
                    <div key={alerta.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      alerta.status === 'vencido' 
                        ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <AlertTriangle size={13} />
                      <span>
                        {alerta.barbeiro_nome}: {formatBRL(alerta.valor)} ({alerta.status === 'vencido' ? 'Vencido' : 'Pendente'})
                      </span>
                      {alerta.status === 'pendente_aprovacao' && (
                        <button
                          onClick={() => handleResolveStatus(alerta.id, 'ativo')}
                          className="ml-1 bg-amber-500 text-lk-dark font-bold px-1.5 py-0.5 rounded hover:bg-amber-400 transition-colors"
                        >
                          Aprovar
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Histórico e Filtros */}
          <div className="bg-lk-card border border-lk-border rounded-2xl overflow-hidden flex flex-col">
            
            {/* Header toolbar */}
            <div className="p-6 border-b border-lk-border flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Filtro Status Tabs */}
              <div className="flex bg-lk-dark p-1.5 rounded-xl border border-lk-border w-full sm:w-auto overflow-x-auto">
                {['todos', 'ativo', 'pago', 'vencido'].map(t => (
                  <button
                    key={t}
                    onClick={() => setStatus(t)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all duration-300 ${status === t ? 'bg-lk-yellow text-lk-dark' : 'text-lk-muted hover:text-white'}`}
                  >
                    {t === 'todos' ? 'Todos' : t}
                  </button>
                ))}
              </div>

              {/* Botão Novo Vale */}
              <button 
                onClick={() => setModalOpen(true)}
                className="bg-lk-yellow text-lk-dark hover:bg-[#e0b810] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-lk-yellow/10 transition-all duration-300 w-full sm:w-auto justify-center"
              >
                <Plus size={16} />
                <span>+ Lançar Vale/Adiantamento</span>
              </button>

            </div>

            {/* Tabela de Vales (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-lk-border bg-lk-dark/20 text-lk-muted text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4 pl-6">Data</th>
                    <th className="p-4">Barbeiro</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4 pr-6 text-center">Ações Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lk-border text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-lk-muted">
                        Carregando histórico...
                      </td>
                    </tr>
                  ) : data.historico.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center text-lk-muted">
                        Nenhum vale encontrado com o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    data.historico.map((v) => (
                      <tr key={v.id} className="hover:bg-lk-border/20 transition-colors">
                        <td className="p-4 pl-6 text-lk-muted whitespace-nowrap">
                          {new Date(v.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 font-bold text-white">{v.barbeiro_nome}</td>
                        <td className="p-4 text-lk-muted max-w-xs truncate">{v.descricao || '—'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            v.status === 'ativo' ? 'bg-amber-500/10 text-amber-400' :
                            v.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' :
                            v.status === 'vencido' ? 'bg-red-500/10 text-red-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {v.status === 'pendente_aprovacao' ? 'Pendente' : v.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-white">
                          {formatBRL(v.valor)}
                        </td>
                        <td className="p-4 pr-6 text-center">
                          {v.status === 'ativo' && (
                            <button
                              onClick={() => handleResolveStatus(v.id, 'pago')}
                              className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-lk-dark font-bold text-xs transition-colors"
                            >
                              Marcar Pago
                            </button>
                          )}
                          {v.status === 'pago' && (
                            <span className="text-emerald-400 text-xs flex items-center justify-center gap-1"><Check size={12} /> Descontado</span>
                          )}
                          {v.status === 'vencido' && (
                            <button
                              onClick={() => handleResolveStatus(v.id, 'pago')}
                              className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-colors"
                            >
                              Resolver
                            </button>
                          )}
                          {v.status === 'pendente_aprovacao' && (
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleResolveStatus(v.id, 'ativo')}
                                className="px-2 py-1 bg-amber-500 text-lk-dark font-bold text-xs rounded hover:bg-amber-400 transition-colors"
                              >
                                Aceitar
                              </button>
                            </div>
                          )}
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
                <div className="p-8 text-center text-lk-muted text-sm">Carregando histórico...</div>
              ) : data.historico.length === 0 ? (
                <div className="p-8 text-center text-lk-muted text-sm">Nenhum vale encontrado.</div>
              ) : (
                data.historico.map((v) => (
                  <div key={v.id} className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-white text-base">{v.barbeiro_nome}</h4>
                        <span className="text-xs text-lk-muted block mt-0.5">
                          {new Date(v.data).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        v.status === 'ativo' ? 'bg-amber-500/10 text-amber-400' :
                        v.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400' :
                        v.status === 'vencido' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {v.status === 'pendente_aprovacao' ? 'Pendente' : v.status}
                      </span>
                    </div>

                    <p className="text-sm text-lk-muted">
                      <span className="font-bold text-white/90">Motivo:</span> {v.descricao || '—'}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-lk-border/30">
                      <span className="text-base font-black text-lk-yellow">{formatBRL(v.valor)}</span>
                      <div className="flex gap-2">
                        {v.status === 'ativo' && (
                          <button
                            onClick={() => handleResolveStatus(v.id, 'pago')}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-lk-dark font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center"
                            style={{ minHeight: '48px', minWidth: '80px' }}
                          >
                            Marcar Pago
                          </button>
                        )}
                        {v.status === 'pago' && (
                          <span className="text-emerald-400 text-xs flex items-center gap-1 font-bold"><Check size={14} /> Descontado</span>
                        )}
                        {v.status === 'vencido' && (
                          <button
                            onClick={() => handleResolveStatus(v.id, 'pago')}
                            className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center"
                            style={{ minHeight: '48px', minWidth: '80px' }}
                          >
                            Resolver
                          </button>
                        )}
                        {v.status === 'pendente_aprovacao' && (
                          <button
                            onClick={() => handleResolveStatus(v.id, 'ativo')}
                            className="px-4 py-2 bg-amber-500 text-lk-dark font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center"
                            style={{ minHeight: '48px', minWidth: '80px' }}
                          >
                            Aceitar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </main>
      </div>

      {/* Modal Novo Vale */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          <div className="w-full max-w-md bg-lk-card border border-lk-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-4">
            <h3 className="text-xl font-bold">Lançar Vale/Adiantamento</h3>

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

            <form onSubmit={handleCreateVale} className="space-y-4">
              {/* Barbeiro */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Barbeiro</label>
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                >
                  <option value="">Selecione...</option>
                  {barbeiros.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  />
                </div>
                {/* Data */}
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Data</label>
                  <input
                    type="date"
                    value={dataVale}
                    onChange={(e) => setDataVale(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Descrição/Motivo</label>
                <textarea
                  placeholder="Justificativa do adiantamento..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows="3"
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow resize-none"
                />
              </div>

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
                  Salvar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Vales;
