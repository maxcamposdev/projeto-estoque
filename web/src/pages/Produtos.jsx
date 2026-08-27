// pages/Produtos.jsx — CRUD de produtos (tabela, busca, cadastro)
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Produtos.css';

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busca, setBusca] = useState('');
  const [soBaixo, setSoBaixo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    name: '', sku: '', description: '', category_id: '',
    quantity: 0, min_quantity: 0, price: 0, barcode: ''
  });

  const carregarProdutos = useCallback(async () => {
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (soBaixo) params.baixo = 'true';
      const { data } = await api.get('/produtos', { params });
      setProdutos(data.produtos);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [busca, soBaixo, t]);

  useEffect(() => {
    api.get('/categorias')
      .then(({ data }) => setCategorias(data.categorias))
      .catch(() => {});
    carregarProdutos();
  }, [carregarProdutos]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editando) {
        await api.put(`/produtos/${editando.id}`, form);
        setMessage("Produto atualizado com sucesso!");
      } else {
        await api.post('/produtos', form);
        setMessage("Produto cadastrado com sucesso!");
      }
      setShowForm(false);
      setEditando(null);
      setForm({ name: '', sku: '', description: '', category_id: '', quantity: 0, min_quantity: 0, price: 0, barcode: '' });
      carregarProdutos();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao conectar com o servidor");
    }
  };

  const handleEdit = (produto) => {
    setEditando(produto);
    setForm({
      name: produto.name || '',
      sku: produto.sku || '',
      description: produto.description || '',
      category_id: produto.category_id || '',
      quantity: produto.quantity || 0,
      min_quantity: produto.min_quantity || 0,
      price: produto.price || 0,
      barcode: produto.barcode || '',
    });
    setShowForm(true);
    setMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/produtos/${id}`);
      setMessage("Produto excluído com sucesso!");
      carregarProdutos();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao conectar com o servidor");
    }
  };

  const handleNew = () => {
    setEditando(null);
    setForm({ name: '', sku: '', description: '', category_id: '', quantity: 0, min_quantity: 0, price: 0, barcode: '' });
    setShowForm(true);
    setMessage('');
  };

  const estoqueBaixo = (p) => Number(p.quantity) <= Number(p.min_quantity);

  return (
    <div className="produtos">
      <div className="produtos-header">
        <h1>{"Produtos"}</h1>
        <button className="btn-primary" onClick={handleNew}>＋ {"Novo Produto"}</button>
      </div>

      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      <div className="produtos-filters">
        <input
          className="input-search"
          placeholder={"Buscar por nome ou SKU..."}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={soBaixo} onChange={(e) => setSoBaixo(e.target.checked)} />
          {"Só estoque baixo"}
        </label>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="produto-form">
          <h3>{editando ? "Editar Produto" : "Novo Produto"}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>{"Nome"} *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{"SKU"} *</label>
              <input name="sku" value={form.sku} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>{"Categoria"}</label>
              <select name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">—</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{"Quantidade"}</label>
              <input type="number" step="0.001" name="quantity" value={form.quantity} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{"Estoque Mínimo"}</label>
              <input type="number" step="0.001" name="min_quantity" value={form.min_quantity} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{"Preço"}</label>
              <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>{"Código de Barras"}</label>
              <input name="barcode" value={form.barcode} onChange={handleChange} />
            </div>
            <div className="form-group form-full">
              <label>{"Descrição"}</label>
              <input name="description" value={form.description} onChange={handleChange} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{"Salvar"}</button>
            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
              {"Cancelar"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="loading">{"Carregando..."}</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{"Nome"}</th>
                <th>{"SKU"}</th>
                <th>{"Categoria"}</th>
                <th>{"Quantidade"}</th>
                <th>{"Preço"}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr><td colSpan="6" className="table-empty">—</td></tr>
              ) : (
                produtos.map((p) => (
                  <tr key={p.id} className={estoqueBaixo(p) ? 'row-baixo' : ''}>
                    <td className="cell-nome">
                      {p.name}
                      {estoqueBaixo(p) && <span className="badge-baixo">⚠ {"Só estoque baixo"}</span>}
                    </td>
                    <td className="cell-sku">{p.sku}</td>
                    <td>{p.categoria_nome || '—'}</td>
                    <td className="cell-qtd">{Number(p.quantity)}</td>
                    <td>R$ {Number(p.price).toFixed(2)}</td>
                    <td className="cell-acoes">
                      <button className="btn-mini" onClick={() => handleEdit(p)}>✏️</button>
                      <button className="btn-mini btn-mini-danger" onClick={() => handleDelete(p.id)}>🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}