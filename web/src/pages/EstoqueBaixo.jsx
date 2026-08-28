// pages/EstoqueBaixo.jsx — Alerta de produtos com estoque abaixo do mínimo
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './EstoqueBaixo.css';

export default function EstoqueBaixo() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/produtos', { params: { baixo: 'true' } })
      .then(({ data }) => setProdutos(data.produtos || []))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        } else {
          setError(err.response?.data?.message || 'Erro ao carregar');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="estoque-baixo-loading"><div className="spinner" /><p>Carregando alertas...</p></div>;
  }

  return (
    <div className="estoque-baixo">
      <div className="eb-header">
        <div>
          <h1>⚠️ Estoque Baixo</h1>
          <p className="eb-subtitle">Produtos abaixo do nível mínimo — ação urgente necessária</p>
        </div>
        <button className="btn-voltar" onClick={() => navigate('/dashboard')}>← Voltar</button>
      </div>

      {error && <p className="msg-error">{error}</p>}

      {produtos.length === 0 ? (
        <div className="empty-state">
          <h3>✅ Nenhum produto com estoque baixo</h3>
          <p>Todos os produtos estão acima do nível mínimo.</p>
        </div>
      ) : (
        <>
          <p className="eb-count">
            <strong>{produtos.length}</strong> produto(s) abaixo do mínimo
          </p>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Déficit</th>
                  <th>Preço</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => {
                  const deficit = Math.max(0, Number(p.min_quantity) - Number(p.quantity));
                  return (
                    <tr key={p.id} className="row-baixo">
                      <td className="cell-nome">
                        {p.name}
                        <span className="badge-baixo">⚠ Estoque baixo</span>
                      </td>
                      <td className="cell-sku">{p.sku}</td>
                      <td className="cell-qtd">{Number(p.quantity)}</td>
                      <td className="cell-qtd">{Number(p.min_quantity)}</td>
                      <td className="cell-deficit">{deficit > 0 ? deficit : '—'}</td>
                      <td>R$ {Number(p.price).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="eb-actions">
            <button className="btn-primary" onClick={() => navigate('/produtos?baixo=true')}>
              Ver todos na página de Produtos
            </button>
          </div>
        </>
      )}
    </div>
  );
}
