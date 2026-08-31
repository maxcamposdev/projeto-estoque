// pages/Produtos.jsx — CRUD de produtos com upload de imagem
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import './Produtos.css';

const TAMANHO_MAX_MB = 2; // Limite de upload em MB

// Converte um File em string base64 (data:image/...)
function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Decide o que mostrar no preview: data (base64), URL externa, ou nada
function resolverImagemPreview(produtoOuForm) {
  if (!produtoOuForm) return null;
  if (produtoOuForm.image_data) return produtoOuForm.image_data;
  if (produtoOuForm.image_url && produtoOuForm.image_url.trim()) return produtoOuForm.image_url.trim();
  return null;
}

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
  const [pagina, setPagina] = useState(1);
  const ITEMSPORPAGINA = 10;

  // Estado do formulário (incluindo imagens)
  const [form, setForm] = useState({
    name: '', sku: '', description: '', category_id: '',
    quantity: 0, min_quantity: 0, price: 0, barcode: '',
    image_url: '', image_data: ''
  });

  // Estado da UI de imagem
  const [modoImagem, setModoImagem] = useState('url'); // 'url' ou 'arquivo'
  const [previewImagem, setPreviewImagem] = useState(null);
  const [erroImagem, setErroImagem] = useState('');
  const inputArquivoRef = useRef(null);

  const carregarProdutos = useCallback(async () => {
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (soBaixo) params.baixo = 'true';
      const { data } = await api.get('/produtos', { params });
      setProdutos(data.produtos);
      setError('');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        setError(err.response?.data?.message || 'Erro ao conectar com o servidor');
      }
    } finally {
      setLoading(false);
    }
  }, [busca, soBaixo]);

  useEffect(() => {
    api.get('/categorias').then(({ data }) => setCategorias(data.categorias || [])).catch(() => {});
    carregarProdutos();
  }, [carregarProdutos]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImagemUrl = (e) => {
    const url = e.target.value;
    setForm({ ...form, image_url: url, image_data: '' });
    setPreviewImagem(url.trim() || null);
    setErroImagem('');
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
  };

  const handleArquivoSelecionado = async (e) => {
    const file = e.target.files?.[0];
    setErroImagem('');
    if (!file) {
      setForm({ ...form, image_data: '', image_url: '' });
      setPreviewImagem(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErroImagem('Selecione apenas arquivos de imagem (PNG, JPG, WEBP, GIF).');
      return;
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErroImagem(`Arquivo muito grande (máx. ${TAMANHO_MAX_MB}MB).`);
      return;
    }
    try {
      const base64 = await arquivoParaBase64(file);
      setForm({ ...form, image_data: base64, image_url: '' });
      setPreviewImagem(base64);
    } catch {
      setErroImagem('Erro ao ler o arquivo.');
    }
  };

  const removerImagem = () => {
    setForm({ ...form, image_url: '', image_data: '' });
    setPreviewImagem(null);
    setErroImagem('');
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      // Envia somente o que foi definido (image_url ou image_data)
      const payload = { ...form };
      if (editando) {
        await api.put(`/produtos/${editando.id}`, payload);
        setMessage('Produto atualizado com sucesso!');
      } else {
        await api.post('/produtos', payload);
        setMessage('Produto cadastrado com sucesso!');
      }
      setShowForm(false);
      setEditando(null);
      resetarForm();
      carregarProdutos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar produto');
    }
  };

  const resetarForm = () => {
    setForm({ name: '', sku: '', description: '', category_id: '', quantity: 0, min_quantity: 0, price: 0, barcode: '', image_url: '', image_data: '' });
    setModoImagem('url');
    setPreviewImagem(null);
    setErroImagem('');
    if (inputArquivoRef.current) inputArquivoRef.current.value = '';
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
      image_url: produto.image_url || '',
      image_data: produto.image_data || ''
    });
    // Define o modo de imagem baseado no que já existe
    if (produto.image_data) {
      setModoImagem('arquivo');
      setPreviewImagem(produto.image_data);
    } else if (produto.image_url) {
      setModoImagem('url');
      setPreviewImagem(produto.image_url);
    } else {
      setModoImagem('url');
      setPreviewImagem(null);
    }
    setErroImagem('');
    setShowForm(true);
    setMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/produtos/${id}`);
      setMessage('Produto excluído com sucesso!');
      carregarProdutos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir produto');
    }
  };

  const handleNew = () => {
    setEditando(null);
    resetarForm();
    setShowForm(true);
    setMessage('');
  };

  // Paginação
  const totalPaginas = Math.ceil(produtos.length / ITEMSPORPAGINA);
  const inicio = (pagina - 1) * ITEMSPORPAGINA;
  const fim = inicio + ITEMSPORPAGINA;
  const produtosPagina = produtos.slice(inicio, fim);

  if (loading) {
    return <div className="produtos-loading"><div className="spinner" /><p>Carregando produtos...</p></div>;
  }

  return (
    <div className="produtos">
      <div className="produtos-header">
        <h1>Produtos</h1>
        <button className="btn-novo-produto" onClick={handleNew}>＋ Novo Produto</button>
      </div>

      {message && <p className="msg-success">{message}</p>}
      {error && <p className="msg-error">{error}</p>}

      <div className="produtos-filters">
        <input
          className="input-search"
          placeholder="Buscar por nome, SKU ou código de barras..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
        />
        <label className="checkbox-label">
          <input type="checkbox" checked={soBaixo} onChange={(e) => setSoBaixo(e.target.checked)} />
          Mostrar apenas itens com estoque baixo
        </label>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="produto-form">
          <h3>{editando ? 'Editar Produto' : 'Novo Produto'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome *</label>
              <input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input name="sku" value={form.sku} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Código de Barras</label>
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                placeholder="Ex.: 7891234567890"
                inputMode="numeric"
              />
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <select name="category_id" value={form.category_id} onChange={handleChange}>
                <option value="">Selecione uma categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade</label>
              <input type="number" step="0.001" min="0" name="quantity" value={form.quantity} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Estoque Mínimo</label>
              <input type="number" step="0.001" min="0" name="min_quantity" value={form.min_quantity} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Preço (R$)</label>
              <input type="number" step="0.01" min="0" name="price" value={form.price} onChange={handleChange} />
            </div>
            <div className="form-group form-full">
              <label>Descrição</label>
              <input name="description" value={form.description} onChange={handleChange} />
            </div>

            {/* CAMPO DE IMAGEM */}
            <div className="form-group form-full">
              <label>Imagem do Produto</label>

              <div className="img-tabs">
                <button
                  type="button"
                  className="img-tab img-tab-active"
                  onClick={() => { setErroImagem(''); }}
                >
                  📁 Enviar arquivo
                </button>
              </div>

              <input
                  ref={inputArquivoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleArquivoSelecionado}
                />

              {erroImagem && <p className="img-erro">{erroImagem}</p>}

              {/* Preview */}
              {previewImagem && (
                <div className="img-preview-box">
                  <img
                    src={previewImagem}
                    alt="Preview"
                    className="img-preview"
                    onError={() => setErroImagem('Não foi possível carregar a imagem desta URL.')}
                  />
                  <button type="button" className="btn-remover-img" onClick={removerImagem}>
                    ✕ Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Salvar</button>
            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {produtos.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum produto encontrado</h3>
          <p>Comece cadastrando seu primeiro produto.</p>
          <button className="btn-primary" onClick={handleNew}>＋ Cadastrar primeiro produto</button>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Imagem</th>
                  <th>Nome</th>
                  <th>SKU</th>
                  <th>Código de Barras</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Preço</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosPagina.map((p) => {
                  const baixo = Number(p.quantity) <= Number(p.min_quantity);
                  const imgSrc = resolverImagemPreview(p);
                  return (
                    <tr key={p.id} className={baixo ? 'row-baixo' : ''}>
                      <td className="cell-img">
                        {imgSrc ? (
                          <img src={imgSrc} alt={p.name} className="thumb-produto" />
                        ) : (
                          <div className="thumb-vazio">—</div>
                        )}
                      </td>
                      <td className="cell-nome">
                        {p.name}
                        {baixo && <span className="badge-baixo">⚠ Estoque baixo</span>}
                      </td>
                      <td className="cell-sku">{p.sku}</td>
                      <td className="cell-barcode">
                        {p.barcode || '—'}
                      </td>
                      <td>{p.categoria_nome || '—'}</td>
                      <td className="cell-qtd">{Number(p.quantity)}</td>
                      <td>R$ {Number(p.price).toFixed(2)}</td>
                      <td className="cell-acoes">
                        <button className="btn-mini" onClick={() => handleEdit(p)} title="Editar">✏️</button>
                        <button className="btn-mini btn-mini-danger" onClick={() => handleDelete(p.id)} title="Excluir">🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="paginacao">
              <button className="btn-page" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>« Anterior</button>
              <span className="page-info">Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong> — {produtos.length} produto(s) no total</span>
              <button className="btn-page" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>Próxima »</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
