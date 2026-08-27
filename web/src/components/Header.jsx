// components/Header.jsx — Cabeçalho com logo, menu e botão de tema
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((p) => (p === 'dark' ? 'light' : 'dark'));
  const isActive = (path) => (location.pathname === path ? 'active' : '');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const token = localStorage.getItem('token');
  const isLoginPage = location.pathname === '/';
  const showNav = token && !isLoginPage;

  return (
    <header className="header">
      <div className="header-content">
        <span className="header-logo" onClick={() => navigate(showNav ? '/dashboard' : '/')}>
          <Logo size={36} /> Sistema de Gestão de Estoque
        </span>

        {showNav && (
          <nav className="header-nav">
            <button className={`nav-btn ${isActive('/dashboard')}`} onClick={() => navigate('/dashboard')}>Dashboard</button>
            <button className={`nav-btn ${isActive('/produtos')}`} onClick={() => navigate('/produtos')}>Produtos</button>
            <button className={`nav-btn ${isActive('/movimentacoes')}`} onClick={() => navigate('/movimentacoes')}>Movimentações</button>
          </nav>
        )}

        <div className="header-right">
          <button className="btn-lang" onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {showNav && (
            <button className="btn-logout" onClick={handleLogout}>Sair</button>
          )}
        </div>
      </div>
    </header>
  );
}
