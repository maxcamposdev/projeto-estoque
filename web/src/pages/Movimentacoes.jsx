// pages/Movimentacoes.jsx — Entrada/saída de estoque + histórico (sem i18n)
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Movimentacoes.css';

export default function Movimentacoes() {
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroProduto, setFiltroProduto] = useState('');

  const [form, setForm] = useState({
    product_id: '', type: 'IN', quantity: 1, note: ''
  });

  const carregarDados = useCallback(async () => {
    try {
      const { data } = await api.get('/produtos');
      const prods = data.produtos || [];
      setProdutos(prods);

      const recentes = [];
      const limite = filtroProduto ? prods.filter(p => p.id === Number(filtroProduto)) : prods.slice(0, 20);
      for (const p of limite) {
        try {
          const { data: hist } = await api.get(`/movimentacoes/produto/${p.id}`);
          for (const m of hist.movimentacoes) {
            const movComData = new Date(m.created_at);
            const trintaDiasAtras = Date.now() - 30 * 86400000;
            if (movComData.getTime() > trintaDiasAtras) {
              recentes.push({ ...m, produto_nome: p.name });
            }
          }
        } catch { /* ignora erros individuais */ }
      }
      // Filtrar por tipo
      const filtrarPorTipo = filtroTipo === 'TODOS' ? recentes : recentes.filter(m => m.type === filtroTipo);
      filtrarPorTipo.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMovimentacoes(filtrarPorTipo.slice(0, 50));
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      } else {
        setError('Erro ao carregar movimentações');
      }
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, filtroProduto]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!form.product_id) { setError('Selecione um produto.'); return; }
    if (Number(form.quantity) <= 0) { setError('Quantidade deve ser maior que zero.'); return; }
    try {
      const { data } = await api.post('/movimentacoes', {
        product_id: Number(form.product_id),
        type: form.type,
        quantity: Number(form.quantity),
        note: form.note,
      });
      setMessage(data.message);
      setForm({ ...form, quantity: 1, note: '' });
      carregarDados();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar movimentação');
    }
  };

  const fmtData = (iso) => {
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch { return iso; }
  };

  if (loading) {
    return <div className="mov-loading"><div className="spinner" /><p>Carregando movimentações...</p></div>;
  }

  return (
    <div className="movimentacoes">
      <div className="mov-header">
        <h1>Movimentações</h1>
      </div>

      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="mov-form">
        <h3>Nova Movimentação</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Tipo *</label>
            <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="IN">⬆️ Entrada</option>
              <option value="OUT">⬇️ Saída</option>
            </select>
          </div>
          <div className="form-group">
            <label>Produto *</label>
            <select name="product_id" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Selecione um produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (estoque: {Number(p.quantity)})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Quantidade *</label>
            <input type="number" step="1" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Observação</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opcional" />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Salvar movimentação</button>
        </div>
      </form>

      {/* Filtros */}
      <div className="mov-filters">
        <h2 className="hist-title">Histórico de movimentos</h2>
        <div className="filters-row">
          <select className="input-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="TODOS">Todos os tipos</option>
            <option value="IN">Apenas Entradas</option>
            <option value="OUT">Apenas Saídas</option>
          </select>
          <select className="input-select" value={filtroProduto} onChange={(e) => setFiltroProduto(e.target.value)}>
            <option value="">Todos os produtos</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {movimentacoes.length === 0 ? (
        <div className="empty-state">
          <h3>Sem movimentações no período</h3>
          <p>Não há movimentações registradas nos últimos 30 dias com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Observação</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td className="cell-date">{fmtData(m.created_at)}</td>
                  <td className="cell-nome">{m.produto_nome}</td>
                  <td>
                    <span className={`badge-tipo ${m.type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                      {m.type === 'IN' ? '⬆ Entrada' : '⬇ Saída'}
                    </span>
                  </td>
                  <td className="cell-qtd">{Number(m.quantity)}</td>
                  <td>{m.note || '—'}</td>
                  <td>{m.responsavel || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
