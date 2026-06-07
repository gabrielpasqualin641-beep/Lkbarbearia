import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../services/api';
import logoLk from '../assets/logo-lk.png';

const LoginBarbeiro = () => {
  const navigate = useNavigate();
  const [barbeiros, setBarbeiros] = useState([]);
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const response = await api.get('/auth/barbers');
        setBarbeiros(response.data);
      } catch (err) {
        console.error('Erro ao listar barbeiros:', err);
        setError('Não foi possível carregar a lista de barbeiros. Verifique a conexão com a API.');
      }
    };
    fetchBarbers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBarberId || !senha) {
      setError('Por favor, selecione seu nome e digite sua senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        barbeiro_id: parseInt(selectedBarberId),
        senha,
      });

      const { token, barbeiro } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(barbeiro));

      // Redireciona com base na role do usuário
      if (barbeiro.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/barbeiro');
      }
    } catch (err) {
      console.error('Erro ao efetuar login:', err);
      setError(
        err.response?.data?.error || 
        'Erro ao conectar com o servidor. Verifique se o backend está ativo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden px-4">
      {/* Background Glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-lk-yellow/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-lk-yellow/5 blur-[120px] pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-md glass-premium rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-44 h-44 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img src={logoLk} alt="LK Barbearia" className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_15px_rgba(253,208,23,0.15)]" />
          </div>
          <p className="text-lk-muted text-xs uppercase tracking-widest font-semibold mt-1">
            Área do Profissional
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Select Barber */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-lk-muted mb-2 ml-1">
              Selecione seu Nome
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-lk-muted pointer-events-none">
                <User size={18} />
              </span>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                disabled={loading}
                className="w-full bg-lk-dark border border-lk-border hover:border-lk-yellow/50 focus:border-lk-yellow text-white rounded-xl py-3.5 pl-11 pr-4 appearance-none focus:outline-none transition-all duration-300 text-sm shadow-inner"
              >
                <option value="">Selecione...</option>
                {barbeiros.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.nome}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-lk-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-lk-muted mb-2 ml-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-lk-muted pointer-events-none">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                className="w-full bg-lk-dark border border-lk-border hover:border-lk-yellow/50 focus:border-lk-yellow text-white rounded-xl py-3.5 pl-11 pr-12 focus:outline-none transition-all duration-300 text-sm shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-lk-muted hover:text-white transition-colors duration-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lk-yellow text-lk-dark font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-lk-yellow/10 hover:shadow-lk-yellow/25 hover:bg-[#e0b810] active:scale-[0.98] flex items-center justify-center gap-2 mt-4 text-sm uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-lk-dark" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginBarbeiro;
