import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { 
  Calendar, Clock, Plus, Check, X, Phone, User, 
  Scissors, DollarSign, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight 
} from 'lucide-react';
import api from '../services/api';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

const COMMON_SERVICES = [
  { nome: 'Corte Degradê', valor: 45.00 },
  { nome: 'Barba Express', valor: 35.00 },
  { nome: 'Combo Cabelo + Barba', valor: 80.00 },
  { nome: 'Platinado / Nevou', valor: 120.00 },
  { nome: 'Corte + Sobrancelha', valor: 55.00 },
  { nome: 'Sobrancelha', valor: 15.00 },
  { nome: 'Outro / Personalizado', valor: '' }
];

const Agenda = () => {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos', '1', '2'

  // Modal Novo Agendamento state
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [barbeiroId, setBarbeiroId] = useState('');
  const [servicoSelecionado, setServicoSelecionado] = useState(COMMON_SERVICES[0].nome);
  const [servicoCustomizado, setServicoCustomizado] = useState('');
  const [valor, setValor] = useState(String(COMMON_SERVICES[0].valor));
  const [dataAgendamento, setDataAgendamento] = useState(selectedDate);
  const [horarioAgendamento, setHorarioAgendamento] = useState('09:00');
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Carregar barbeiros no mount
  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const res = await api.get('/auth/barbers');
        // Filtra para remover qualquer admin se houver, mas a princípio Lukinhas (1) e Neguin (2) são os principais
        const filteredBarbers = res.data.filter(b => b.id === 1 || b.id === 2 || !b.nome.toLowerCase().includes('admin'));
        setBarbeiros(filteredBarbers);
      } catch (err) {
        console.error('Erro ao buscar barbeiros:', err);
        // Fallback local se a API falhar
        setBarbeiros([
          { id: 1, nome: 'Lukinhas' },
          { id: 2, nome: 'Neguin do corte' }
        ]);
      }
    };
    fetchBarbers();
  }, []);

  // Buscar agendamentos sempre que a data mudar
  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments', {
        params: { data: selectedDate }
      });
      setAppointments(res.data);
    } catch (err) {
      console.error('Erro ao carregar agendamentos (usando local mock):', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    setDataAgendamento(selectedDate);
  }, [selectedDate]);

  // Atualiza valor do serviço quando o serviço pré-definido muda
  const handleServiceChange = (serviceName) => {
    setServicoSelecionado(serviceName);
    const service = COMMON_SERVICES.find(s => s.nome === serviceName);
    if (service && serviceName !== 'Outro / Personalizado') {
      setValor(String(service.valor));
    } else {
      setValor('');
    }
  };

  // Abrir modal com pré-preenchimento
  const handleOpenNewAppointment = (barberId = '', timeSlot = '') => {
    setClienteNome('');
    setClienteTelefone('');
    setBarbeiroId(barberId || (barbeiros[0]?.id ? String(barbeiros[0].id) : ''));
    setServicoSelecionado(COMMON_SERVICES[0].nome);
    setServicoCustomizado('');
    setValor(String(COMMON_SERVICES[0].valor));
    setDataAgendamento(selectedDate);
    setHorarioAgendamento(timeSlot || '09:00');
    setFormError('');
    setFormSuccess('');
    setModalOpen(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const nomeServico = servicoSelecionado === 'Outro / Personalizado' ? servicoCustomizado : servicoSelecionado;

    if (!clienteNome || !barbeiroId || !nomeServico || !valor || !dataAgendamento || !horarioAgendamento) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await api.post('/appointments', {
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone || null,
        barbeiro_id: parseInt(barbeiroId),
        tipo_servico: nomeServico,
        valor: parseFloat(valor),
        data: dataAgendamento,
        horario: horarioAgendamento
      });

      setFormSuccess('Agendamento realizado com sucesso!');
      loadAppointments();
      
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1200);
    } catch (err) {
      console.warn('Erro ao criar agendamento na API. Simulando localmente (Modo Demo):', err);
      const newApp = {
        id: Date.now(),
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone || null,
        barbeiro_id: parseInt(barbeiroId),
        tipo_servico: nomeServico,
        valor: parseFloat(valor),
        data: dataAgendamento,
        horario: horarioAgendamento,
        status: 'pendente'
      };
      setAppointments(prev => [...prev, newApp]);
      setFormSuccess('Agendamento realizado com sucesso (Modo Demo)!');
      
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess('');
      }, 1200);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const actionLabel = status === 'concluido' ? 'concluir' : 'cancelar';
    const confirmMsg = status === 'concluido' 
      ? 'Deseja concluir este serviço? Isso irá gerar um faturamento de 100% no fluxo de caixa e comissão de 50% para o barbeiro.'
      : 'Deseja realmente cancelar este agendamento?';

    if (window.confirm(confirmMsg)) {
      try {
        await api.patch(`/appointments/${id}/status`, { status });
        loadAppointments();
      } catch (err) {
        console.warn(`Erro ao ${actionLabel} agendamento na API. Simulando localmente (Modo Demo):`, err);
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
      }
    }
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filtra agendamentos por barbeiro e horário
  const getAppointment = (barberId, timeSlot) => {
    return appointments.find(
      app => app.barbeiro_id === barberId && app.horario === timeSlot
    );
  };

  return (
    <div className="flex min-h-screen bg-lk-dark text-white font-sans overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title="Agenda de Horários" />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          
          {/* Barra de Ações: Data, Abas e Botão Novo */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-lk-card border border-lk-border p-4 rounded-2xl">
            
            {/* Filtro de Data */}
            <div className="flex items-center gap-3 bg-lk-dark border border-lk-border px-4 rounded-xl w-full lg:w-auto h-12">
              <Calendar className="text-lk-yellow flex-shrink-0" size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none font-semibold text-sm w-full cursor-pointer h-full"
              />
            </div>

            {/* Abas dos Barbeiros */}
            <div className="flex bg-lk-dark p-1 rounded-xl border border-lk-border w-full lg:w-auto overflow-x-auto h-12 items-center">
              <button
                onClick={() => setActiveTab('todos')}
                className={`h-10 px-5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'todos' 
                    ? 'bg-lk-yellow text-lk-dark shadow-md' 
                    : 'text-lk-muted hover:text-white'
                }`}
                style={{ minHeight: '40px' }}
              >
                Visão Geral
              </button>
              {barbeiros.map(b => (
                <button
                  key={b.id}
                  onClick={() => setActiveTab(String(b.id))}
                  className={`h-10 px-5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center justify-center ${
                    activeTab === String(b.id) 
                      ? 'bg-lk-yellow text-lk-dark shadow-md' 
                      : 'text-lk-muted hover:text-white'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  {b.nome}
                </button>
              ))}
            </div>

            {/* Botão Novo Agendamento */}
            <button
              onClick={() => handleOpenNewAppointment()}
              className="bg-lk-yellow text-lk-dark hover:bg-[#e0b810] px-5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-lk-yellow/10 transition-all duration-300 w-full lg:w-auto justify-center h-12"
            >
              <Plus size={16} />
              <span>Novo Agendamento</span>
            </button>
          </div>

          {/* Grid Principal da Timeline */}
          {loading ? (
            <div className="bg-lk-card border border-lk-border rounded-2xl p-12 text-center text-lk-muted">
              Carregando horários da agenda...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Visão Geral: Exibe colunas lado a lado */}
              {activeTab === 'todos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {barbeiros.map(b => (
                    <div key={b.id} className="bg-lk-card border border-lk-border rounded-2xl p-6 flex flex-col space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-lk-border/50">
                        <h3 className="font-black text-lg text-lk-yellow">{b.nome}</h3>
                        <span className="text-xs text-lk-muted font-semibold">
                          {appointments.filter(app => app.barbeiro_id === b.id).length} agendamento(s) hoje
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {TIME_SLOTS.map(slot => {
                          const app = getAppointment(b.id, slot);
                          return (
                            <div key={slot} className="flex gap-4 items-center">
                              {/* Horário */}
                              <div className="w-12 text-right">
                                <span className="text-xs font-mono font-bold text-lk-muted">{slot}</span>
                              </div>

                              {/* Card ou Livre */}
                              <div className="flex-1">
                                {app ? (
                                  <AppointmentCard app={app} onComplete={handleUpdateStatus} />
                                ) : (
                                  <EmptySlot onClick={() => handleOpenNewAppointment(String(b.id), slot)} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Visão de um Barbeiro Único */}
              {activeTab !== 'todos' && (
                <div className="bg-lk-card border border-lk-border rounded-2xl p-6 max-w-3xl mx-auto space-y-4">
                  {(() => {
                    const selectedBarber = barbeiros.find(b => String(b.id) === activeTab);
                    if (!selectedBarber) return null;
                    return (
                      <>
                        <div className="flex items-center justify-between pb-3 border-b border-lk-border/50">
                          <h3 className="font-black text-lg text-lk-yellow">Agenda de {selectedBarber.nome}</h3>
                          <span className="text-xs text-lk-muted font-semibold">
                            {appointments.filter(app => app.barbeiro_id === selectedBarber.id).length} agendamento(s) hoje
                          </span>
                        </div>

                        <div className="space-y-3">
                          {TIME_SLOTS.map(slot => {
                            const app = getAppointment(selectedBarber.id, slot);
                            return (
                              <div key={slot} className="flex gap-4 items-center">
                                {/* Horário */}
                                <div className="w-12 text-right">
                                  <span className="text-xs font-mono font-bold text-lk-muted">{slot}</span>
                                </div>

                                {/* Card ou Livre */}
                                <div className="flex-1">
                                  {app ? (
                                    <AppointmentCard app={app} onComplete={handleUpdateStatus} />
                                  ) : (
                                    <EmptySlot onClick={() => handleOpenNewAppointment(activeTab, slot)} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Modal Novo Agendamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#09090b]/85 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>

          <div className="w-full max-w-md bg-lk-card border border-lk-border rounded-2xl p-6 shadow-2xl relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="text-lk-yellow" size={20} />
                <span>Agendar Horário</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-lk-muted hover:text-white p-1 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              {/* Nome do Cliente */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Nome do Cliente</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-lk-muted pointer-events-none">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João da Silva"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm pl-11 pr-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 shadow-inner"
                  />
                </div>
              </div>

              {/* Telefone do Cliente */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Telefone (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-lk-muted pointer-events-none">
                    <Phone size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-9999"
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm pl-11 pr-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 shadow-inner"
                  />
                </div>
              </div>

              {/* Barbeiro */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Profissional / Barbeiro</label>
                <select
                  required
                  value={barbeiroId}
                  onChange={(e) => setBarbeiroId(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 shadow-inner"
                >
                  <option value="">Selecione...</option>
                  {barbeiros.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Serviço */}
              <div>
                <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Serviço</label>
                <select
                  value={servicoSelecionado}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full bg-lk-dark border border-lk-border text-white text-sm px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 mb-2 shadow-inner"
                >
                  {COMMON_SERVICES.map(s => (
                    <option key={s.nome} value={s.nome}>{s.nome} {s.valor ? `(${formatBRL(s.valor)})` : ''}</option>
                  ))}
                </select>

                {servicoSelecionado === 'Outro / Personalizado' && (
                  <input
                    type="text"
                    required
                    placeholder="Especifique o serviço..."
                    value={servicoCustomizado}
                    onChange={(e) => setServicoCustomizado(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 shadow-inner"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Valor */}
                <div className="col-span-1">
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm px-3.5 rounded-xl focus:outline-none focus:border-lk-yellow h-12 shadow-inner"
                  />
                </div>

                {/* Data */}
                <div className="col-span-1">
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm px-2 rounded-xl focus:outline-none focus:border-lk-yellow h-12 text-xs shadow-inner"
                  />
                </div>

                {/* Horário */}
                <div className="col-span-1">
                  <label className="block text-xs text-lk-muted font-bold uppercase tracking-wider mb-1">Horário</label>
                  <select
                    required
                    value={horarioAgendamento}
                    onChange={(e) => setHorarioAgendamento(e.target.value)}
                    className="w-full bg-lk-dark border border-lk-border text-white text-sm px-2 rounded-xl focus:outline-none focus:border-lk-yellow h-12 text-xs shadow-inner"
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-lk-border text-lk-muted hover:text-white transition-colors h-12 flex items-center justify-center font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-lk-yellow text-lk-dark font-black rounded-xl hover:bg-[#e0b810] transition-colors shadow-lg shadow-lk-yellow/10 h-12 flex items-center justify-center"
                >
                  Salvar Horário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Componente para Card de Agendamento
const AppointmentCard = ({ app, onComplete }) => {
  const getStatusStyle = () => {
    switch (app.status) {
      case 'concluido':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'cancelado':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const formatBRL = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className={`border p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all duration-300 ${getStatusStyle()}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white">{app.cliente_nome}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-current">
            {app.status}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-lk-muted">
          <span className="flex items-center gap-1">
            <Scissors size={12} className="text-lk-yellow" /> {app.tipo_servico}
          </span>
          <span className="flex items-center gap-1 font-bold text-white/95">
            <DollarSign size={12} className="text-lk-yellow" /> {formatBRL(app.valor)}
          </span>
          {app.cliente_telefone && (
            <span className="flex items-center gap-1">
              <Phone size={12} /> {app.cliente_telefone}
            </span>
          )}
        </div>
      </div>

      {app.status === 'pendente' && (
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => onComplete(app.id, 'concluido')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-lk-dark font-extrabold text-xs active:scale-95 transition-all h-12 md:h-10"
          >
            <Check size={14} />
            <span>Concluir</span>
          </button>
          <button
            onClick={() => onComplete(app.id, 'cancelado')}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs active:scale-95 transition-all h-12 md:h-10"
          >
            <X size={14} />
            <span>Cancelar</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Componente para Horário Livre
const EmptySlot = ({ onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="border border-dashed border-lk-border hover:border-lk-yellow/40 bg-lk-dark/10 hover:bg-lk-yellow/5 rounded-xl px-4 flex justify-between items-center text-lk-muted hover:text-white transition-all cursor-pointer group min-h-[48px] active:scale-[0.99]"
    >
      <span className="text-xs font-semibold tracking-wide">Horário Disponível</span>
      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-lk-yellow font-bold transition-all">
        Reservar <ChevronRight size={14} />
      </span>
    </div>
  );
};

export default Agenda;
