import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
  Users, TrendingUp, DollarSign, Award, Plus, Trash2, 
  Edit3, Phone, ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';

const DashboardAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    barbeiros: [],
    total_equipe: 0,
    total_integrantes: 0
  });

  // KPI summaries from movements
  const [kpis, setKpis] = useState({
    saldo_liquido: 0,
    producao_total: 0,
    vales_pendentes_total: 0
  });

  // Modal barber states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [nome, setNome] = useState('');
  const [comissao, setComissao] = useState('40');
  const [telefone, setTelefone] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const barbersRes = await api.get('/barbers');
      setData(barbersRes.data);

      const movementsRes = await api.get('/movements');
      setKpis(movementsRes.data.resumo);
    } catch (err) {
      console.error('Erro ao buscar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBarber(null);
    setNome('');
    setComissao('40');
    setTelefone('');
    setFormError('');
    setFormSuccess('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (b) => {
    setEditingBarber(b);
    setNome(b.nome);
    setComissao(String(b.comissao_padrao));
    setTelefone(b.telefone || '');
    setFormError('');
    setFormSuccess('');
    setModalOpen(true);
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!nome) {
      setFormError('Nome do barbeiro é obrigatório.');
      return;
    }

    try {
      if (editingBarber) {
        // Editar
        await api.put(`/barbers/${editingBarber.id}`, {
          nome,
          comissao_padrao: parseInt(comissao),
          telefone: telefone || null
        });
        setFormSuccess('Barbeiro atualizado com sucesso!');
      } else {
        // Criar
        await api.post('/barbers', {
          nome,
          comissao_padrao: parseInt(comissao),
          telefone: telefone || null
        });
        setFormSuccess('Novo barbeiro cadastrado com sucesso!');
      }

      loadData();
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);

    } catch (err) {
      console.error('Erro ao salvar barbeiro:', err);
      setFormError(err.response?.data?.error || 'Erro ao salvar informações.');
    }
  };

  const handleDeleteBarber = async (id, name) => {
    if (confirm(`Deseja realmente desativar o barbeiro ${name}? Ele não poderá mais logar no sistema.`)) {
      try {
        await api.delete(`/barbers/${id}`);
        loadData();
      } catch (err) {
        console.error('Erro ao deletar barbeiro:', err);
      }
    }
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex min-h-screen bg-lk-dark text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Painel Geral de Gestão" />

        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#18181b] to-[#27272a] border border-lk-border rounded-3xl p-6 relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1 relative z-10">
              <span className="flex items-center gap-1.5 text-xs text-lk-yellow font-extrabold uppercase tracking-widest">
                <Sparkles size={12} />
                Sistema Sincronizado
              </span>
              <h2 className="text-2xl font-extrabold font-sans">Bem-vindo, Administrador</h2>
              <p className="text-xs text-lk-muted max-w-md">
                Aqui você acompanha em tempo real o fluxo financeiro da barbearia, gerencia a equipe de barbeiros e analisa o fechamento semanal.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-lk-yellow/5 blur-[80px] pointer-events-none"></div>
          </div>

          {/* Cards Financeiros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Saldo Líquido */}
            <div className="bg-lk-card border border-lk-border p-6 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-bold uppercase tracking-wider block">Faturamento da Semana</span>
                <h3 className="text-2xl font-black mt-1 text-emerald-400">
                  {formatBRL(kpis.saldo_liquido)}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <DollarSign size={24} />
              </div>
            </div>

            {/* Produção Total */}
            <div className="bg-lk-card border border-lk-border p-6 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-bold uppercase tracking-wider block">Produção Total</span>
                <h3 className="text-2xl font-black mt-1 text-lk-yellow">
                  {formatBRL(kpis.producao_total)}
                </h3>
              </div>
              <div className="p-3 bg-lk-yellow/10 rounded-xl text-lk-yellow">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Vales Pendentes */}
            <div className="bg-lk-card border border-lk-border p-6 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-lk-muted font-bold uppercase tracking-wider block">Vales Ativos</span>
                <h3 className="text-2xl font-black mt-1 text-amber-400">
                  {formatBRL(kpis.vales_pendentes_total)}
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <ShieldAlert size={24} />
              </div>
            </div>
          </div>

          {/* Seção Equipe */}
          <div className="bg-lk-card border border-lk-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-sans">Equipe de Barbeiros</h3>
                <p className="text-xs text-lk-muted">Desempenho e gestão do time</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="bg-lk-yellow text-lk-dark hover:bg-[#e0b810] px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-lk-yellow/10 transition-all duration-300"
              >
                <Plus size={16} />
                <span>Cadastrar Barbeiro</span>
              </button>
            </div>

            {/* Grid Barbeiros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                <div className="col-span-full py-8 text-center text-lk-muted">
                  Buscando informações da equipe...
                </div>
              ) : data.barbeiros.length === 0 ? (
                <div className="col-span-full py-8 text-center text-lk-muted">
                  Nenhum barbeiro ativo cadastrado.
                </div>
              ) : (
                data.barbeiros.map((b) => (
                  <div key={b.id} className="bg-lk-dark border border-lk-border rounded-2xl p-5 hover:border-lk-yellow/30 transition-all duration-300 relative group flex flex-col justify-between">
                    
                    {/* Header Card */}
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-lk-card border border-lk-border flex items-center justify-center font-bold text-lg text-lk-yellow font-sans uppercase">
                          {b.nome.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold font-sans text-white text-base">{b.nome}</h4>
                          <span className="text-xs text-lk-yellow font-medium bg-lk-yellow/5 px-2.5 py-0.5 rounded-full border border-lk-yellow/10">
                            COM: {b.comissao_padrao}%
                          </span>
                        </div>
                      </div>

                      {/* Detalhes */}
                      <div className="mt-5 space-y-2 border-t border-lk-border/50 pt-4 text-sm">
                        <div className="flex items-center justify-between text-lk-muted">
                          <span className="text-xs">Produção Semanal</span>
                          <span className="font-bold text-white">{formatBRL(b.producao_semanal)}</span>
                        </div>
                        {b.telefone && (
                          <div className="flex items-center justify-between text-lk-muted">
                            <span className="text-xs">Contato</span>
                            <span className="text-xs flex items-center gap-1"><Phone size={12} /> {b.telefone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2.5 mt-5 pt-3 border-t border-lk-border/30">
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="flex-1 py-2 rounded-xl bg-lk-card hover:bg-lk-border border border-lk-border text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-300"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBarber(b.id, b.nome)}
                        className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 text-red-400 transition-colors duration-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </main>
      </div>

      {/* Modal Criar/Editar Barbeiro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          <div className="w-full max-w-md bg-lk-card border border-lk-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-4">
            <h3 className="text-xl font-bold">
              {editingBarber ? 'Editar Barbeiro' : 'Cadastrar Novo Barbeiro'}
            </h3>

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

            <form onSubmit={handleSaveBarber} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Souza"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                />
              </div>

              {/* Comissão e Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={comissao}
                    onChange={(e) => setComissao(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                  />
                </div>
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
                  className="flex-1 bg-lk-yellow text-lk-dark font-bold py-3 rounded-xl hover:bg-[#e0b810] transition-colors animate-pulse"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardAdmin;
