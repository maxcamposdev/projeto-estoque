// pages/Dashboard.jsx — Página inicial com cards de resumo
import { useState, useEffect } from 'react';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    api.get('/movimentacoes/resumo')
      .then(({ data }) => {
        if (cancelado) return;
        setResumo(data.resumo);
        setError('');
      })
      .catch((err) => {
        if (cancelado) return;
        const status = err.response?.status;
        if (status === 401) {
          // Token expirou → volta pro login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        } else {
          setError(err.response?.data?.message || 'Erro ao conectar com o servidor');
        }
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Carregando painel...</p>
      </div>
    );
  }

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
        <div>
          <h1>Visão Geral</h1>
          <p className="dashboard-subtitle">Resumo do estoque da empresa</p>
        </div>
        {user && <p className="dashboard-user">Olá, <strong>{user.name}</strong> 👋</p>}
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <div className="card-icon">📦</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalProdutos ?? '0'}</span>
            <span className="card-label">Total de Produtos</span>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📊</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalUnidades ?? '0'}</span>
            <span className="card-label">Unidades em Estoque</span>
          </div>
        </div>

        <div className={`card ${(resumo?.estoqueBaixo ?? 0) > 0 ? 'card-warning' : ''}`}>
          <div className="card-icon">⚠️</div>
          <div className="card-info">
            <span className="card-value">{resumo?.estoqueBaixo ?? '0'}</span>
            <span className="card-label">Estoque Baixo</span>
          </div>
    {(resumo?.estoqueBaixo ?? 0) > 0 && (
      <span className="card-badge">Produtos abaixo do mínimo</span>
    )}
        </div>

        <div className="card">
          <div className="card-icon">🔄</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalMovimentacoes ?? '0'}</span>
            <span className="card-label">Movimentações</span>
          </div>
        </div>
      </div>
    </div>
  );
}
