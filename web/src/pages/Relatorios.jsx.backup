// pages/Relatorios.jsx — Área de relatórios e notas fiscais
import { useState, useEffect } from 'react';
import api from '../services/api';
import './Relatorios.css';

export default function Relatorios() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="rel-loading"><div className="spinner" /><p>Carregando relatórios...</p></div>;
  }

  return (
    <div className="relatorios">
      <div className="rel-header">
        <h1>Relatórios</h1>
        <p className="rel-subtitle">Gere relatórios, notas fiscais e documentos</p>
      </div>

      <div className="rel-grid">
        <div className="rel-card">
          <div className="rel-card-icon">📄</div>
          <h3>Relatório de Estoque</h3>
          <p>Lista completa de produtos, quantidades e valores em estoque.</p>
          <button className="btn-relatorio" disabled>Gerar relatório</button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">📋</div>
          <h3>Relatório de Movimentações</h3>
          <p>Histórico de entradas e saídas com período e filtros.</p>
          <button className="btn-relatorio" disabled>Gerar relatório</button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">🧾</div>
          <h3>Nota Fiscal de Entrada</h3>
          <p>Gerar NF de entrada para devoluções e compras.</p>
          <button className="btn-relatorio" disabled>Gerar NF</button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">🧾</div>
          <h3>Nota Fiscal de Saída</h3>
          <p>Gerar NF de saída para devoluções e vendas.</p>
          <button className="btn-relatorio" disabled>Gerar NF</button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">📈</div>
          <h3>Relatório de Vendas</h3>
          <p>Análise de vendas por período, forma de pagamento e operador.</p>
          <button className="btn-relatorio" disabled>Gerar relatório</button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">💰</div>
          <h3>Relatório Financeiro</h3>
          <p>Faturamento, custos, lucro bruto e margens por período.</p>
          <button className="btn-relatorio" disabled>Gerar relatório</button>
        </div>
      </div>

      <div className="rel-coming-soon">
        <p>🔒 <strong>Funcionalidade em desenvolvimento.</strong> Estes relatórios estarão disponíveis em breve na versão completa do sistema.</p>
      </div>
    </div>
  );
}
