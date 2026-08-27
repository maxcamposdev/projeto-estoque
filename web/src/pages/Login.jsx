// pages/Login.jsx — Tela de login + botão "Entrar como visitante (demo)"
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: 'maxcamposdev@gmail.com',
        password: '123456',
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">📦</span>
          <h1>{t('app.title')}</h1>
          <p className="login-subtitle">{t('app.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('app.loading') : t('auth.loginButton')}
          </button>
        </form>

        <div className="login-divider">
          <span>ou</span>
        </div>

        <button
          className="btn-demo"
          onClick={handleDemoAccess}
          disabled={loading}
        >
          🎮 {t('auth.enterAsVisitor')}
        </button>

        <div className="demo-badge">
          {t('auth.demoTitle')} — {t('auth.demoDescription')}
        </div>
      </div>
    </div>
  );
}