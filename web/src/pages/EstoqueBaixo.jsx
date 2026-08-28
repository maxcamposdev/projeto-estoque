import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './EstoqueBaixo.css';

export default function EstoqueBaixo() {
  const navigate = useNavigate();

  const [produtos, setProdutos] = useState([]);
  const [todosProdutos, setTodosProdutos] = useState([]);

  const [selecionados, setSelecionados] = useState([]);
  const [selecionadosCompra, setSelecionadosCompra] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [gerando, setGerando] = useState(false);

  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [modalAberto, setModalAberto] = useState(false);

  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorErro, setFornecedorErro] = useState('');
  const [pedidoErro, setPedidoErro] = useState('');
  const [observacao, setObservacao] = useState('');

  // Define a origem do pedido:
  // baixo = produtos abaixo do mínimo
  // geral = produto pesquisado manualmente
  const [modoPedido, setModoPedido] = useState(null);

  const [quantidades, setQuantidades] = useState({});
  const [quantidadesCompra, setQuantidadesCompra] = useState({});

  const [buscaProduto, setBuscaProduto] = useState('');

  useEffect(() => {
    carregarProdutosBaixo();
  }, []);

  useEffect(() => {
    carregarTodosProdutos();
    carregarFornecedores();
  }, []);

  async function carregarProdutosBaixo() {
    try {
      setLoading(true);

      const { data } = await api.get('/produtos', {
        params: { baixo: 'true' }
      });

      const lista = data.produtos || [];

      setProdutos(lista);

      const qtds = {};

      lista.forEach((p) => {
        qtds[p.id] = Math.max(
          1,
          Number(p.min_quantity) - Number(p.quantity)
        );
      });

      setQuantidades(qtds);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Erro ao carregar produtos com estoque baixo.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function carregarFornecedores() {
    try {
      const { data } = await api.get('/fornecedores', {
        params: { status: 'ACTIVE' }
      });

      setFornecedores(data.fornecedores || []);
    } catch (err) {
      setFornecedores([]);
    }
  }

  async function carregarTodosProdutos() {
    try {
      setLoadingTodos(true);

      const { data } = await api.get('/produtos');

      setTodosProdutos(data.produtos || []);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Erro ao carregar produtos.'
      );
    } finally {
      setLoadingTodos(false);
    }
  }

  function alternarSelecao(id) {
    setSelecionados((atual) =>
      atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id]
    );
  }

  function selecionarTodos() {
    if (selecionados.length === produtos.length) {
      setSelecionados([]);
    } else {
      setSelecionados(produtos.map((p) => p.id));
    }
  }

  function alterarQuantidade(id, valor) {
    const numero = Math.max(0, Number(valor) || 0);

    setQuantidades((atual) => ({
      ...atual,
      [id]: numero
    }));
  }

  function alterarQuantidadeCompra(id, valor) {
    const numero = Math.max(0, Number(valor) || 0);

    setQuantidadesCompra((atual) => ({
      ...atual,
      [id]: numero
    }));
  }

  function adicionarProdutoCompra(produto) {
    if (!produto || !produto.id) {
      return;
    }

    setSelecionadosCompra((atual) => {
      if (atual.includes(produto.id)) {
        return atual;
      }

      return [...atual, produto.id];
    });

    setQuantidadesCompra((atual) => ({
      ...atual,
      [produto.id]: atual[produto.id] || 1
    }));

    setBuscaProduto('');
    setError('');
    setPedidoErro('');
  }

  function removerProdutoCompra(id) {
    setSelecionadosCompra((atual) =>
      atual.filter((item) => item !== id)
    );

    setQuantidadesCompra((atual) => {
      const novo = { ...atual };
      delete novo[id];
      return novo;
    });
  }

  function abrirGeracaoPedidoBaixo() {
    setError('');
    setSucesso('');
    setFornecedorErro('');
    setPedidoErro('');

    if (selecionados.length === 0) {
      setError('Selecione pelo menos um produto para gerar o pedido.');
      return;
    }

    setModoPedido('baixo');
    setModalAberto(true);
  }

  function abrirGeracaoPedidoGeral() {
    setError('');
    setSucesso('');
    setFornecedorErro('');
    setPedidoErro('');

    if (selecionadosCompra.length === 0) {
      setError('Adicione pelo menos um produto ao pedido de compra.');
      return;
    }

    setModoPedido('geral');
    setModalAberto(true);
  }

  function obterIdsModal() {
    return modoPedido === 'geral'
      ? selecionadosCompra
      : selecionados;
  }

  function obterProdutosModal() {
    return modoPedido === 'geral'
      ? todosProdutos
      : produtos;
  }

  function obterQuantidadeModal(id) {
    return modoPedido === 'geral'
      ? quantidadesCompra[id]
      : quantidades[id];
  }

  function alterarQuantidadeModal(id, valor) {
    if (modoPedido === 'geral') {
      alterarQuantidadeCompra(id, valor);
    } else {
      alterarQuantidade(id, valor);
    }
  }

  async function gerarPedido() {
    const ids = obterIdsModal();
    const origem = obterProdutosModal();

    const itens = ids
      .map((id) => {
        const produto = origem.find((p) => p.id === id);

        if (!produto) return null;

        return {
          product_id: produto.id,
          quantity: Number(obterQuantidadeModal(id)) || 0
        };
      })
      .filter(
        (item) => item && item.quantity > 0
      );

    if (ids.length === 0) {
      setPedidoErro(
        'Adicione pelo menos um produto antes de confirmar o pedido.'
      );
      return;
    }

    if (itens.length === 0) {
      setPedidoErro(
        'Informe uma quantidade maior que zero para pelo menos um produto.'
      );
      return;
    }

    if (itens.length !== ids.length) {
      setPedidoErro(
        'Informe uma quantidade maior que zero para todos os produtos selecionados.'
      );
      return;
    }

    if (!fornecedorId) {
      setFornecedorErro(
        'Selecione um fornecedor antes de confirmar o pedido.'
      );
      setPedidoErro('');
      setError('');
      return;
    }

    setFornecedorErro('');
    setPedidoErro('');

    try {
      setGerando(true);
      setError('');
      setSucesso('');

      const { data } = await api.post(
        '/pedidos-compra',
        {
          items: itens,
          supplier_id: Number(fornecedorId),
          note: observacao.trim() || null
        }
      );

      setModalAberto(false);
      setModoPedido(null);

      setSelecionados([]);
      setSelecionadosCompra([]);

      setFornecedorId('');
      setFornecedorNome('');
      setFornecedorErro('');
      setPedidoErro('');
      setObservacao('');
      setBuscaProduto('');

      setSucesso(
        data.message ||
        'Pedido de compra criado com sucesso.'
      );

      setTimeout(() => {
        setSucesso('');
      }, 5000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Não foi possível gerar o pedido de compra.'
      );
    } finally {
      setGerando(false);
    }
  }

  const produtosFiltrados = todosProdutos.filter((p) => {
    const termo = buscaProduto
      .trim()
      .toLowerCase();

    if (!termo) return false;

    return (
      String(p.name || '')
        .toLowerCase()
        .includes(termo) ||

      String(p.sku || '')
        .toLowerCase()
        .includes(termo) ||

      String(p.barcode || '')
        .toLowerCase()
        .includes(termo)
    );
  });

  if (loading) {
    return (
      <div className="estoque-baixo-loading">
        <div className="spinner" />
        <p>Carregando estoque...</p>
      </div>
    );
  }

  return (
    <div className="estoque-baixo">

      <div className="eb-header">
        <div>
          <h1>⚠️ Estoque e Reposição</h1>

          <p className="eb-subtitle">
            Monitore produtos abaixo do mínimo ou faça uma nova solicitação de compra.
          </p>
        </div>

        <div className="eb-header-actions">
          <button
            className="btn-transferencia"
            onClick={() => navigate('/transferencias')}
          >
            🔄 Solicitar de outra loja
          </button>

          <button
            className="btn-voltar"
            onClick={() => navigate('/dashboard')}
          >
            ← Voltar
          </button>
        </div>
      </div>

      {error && (
        <div className="eb-message eb-error">
          ⚠️ {error}
        </div>
      )}

      {sucesso && (
        <div className="eb-message eb-success">
          ✓ {sucesso}
        </div>
      )}

      {/* =====================================================
          NOVA SOLICITAÇÃO DE COMPRA
      ====================================================== */}

      <section className="nova-compra">

        <div className="nova-compra-header">
          <div>
            <h2>📦 Nova solicitação de compra</h2>

            <p>
              Pesquise qualquer produto do estoque e adicione os itens que deseja comprar.
            </p>
          </div>

          <span className="contador-compra">
            {selecionadosCompra.length} item(ns)
          </span>
        </div>

        <div className="busca-compra">

          <label>
            Pesquisar produto
          </label>

          <input
            type="text"
            value={buscaProduto}
            onChange={(e) =>
              setBuscaProduto(e.target.value)
            }
            placeholder="Digite nome, SKU ou código de barras..."
          />

          {buscaProduto.trim() && (
            <div className="resultado-busca">

              {loadingTodos ? (
                <div className="busca-vazia">
                  Carregando produtos...
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="busca-vazia">
                  Nenhum produto encontrado.
                </div>
              ) : (
                produtosFiltrados
                  .slice(0, 8)
                  .map((p) => {

                    const selecionado =
                      selecionadosCompra.includes(p.id);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`resultado-produto ${
                          selecionado
                            ? 'produto-ja-selecionado'
                            : ''
                        }`}
                        onClick={() =>
                          adicionarProdutoCompra(p)
                        }
                        disabled={selecionado}
                      >

                        <div className="resultado-produto-info">

                          <strong>
                            {p.name}
                          </strong>

                          <span>
                            SKU: {p.sku || '—'}
                            {' · '}
                            Código: {p.barcode || '—'}
                          </span>

                        </div>

                        <div className="resultado-produto-estoque">
                          <span>
                            Estoque
                          </span>

                          <strong>
                            {Number(p.quantity)}
                          </strong>
                        </div>

                        <span className="resultado-add">
                          {selecionado
                            ? '✓ Adicionado'
                            : '+ Adicionar'}
                        </span>

                      </button>
                    );
                  })
              )}

            </div>
          )}

        </div>

        {selecionadosCompra.length > 0 && (

          <div className="compra-selecionados">

            <div className="compra-selecionados-header">
              <strong>
                Produtos para comprar
              </strong>

              <span>
                {selecionadosCompra.length} selecionado(s)
              </span>
            </div>

            {selecionadosCompra.map((id) => {

              const p = todosProdutos.find(
                (produto) => produto.id === id
              );

              if (!p) return null;

              return (
                <div
                  className="compra-selecionado"
                  key={p.id}
                >

                  <div className="compra-produto-info">

                    <strong>
                      {p.name}
                    </strong>

                    <span>
                      SKU: {p.sku || '—'}
                      {' · '}
                      Estoque atual: {Number(p.quantity)}
                    </span>

                  </div>

                  <div className="compra-produto-acoes">

                    <div className="quantidade-compra">

                      <label>
                        Quantidade
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          quantidadesCompra[p.id] || 1
                        }
                        onChange={(e) =>
                          alterarQuantidadeCompra(
                            p.id,
                            e.target.value
                          )
                        }
                      />

                    </div>

                    <button
                      type="button"
                      className="btn-remover-produto"
                      onClick={() =>
                        removerProdutoCompra(p.id)
                      }
                    >
                      Remover
                    </button>

                  </div>

                </div>
              );
            })}

            <div className="compra-footer">

              <div>
                <strong>
                  Pedido com {selecionadosCompra.length} produto(s)
                </strong>

                <span>
                  Os produtos podem ter estoque normal ou baixo.
                </span>
              </div>

              <button
                className="btn-primary btn-gerar"
                onClick={abrirGeracaoPedidoGeral}
                disabled={gerando}
              >
                {gerando
                  ? 'Criando pedido...'
                  : '📦 Criar pedido de compra'}
              </button>

            </div>

          </div>

        )}

      </section>

      {/* =====================================================
          PRODUTOS ABAIXO DO MÍNIMO
      ====================================================== */}

      <section className="alerta-estoque">

        <div className="secao-titulo">

          <div>
            <h2>⚠️ Produtos abaixo do estoque mínimo</h2>

            <p>
              Estes produtos precisam de atenção para evitar falta de estoque.
            </p>
          </div>

          {produtos.length > 0 && (
            <button
              className="btn-select-all"
              onClick={selecionarTodos}
            >
              {selecionados.length === produtos.length
                ? '☐ Desmarcar todos'
                : '☑ Selecionar todos'}
            </button>
          )}

        </div>

        {produtos.length === 0 ? (

          <div className="empty-state">
            <h3>✅ Nenhum produto com estoque baixo</h3>

            <p>
              Todos os produtos estão acima do nível mínimo.
            </p>

            <p>
              Você ainda pode criar uma compra usando a pesquisa acima.
            </p>
          </div>

        ) : (

          <>

            <div className="eb-summary">

              <div>
                <strong>
                  {produtos.length}
                </strong>

                <span>
                  produto(s) abaixo do mínimo
                </span>
              </div>

            </div>

            <div className="table-wrapper">

              <table className="table">

                <thead>
                  <tr>
                    <th className="col-check"></th>
                    <th>Produto</th>
                    <th>SKU</th>
                  <th>Código de barras</th>
                    <th>Estoque</th>
                    <th>Mínimo</th>
                    <th>Déficit</th>
                    <th>Comprar</th>
                    <th>Preço</th>
                  </tr>
                </thead>

                <tbody>

                  {produtos.map((p) => {

                    const deficit = Math.max(
                      0,
                      Number(p.min_quantity) -
                      Number(p.quantity)
                    );

                    const marcado =
                      selecionados.includes(p.id);

                    return (

                      <tr
                        key={p.id}
                        className={
                          marcado
                            ? 'row-selecionado'
                            : 'row-baixo'
                        }
                      >

                        <td className="col-check">

                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() =>
                              alternarSelecao(p.id)
                            }
                            aria-label={`Selecionar ${p.name}`}
                          />

                        </td>

                        <td className="cell-nome">

                          <strong>
                            {p.name}
                          </strong>

                          <span className="badge-baixo">
                            ⚠ Estoque baixo
                          </span>

                        </td>

                        <td className="cell-sku">
                          {p.sku}
                        </td>

                        <td className="cell-barcode">
                          {p.barcode || '—'}
                        </td>

                        <td className="cell-qtd">
                          {Number(p.quantity)}
                        </td>

                        <td className="cell-qtd">
                          {Number(p.min_quantity)}
                        </td>

                        <td className="cell-deficit">
                          {deficit > 0
                            ? deficit
                            : '—'}
                        </td>

                        <td>

                          <input
                            className="input-compra"
                            type="number"
                            min="1"
                            step="1"
                            value={
                              quantidades[p.id] ||
                              deficit ||
                              1
                            }
                            onChange={(e) =>
                              alterarQuantidade(
                                p.id,
                                e.target.value
                              )
                            }
                          />

                        </td>

                        <td>
                          R${' '}
                          {Number(p.price).toFixed(2)}
                        </td>

                      </tr>

                    );
                  })}

                </tbody>

              </table>

            </div>

            <div className="eb-bottom">

              <div className="selection-info">

                {selecionados.length > 0 ? (
                  <>
                    <strong>
                      {selecionados.length}
                    </strong>{' '}
                    produto(s) selecionado(s)
                  </>
                ) : (
                  'Selecione os produtos que deseja repor'
                )}

              </div>

              <button
                className="btn-primary btn-gerar"
                onClick={abrirGeracaoPedidoBaixo}
                disabled={
                  selecionados.length === 0
                }
              >
                📦 Gerar pedido de compra
              </button>

            </div>

          </>

        )}

      </section>

      {/* =====================================================
          MODAL DE PEDIDO PARA ESTOQUE BAIXO
      ====================================================== */}

      {modalAberto && (

        <div
          className="modal-overlay"
          onClick={() =>
            !gerando &&
            setModalAberto(false)
          }
        >

          <div
            className="modal-pedido"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  📦 Gerar pedido de compra
                </h2>

                <p>
                  Confirme os produtos selecionados.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setModalAberto(false)
                }
                disabled={gerando}
              >
                ×
              </button>

            </div>

            <div className="pedido-itens">

              {obterIdsModal().map((id) => {

                const p = obterProdutosModal().find(
                  (produto) => produto.id === id
                );

                if (!p) return null;

                return (

                  <div
                    className="pedido-item"
                    key={p.id}
                  >

                    <div>
                      <strong>
                        {p.name}
                      </strong>

                      <span>
                        SKU: {p.sku || '—'}
                        {' · '}
                        Código: {p.barcode || '—'}
                        {' · '}
                        Estoque atual: {Number(p.quantity)}
                      </span>
                    </div>

                    <div className="pedido-qtd">

                      <label>
                        Quantidade
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          obterQuantidadeModal(p.id) || 1
                        }
                        onChange={(e) =>
                          alterarQuantidadeModal(
                            p.id,
                            e.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                );

              })}

            </div>

            {pedidoErro && (
              <div className="pedido-validacao-erro">
                ⚠️ {pedidoErro}
              </div>
            )}

            <div className="form-pedido">

              <div className="form-group">

                <label>
                  Fornecedor *
                </label>

                <select
                  required
                  value={fornecedorId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const fornecedor = fornecedores.find(
                      (item) => String(item.id) === String(id)
                    );

                    setFornecedorId(id);
                    setFornecedorErro('');
                    setPedidoErro('');
                    setFornecedorNome(
                      fornecedor
                        ? (fornecedor.trade_name || fornecedor.legal_name)
                        : ''
                    );
                  }}
                >
                  <option value="">
                    Selecione um fornecedor *
                  </option>

                  {fornecedores.map((fornecedor) => (
                    <option
                      key={fornecedor.id}
                      value={fornecedor.id}
                    >
                      {fornecedor.trade_name || fornecedor.legal_name}
                    </option>
                  ))}
                </select>

                {fornecedorErro && (
                  <small className="fornecedor-erro">
                    ⚠️ {fornecedorErro}
                  </small>
                )}

                {fornecedores.length === 0 && (
                  <small className="fornecedor-sem-cadastro">
                    Nenhum fornecedor ativo cadastrado.
                    Cadastre um em Fornecedores.
                  </small>
                )}

              </div>

              <div className="form-group">

                <label>
                  Observação
                </label>

                <textarea
                  value={observacao}
                  onChange={(e) =>
                    setObservacao(e.target.value)
                  }
                  placeholder="Ex.: Reposição urgente do estoque..."
                  rows="3"
                />

              </div>

            </div>

            <div className="modal-actions">

              <button
                className="btn-cancelar"
                onClick={() =>
                  setModalAberto(false)
                }
                disabled={gerando}
              >
                Cancelar
              </button>

              <button
                className="btn-primary"
                onClick={gerarPedido}
                disabled={gerando}
              >
                {gerando
                  ? 'Gerando pedido...'
                  : '✓ Confirmar pedido'}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
