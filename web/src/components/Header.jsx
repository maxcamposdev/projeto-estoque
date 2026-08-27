// components/Header.jsx — Cabeçalho fixo com botão de idioma
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleLang = () => {
    const newLang = i18n.language === 'pt-BR' ? 'en' : 'pt-BR';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Só mostra a navegação se estiver logado
  const token = localStorage.getItem('token');

  if (!token) {
    return (
      <header className="header">
        <div className="header-content">
          <span className="header-logo">📦 {t('app.title')}</span>
          <button className="btn-lang" onClick={toggleLang}>
            {i18n.language === 'pt-BR' ? '🇺🇸 EN' : '🇧🇷 PT-BR'}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-content">
        <span className="header-logo" onClick={() => navigate('/dashboard')}>
          📦 {t('app.title')}
        </span>

        <nav className="header-nav">
          <button className={`nav-btn ${isActive('/dashboard')}`} onClick={() => navigate('/dashboard')}>
            {t('nav.dashboard')}
          </button>
          <button className={`nav-btn ${isActive('/produtos')}`} onClick={() => navigate('/produtos')}>
            {t('nav.produtos')}
          </button>
          <button className={`nav-btn ${isActive('/movimentacoes')}`} onClick={() => navigate('/movimentacoes')}>
            {t('nav.movimentacoes')}
          </button>
        </nav>

        <div className="header-right">
          <button className="btn-lang" onClick={toggleLang}>
            {i18n.language === 'pt-BR' ? '🇺🇸 EN' : '🇧🇷 PT-BR'}
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            {t('nav.sair')}
          </button>
        </div>
      </div>
    </header>
  );
}