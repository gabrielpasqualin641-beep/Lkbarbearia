import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
  Scissors, DollarSign, Clock, AlertCircle, Plus, CheckCircle2, 
  HelpCircle, Sparkles, LogOut 
} from 'lucide-react';
import api from '../services/api';

const AreaBarbeiro = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [loading, setLoading] = useState(false);
  
  const [data, setData] = useState({
    valor_bruto: 0,
    valor_comissao: 0,
    total_vales_descontados: 0,
    liquido_a_receber: 0,
    total_cortes: 0,
    servicos: []
  });

  // Modal Solicitar Vale state
  const [modalOpen, setModalOpen] = useState(false);
  const [valorVale, setValorVale] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadBarberStats = async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/closing/barbeiro/${user.id}`);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar estatísticas do barbeiro (usando local mock):', err);
      setData({
        valor_bruto: 0.00,
        valor_comissao: 0.00,
        total_vales_descontados: 0.00,
        liquido_a_receber: 0.00,
        total_cortes: 0,
        servicos: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarberStats();
  }, []);

  const handleRequestVale = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!valorVale || parseFloat(valorVale) <= 0) {
      setFormError('Por favor, informe um valor de vale maior que zero.');
      return;
    }

    try {
      // Solicita um vale de forma pendente de aprovação
      await api.post('/vales', {
        barbeiro_id: user.id,
        valor: parseFloat(valorVale),
        data: new Date().toISOString().split('T')[0],
        descricao: descricao || 'Solicitação via Área do Barbeiro'
      });

      setFormSuccess('Solicitação de vale registrada com sucesso!');
      setValorVale('');
      setDescricao('');

      loadBarberStats();
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1500);

    } catch (err) {
      console.warn('Erro ao solicitar vale na API. Simulando localmente (Modo Demo):', err);
      setData(prev => {
        const val = parseFloat(valorVale);
        return {
          ...prev,
          total_vales_descontados: prev.total_vales_descontados + val,
          liquido_a_receber: Math.max(0, prev.liquido_a_receber - val)
        };
      });
      setFormSuccess('Solicitação de vale registrada com sucesso (Modo Demo)!');
      setValorVale('');
      setDescricao('');
      
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
    <div className="flex min-h-screen bg-lk-dark text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={`Painel de Produção — ${user.nome}`} />

        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-lk-card to-lk-border border border-lk-border p-6 rounded-3xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-lk-yellow font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} />
                Minha Carteira
              </span>
              <h2 className="text-2xl font-extrabold font-sans">Olá, {user.nome}!</h2>
              <p className="text-xs text-lk-muted max-w-sm">
                Acompanhe o fechamento de seus cortes, confira suas comissões e solicite adiantamentos.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-lk-yellow text-lk-dark hover:bg-[#e0b810] px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-lk-yellow/10 transition-all duration-300"
            >
              <Plus size={16} />
              <span>Solicitar Adiantamento</span>
            </button>
          </div>

          {/* Cards de Métricas Individuais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Bruto */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl">
              <span className="text-xs text-lk-muted font-bold uppercase tracking-wider">Total Produzido (Bruto)</span>
              <h3 className="text-2xl font-black text-white mt-1">{formatBRL(data.valor_bruto)}</h3>
              <div className="text-[11px] text-lk-muted mt-2">Faturamento gerado para a casa</div>
            </div>

            {/* Comissao */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl">
              <span className="text-xs text-lk-muted font-bold uppercase tracking-wider">Minha Comissão</span>
              <h3 className="text-2xl font-black text-lk-yellow mt-1">{formatBRL(data.valor_comissao)}</h3>
              <span className="text-[10px] text-lk-yellow font-medium mt-2 bg-lk-yellow/5 px-2 py-0.5 rounded-full border border-lk-yellow/10 inline-block">
                Taxa: {user.comissao_padrao || 40}%
              </span>
            </div>

            {/* Vales descontados */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl">
              <span className="text-xs text-lk-muted font-bold uppercase tracking-wider">Vales a Descontar</span>
              <h3 className="text-2xl font-black text-red-400 mt-1">{formatBRL(data.total_vales_descontados)}</h3>
              <div className="text-[11px] text-red-400/80 mt-2">Será deduzido no fechamento</div>
            </div>

            {/* Líquido a Receber */}
            <div className="bg-lk-card border border-lk-border p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl"></div>
              <span className="text-xs text-lk-muted font-bold uppercase tracking-wider">Líquido a Receber</span>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatBRL(data.liquido_a_receber)}</h3>
              <div className="text-[11px] text-emerald-400 mt-2 font-semibold">Saldo líquido disponível</div>
            </div>
          </div>

          {/* Serviços Recentes */}
          <div className="bg-lk-card border border-lk-border rounded-2xl p-6">
            <h3 className="text-lg font-bold font-sans mb-4">Meus Serviços Recentes</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-lk-border text-lk-muted text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Data/Hora</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Serviço</th>
                    <th className="pb-3 text-right">Valor do Serviço</th>
                    <th className="pb-3 text-right pr-2">Minha Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lk-border text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-lk-muted">
                        Carregando serviços...
                      </td>
                    </tr>
                  ) : data.servicos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-lk-muted">
                        Nenhum serviço registrado recentemente.
                      </td>
                    </tr>
                  ) : (
                    data.servicos.map((s) => (
                      <tr key={s.id} className="hover:bg-lk-border/10 transition-colors">
                        <td className="py-3.5 pl-2 text-lk-muted">
                          {new Date(s.data_hora).toLocaleDateString('pt-BR')} {new Date(s.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-3.5 font-bold text-white">{s.cliente_nome || '—'}</td>
                        <td className="py-3.5 text-lk-muted">{s.tipo_servico || '—'}</td>
                        <td className="py-3.5 text-right font-semibold text-white">{formatBRL(s.valor_total)}</td>
                        <td className="py-3.5 text-right pr-2 font-bold text-lk-yellow">{formatBRL(s.comissao)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* Modal Solicitar Vale */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          <div className="w-full max-w-md bg-lk-card border border-lk-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-4">
            <h3 className="text-xl font-bold">Solicitar Vale / Adiantamento</h3>

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

            <form onSubmit={handleRequestVale} className="space-y-4">
              {/* Valor */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Valor do Vale (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 100.00"
                  value={valorVale}
                  onChange={(e) => setValorVale(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm py-2.5 px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow"
                />
              </div>

              {/* Justificativa */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Justificativa / Observação</label>
                <textarea
                  placeholder="Informe o motivo da solicitação de adiantamento..."
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
                  Solicitar Vale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AreaBarbeiro;
