import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const showNav = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    setMenuOpen(false);
  };

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/produtos', label: 'Produtos' },
    { path: '/movimentacoes', label: 'Movimentacoes' },
    { path: '/pedidos-compra', label: 'Pedidos de Compra' },
    { path: '/fornecedores', label: 'Fornecedores' },
    { path: '/transferencias', label: 'Transferencias' },
    { path: '/devolucoes', label: 'Devolucoes' },
  ];

  return (
    <header className="header">
      <div className="header-content">
        <span className="header-logo" onClick={() => handleNav(showNav ? '/dashboard' : '/')}>
          <span className="logo-badge">SUALOGO</span>
          <span className="logo-text">Sistema de Gestao</span>
        </span>
        <nav className="header-nav">
          {navItems.map(item => (
            <button key={item.path} className={'nav-btn ' + isActive(item.path)} onClick={() => handleNav(item.path)}>{item.label}</button>
          ))}
        </nav>
        <div className="header-right">
          <button className="btn-lang" onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>{theme === 'dark' ? '\u2600' : '\u263e'}</button>
          <button className="btn-logout" onClick={handleLogout}>Sair</button>
          <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? '\u2715' : '\u2630'}</button>
        </div>
      </div>
      {menuOpen && (
        <>
          <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)} />
          <div className="mobile-drawer">
            <nav className="mobile-drawer-nav">
              {isCaixa ? (
                <>
                  <button className="mobile-drawer-link" onClick={() => handleNav('/produtos')}>Produtos</button>
                  <button className="mobile-drawer-link" onClick={() => handleNav('/consulta-estoque')}>Consulta Estoque</button>
                </>
              ) : (
                navItems.map(item => (
                  <button key={item.path} className={'mobile-drawer-link ' + isActive(item.path)} onClick={() => handleNav(item.path)}>{item.label}</button>
                ))
              )}
            </nav>
            <div className="mobile-drawer-actions">
              <button className="mobile-drawer-btn theme" onClick={toggleTheme}>{theme === 'dark' ? '\u2600 Tema Claro' : '\u263e Tema Escuro'}</button>
              <button className="mobile-drawer-btn caixa" onClick={() => handleNav('/caixa')} disabled={!showNav}>Caixa</button>
              <button className="mobile-drawer-btn sair" onClick={handleLogout} disabled={!showNav}>Sair</button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
