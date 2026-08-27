// pages/Movimentacoes.jsx — Entrada/saída de estoque + histórico
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Movimentacoes.css';

export default function Movimentacoes() {
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Formulário
  const [form, setForm] = useState({
    product_id: '',
    type: 'IN',
    quantity: 1,
    note: '',
  });

  const carregarMovimentacoes = useCallback(async () => {
    try {
      // Busca todos os produtos e pega o histórico do primeiro... na verdade
      // vamos listar as movimentações mais recentes via endpoint de produto
      const { data } = await api.get('/produtos');
      const prods = data.produtos || [];
      setProdutos(prods);

      // Monta histórico pegando movimentações de cada produto (simplificado: os 5 primeiros)
      const recentes = [];
      for (const p of prods.slice(0, 5)) {
        try {
          const { data: hist } = await api.get(`/movimentacoes/produto/${p.id}`);
          for (const m of hist.movimentacoes) {
            recentes.push({ ...m, produto_nome: p.name });
          }
        } catch (e) { /* ignora */ }
      }
      recentes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setMovimentacoes(recentes.slice(0, 20));
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao conectar com o servidor");
    }
  }, [t]);

  useEffect(() => {
    carregarMovimentacoes();
  }, [carregarMovimentacoes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const { data } = await api.post('/movimentacoes', {
        product_id: Number(form.product_id),
        type: form.type,
        quantity: Number(form.quantity),
        note: form.note,
      });
      setMessage(data.message);
      setForm({ ...form, quantity: 1, note: '' });
      carregarMovimentacoes();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao conectar com o servidor");
    }
  };

  const fmtData = (iso) => {
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  };

  return (
    <div className="movimentacoes">
      <div className="mov-header">
        <h1>{"Movimentações"}</h1>
      </div>

      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      {/* Formulário de movimentação */}
      <form onSubmit={handleSubmit} className="mov-form">
        <h3>{"Nova Movimentação"}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>{"Tipo"} *</label>
            <select
              name="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="IN">⬆️ {"Entrada"}</option>
              <option value="OUT">⬇️ {"Saída"}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{"Produto"} *</label>
            <select
              name="product_id"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">—</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({Number(p.quantity)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{"Quantidade"} *</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>{"Observação"}</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">{"Registrar"}</button>
        </div>
      </form>

      {/* Histórico */}
      <h2 className="hist-title">{"Histórico de movimentos"}</h2>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>{"Data"}</th>
              <th>{"Produto"}</th>
              <th>{"Tipo"}</th>
              <th>{"Quantidade"}</th>
              <th>{"Observação"}</th>
              <th>{"Responsável"}</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.length === 0 ? (
              <tr><td colSpan="6" className="table-empty">—</td></tr>
            ) : (
              movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td className="cell-date">{fmtData(m.created_at)}</td>
                  <td className="cell-nome">{m.produto_nome}</td>
                  <td>
                    <span className={`badge-tipo ${m.type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                      {m.type === 'IN' ? '⬆ ' + "Entrada" : '⬇ ' + "Saída"}
                    </span>
                  </td>
                  <td className="cell-qtd">{Number(m.quantity)}</td>
                  <td>{m.note || '—'}</td>
                  <td>{m.responsavel || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}