// pages/Dashboard.jsx — Página inicial com cards de resumo
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useTranslation();
  const [resumo, setResumo] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    api.get('/movimentacoes/resumo')
      .then(({ data }) => setResumo(data.resumo))
      .catch((err) => setError(err.response?.data?.message || t('errors.serverError')));
  }, [t]);

  if (error) {
    return (
      <div className="dashboard-error">
        <p>❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{t('dashboard.recentMovements')}</h1>
        {user && <p className="dashboard-user">👋 {user.name}</p>}
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <div className="card-icon">📦</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalProdutos ?? '...'}</span>
            <span className="card-label">{t('dashboard.totalProducts')}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📊</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalUnidades ?? '...'}</span>
            <span className="card-label">{t('dashboard.totalUnits')}</span>
          </div>
        </div>

        <div className="card card-warning">
          <div className="card-icon">⚠️</div>
          <div className="card-info">
            <span className="card-value">{resumo?.estoqueBaixo ?? '...'}</span>
            <span className="card-label">{t('dashboard.lowStock')}</span>
          </div>
          {resumo?.estoqueBaixo > 0 && (
            <span className="card-badge">{t('dashboard.lowStockAlert')}</span>
          )}
        </div>

        <div className="card">
          <div className="card-icon">🔄</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalMovimentacoes ?? '...'}</span>
            <span className="card-label">{t('dashboard.totalMovements')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}