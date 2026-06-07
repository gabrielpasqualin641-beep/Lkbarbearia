import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Landmark, LogOut, Calendar, Menu, X } from 'lucide-react';
import api from '../services/api';
import logoLk from '../assets/logo-lk.png';

const Sidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Erro ao efetuar logout no backend:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Botão de Menu Hambúrguer (Mobile) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-lk-card border border-lk-border rounded-xl text-lk-yellow shadow-lg hover:bg-lk-border active:scale-95 transition-all flex items-center justify-center"
        style={{ width: '48px', height: '48px' }}
        aria-label="Abrir Menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop (Mobile) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="lg:hidden fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-30 transition-all duration-300"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`w-64 bg-lk-card border-r border-lk-border flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Logo */}
        <div className="p-4 border-b border-lk-border flex items-center justify-center bg-lk-dark/10">
          <div className="w-28 h-28 flex items-center justify-center">
            <img src={logoLk} alt="LK Barbearia" className="max-w-full max-h-full object-contain filter drop-shadow-[0_0_8px_rgba(253,208,23,0.1)]" />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {user.role === 'admin' && (
            <>
              <NavLink
                to="/admin"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-lk-yellow text-lk-dark shadow-lg shadow-lk-yellow/15 font-semibold'
                      : 'text-lk-muted hover:text-white hover:bg-lk-border/50'
                  }`
                }
              >
                <LayoutDashboard size={18} />
                <span>Painel Geral</span>
              </NavLink>
              <NavLink
                to="/movements"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-lk-yellow text-lk-dark shadow-lg shadow-lk-yellow/15 font-semibold'
                      : 'text-lk-muted hover:text-white hover:bg-lk-border/50'
                  }`
                }
              >
                <Receipt size={18} />
                <span>Fluxo de Caixa</span>
              </NavLink>
              <NavLink
                to="/vales"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                    isActive
                      ? 'bg-lk-yellow text-lk-dark shadow-lg shadow-lk-yellow/15 font-semibold'
                      : 'text-lk-muted hover:text-white hover:bg-lk-border/50'
                  }`
                }
              >
                <Landmark size={18} />
                <span>Comissões</span>
              </NavLink>
            </>
          )}
          {user.role === 'barber' && (
            <NavLink
              to="/barbeiro"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive
                    ? 'bg-lk-yellow text-lk-dark shadow-lg shadow-lk-yellow/15 font-semibold'
                    : 'text-lk-muted hover:text-white hover:bg-lk-border/50'
                }`
              }
            >
              <LayoutDashboard size={18} />
              <span>Minha Área</span>
            </NavLink>
          )}

          {/* Agenda - Acessível para ambos */}
          <NavLink
            to="/agenda"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                isActive
                  ? 'bg-lk-yellow text-lk-dark shadow-lg shadow-lk-yellow/15 font-semibold'
                  : 'text-lk-muted hover:text-white hover:bg-lk-border/50'
              }`
            }
          >
            <Calendar size={18} />
            <span>Agenda</span>
          </NavLink>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-lk-border bg-lk-dark/20 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-lk-border border border-lk-yellow/30 flex items-center justify-center font-bold text-lk-yellow font-sans uppercase">
              {user.nome ? user.nome.charAt(0) : 'U'}
            </div>
            <div className="truncate">
              <h4 className="font-semibold text-sm truncate">{user.nome || 'Usuário'}</h4>
              <span className="text-[11px] text-lk-muted capitalize">{user.role === 'admin' ? 'Administrador' : 'Barbeiro'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-300 font-medium text-sm"
            style={{ minHeight: '40px' }}
          >
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
