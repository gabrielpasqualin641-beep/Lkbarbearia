import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginBarbeiro from './pages/LoginBarbeiro';
import DashboardAdmin from './pages/DashboardAdmin';
import Movimentacoes from './pages/Movimentacoes';
import Vales from './pages/Vales';
import AreaBarbeiro from './pages/AreaBarbeiro';
import Agenda from './pages/Agenda';
import ProtectionRoute from './components/ProtectionRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginBarbeiro />} />
        
        {/* Rotas Administrativas Protegidas */}
        <Route 
          path="/admin" 
          element={
            <ProtectionRoute allowedRoles={['admin']}>
              <DashboardAdmin />
            </ProtectionRoute>
          } 
        />
        <Route 
          path="/movements" 
          element={
            <ProtectionRoute allowedRoles={['admin']}>
              <Movimentacoes />
            </ProtectionRoute>
          } 
        />
        <Route 
          path="/vales" 
          element={
            <ProtectionRoute allowedRoles={['admin']}>
              <Vales />
            </ProtectionRoute>
          } 
        />
        
        {/* Rota do Barbeiro Protegida */}
        <Route 
          path="/barbeiro" 
          element={
            <ProtectionRoute allowedRoles={['barber', 'admin']}>
              <AreaBarbeiro />
            </ProtectionRoute>
          } 
        />

        {/* Rota da Agenda Protegida */}
        <Route 
          path="/agenda" 
          element={
            <ProtectionRoute allowedRoles={['admin', 'barber']}>
              <Agenda />
            </ProtectionRoute>
          } 
        />

        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
