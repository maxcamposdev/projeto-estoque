// pages/Dashboard.jsx — Página inicial com cards de resumo
import { useState, useEffect } from 'react';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
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
      .catch((err) => setError(err.response?.data?.message || "Erro ao conectar com o servidor"));
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
        <h1>{"Visão Geral"}</h1>
        {user && <p className="dashboard-user">👋 {user.name}</p>}
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <div className="card-icon">📦</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalProdutos ?? '...'}</span>
            <span className="card-label">{"Total de Produtos"}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-icon">📊</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalUnidades ?? '...'}</span>
            <span className="card-label">{"Unidades em Estoque"}</span>
          </div>
        </div>

        <div className="card card-warning">
          <div className="card-icon">⚠️</div>
          <div className="card-info">
            <span className="card-value">{resumo?.estoqueBaixo ?? '...'}</span>
            <span className="card-label">{"Estoque Baixo"}</span>
          </div>
          {resumo?.estoqueBaixo > 0 && (
            <span className="card-badge">{"Produtos com estoque abaixo do mínimo"}</span>
          )}
        </div>

        <div className="card">
          <div className="card-icon">🔄</div>
          <div className="card-info">
            <span className="card-value">{resumo?.totalMovimentacoes ?? '...'}</span>
            <span className="card-label">{"Movimentações"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}