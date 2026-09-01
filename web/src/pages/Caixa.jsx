// pages/Caixa.jsx — Tela do Caixa (PDV) estilo clássico: abertura, vendas e fechamento
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import './Caixa.css';

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export default function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [error, setError] = useState('');
  const [agora, setAgora] = useState(new Date());
  const buscaRef = useRef(null);

  // Dados da venda atual
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');

  // Confirmações
  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(100);
  const [meuUsuario, setMeuUsuario] = useState(null);
  const [listaOperadores, setListaOperadores] = useState([]);
  const [listaVendedores, setListaVendedores] = useState([]);
  const [operatorId, setOperatorId] = useState(null);
  const [sellerId, setSellerId] = useState(null);
  const [closingAmount, setClosingAmount] = useState('');
  const [showRecibo, setShowRecibo] = useState(null);
  const [showVendas, setShowVendas] = useState(false);
  const [vendas, setVendas] = useState([]);

  const carregarCaixa = useCallback(async () => {
    try {
      const { data } = await api.get('/sales/caixa/atual');
      setCaixa(data.cashRegister);
    } catch (e) {
      setError('Erro ao carregar caixa');
    }
  }, []);

  const carregarProdutos = useCallback(async () => {
    try {
      const { data } = await api.get('/produtos');
      setProdutos(data.produtos || []);
    } catch (e) {
      console.error('Erro produtos:', e);
    }
  }, []);

  const carregarVendas = useCallback(async () => {
    try {
      const { data } = await api.get('/sales/vendas');
      setVendas(data.vendas || []);
    } catch (e) {
      console.error('Erro vendas:', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([carregarCaixa(), carregarProdutos()]).finally(() => setLoading(false));
  }, [carregarCaixa, carregarProdutos]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const dados = decodeJWT(token);
    if (!dados) return;
    setMeuUsuario(dados);
    setOperatorId(dados.id);

    api.get('/auth/users')
      .then(({ data }) => {
        const usuarios = data.users || [];
        setListaVendedores(usuarios.filter(u => u.role === 'operador'));
      })
      .catch(() => setListaVendedores([]));

    if (['gerente', 'admin'].includes(dados.role)) {
      api.get('/auth/users')
        .then(({ data }) => setListaOperadores(data.users || []))
        .catch(() => setListaOperadores([]));
    }
  }, []);

  useEffect(() => {
    if (caixa && buscaRef.current) buscaRef.current.focus();
  }, [caixa]);

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ============================================================
  // CAIXA — Abrir / Fechar
  // ============================================================

  const handleAbrirCaixa = async () => {
    setError('');
    try {
      const { data } = await api.post('/sales/caixa/abrir', {
        opening_amount: Number(openingAmount),
        operator_id: operatorId,
      });
      setCaixa(data.cashRegister);
      setShowAbrir(false);
      setMensagem('Caixa aberto com sucesso!');
      setTimeout(() => setMensagem(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao abrir caixa');
    }
  };

  const handleFecharCaixa = async () => {
    if (!closingAmount) {
      setError('Informe o valor de fechamento.');
      return;
    }
    setError('');
    try {
      const { data } = await api.post(`/sales/caixa/${caixa.id}/fechar`, {
        closing_amount: Number(closingAmount),
      });
      setMensagem(`Caixa fechado! Diferença: R$ ${data.resumo.diferenca.toFixed(2)}`);
      setCaixa(null);
      setCarrinho([]);
      setShowFechar(false);
      setClosingAmount('');
      setTimeout(() => setMensagem(''), 5000);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao fechar caixa');
    }
  };

  // ============================================================
  // ITENS DA VENDA
  // ============================================================

  const adicionarItem = (produto) => {
    if (Number(produto.quantity) <= 0) {
      setError(`"${produto.name}" sem estoque!`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    const existente = carrinho.find(i => i.product_id === produto.id);
    if (existente) {
      if (Number(existente.quantity) + 1 > Number(produto.quantity)) {
        setError(`Estoque insuficiente para "${produto.name}"`);
        return;
      }
      setCarrinho(carrinho.map(i =>
        i.product_id === produto.id
          ? { ...i, quantity: Number(i.quantity) + 1, subtotal: Number(i.unit_price) * (Number(i.quantity) + 1) }
          : i
      ));
    } else {
      setCarrinho([...carrinho, {
        product_id: produto.id,
        product_name: produto.name,
        unit_price: Number(produto.price),
        quantity: 1,
        subtotal: Number(produto.price),
        max_quantity: Number(produto.quantity),
      }]);
    }
  };

  const handleBuscaKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const termo = busca.trim().toLowerCase();
    if (!termo) return;
    const porSku = produtos.find(p => (p.sku || '').toLowerCase() === termo);
    if (porSku) {
      adicionarItem(porSku);
      setBusca('');
      return;
    }
    const filtrados = produtos.filter(p =>
      p.name.toLowerCase().includes(termo) || (p.sku || '').toLowerCase().includes(termo)
    );
    if (filtrados.length === 1) {
      adicionarItem(filtrados[0]);
      setBusca('');
    }
  };

  const alterarQuantidade = (productId, delta) => {
    setCarrinho(carrinho.map(i => {
      if (i.product_id === productId) {
        const novaQtd = Number(i.quantity) + delta;
        if (novaQtd < 1) return i;
        if (novaQtd > i.max_quantity) {
          setError(`Máximo disponível: ${i.max_quantity}`);
          return i;
        }
        return { ...i, quantity: novaQtd, subtotal: Number(i.unit_price) * novaQtd };
      }
      return i;
    }));
  };

  const removerItem = (productId) => {
    setCarrinho(carrinho.filter(i => i.product_id !== productId));
  };

  const limparVenda = useCallback(() => {
    setCarrinho([]);
    setCustomerName('');
    setCustomerCpf('');
    setDiscount(0);
    setAmountPaid('');
    setBusca('');
    buscaRef.current?.focus();
  }, []);

  // ============================================================
  // FINALIZAR VENDA
  // ============================================================

  const subtotal = carrinho.reduce((acc, i) => acc + Number(i.subtotal), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const troco = paymentMethod === 'CASH' && amountPaid ? Math.max(0, Number(amountPaid) - total) : 0;

  const handleFinalizarVenda = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.post('/sales/vendas', {
        items: carrinho.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name: customerName,
        customer_cpf: customerCpf,
        discount: Number(discount || 0),
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'CASH' ? Number(amountPaid || total) : total,
        seller_id: sellerId,
      });
      setShowRecibo(data.sale);
      limparVenda();
      carregarProdutos();
      setMensagem('Venda registrada com sucesso!');
      setTimeout(() => setMensagem(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao registrar venda');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinho, customerName, discount, paymentMethod, amountPaid, total, sellerId]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        buscaRef.current?.focus();
      } else if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        if (carrinho.length > 0) handleFinalizarVenda();
      } else if (e.key === 'Escape') {
        if (carrinho.length > 0) limparVenda();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrinho, handleFinalizarVenda, limparVenda]);

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <div className="caixa-loading"><div className="spinner" /><p>Carregando caixa...</p></div>;
  }

  const produtosFiltrados = busca
    ? produtos.filter(p =>
        p.name.toLowerCase().includes(busca.toLowerCase()) || (p.sku || '').toLowerCase().includes(busca.toLowerCase())
      )
    : [];

  const ultimoItem = carrinho.length > 0 ? carrinho[carrinho.length - 1] : null;
  const horaFormatada = agora.toLocaleTimeString('pt-BR');
  const dataFormatada = agora.toLocaleDateString('pt-BR');

  // ============================================
  // CAIXA FECHADO — Mostrar tela de abertura
  // ============================================
  if (!caixa) {
    return (
      <div className="caixa-fechado">
        <div className="caixa-fechado-card">
          <h1>🔒 Caixa Fechado</h1>
          <p>Você precisa abrir o caixa para começar a registrar vendas.</p>

          <div className="caixa-demo-aviso">
            🧪 <strong>Versão de demonstração</strong>
            <br />
            O acesso ao caixa está limitado aos usuários autorizados para esta demonstração.
            Em uma versão de produção, será possível definir quais usuários terão permissão para operar o caixa.
          </div>

          {error && <div className="caixa-error">{error}</div>}

          {!showAbrir ? (
            <button className="btn-primary" onClick={() => setShowAbrir(true)}>
              🔓 Abrir Caixa
            </button>
          ) : (
            <div className="abrir-caixa-form">
              <label>Operador do caixa:</label>
              {meuUsuario && ['gerente', 'admin'].includes(meuUsuario.role) ? (
                <select value={operatorId || ''} onChange={(e) => setOperatorId(Number(e.target.value))}>
                  {listaOperadores.filter(u => u.role === 'operador').map(u => (
                    <option key={u.id} value={u.id}>{u.name}{u.id === meuUsuario.id ? ' (você)' : ''}</option>
                  ))}
                </select>
              ) : (
                <div className="operador-fixo">{meuUsuario ? meuUsuario.name : '—'}</div>
              )}

              <label>Valor conferido em caixa (R$):</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
              <div className="abrir-caixa-actions">
                <button className="btn-primary" onClick={handleAbrirCaixa}>Confirmar Abertura</button>
                <button className="btn-cancel" onClick={() => setShowAbrir(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <button className="btn-link" onClick={() => { setShowVendas(true); carregarVendas(); }}>
            📋 Ver últimas vendas
          </button>
        </div>

        {showVendas && (
          <div className="modal-overlay" onClick={() => setShowVendas(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Últimas Vendas</h2>
              <div className="vendas-list">
                {vendas.slice(0, 10).map(v => (
                  <div key={v.id} className="venda-item">
                    <strong>#{v.id}</strong> — {v.customer_name || 'Sem nome'}
                    <br />
                    <small>R$ {Number(v.total).toFixed(2)} • {v.payment_method} • {v.operador_nome}</small>
                  </div>
                ))}
              </div>
              <button className="btn-cancel" onClick={() => setShowVendas(false)}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // CAIXA ABERTO — PDV
  // ============================================
  return (
    <div className="caixa-pdv-classic">
      {mensagem && <div className="caixa-success">{mensagem}</div>}
      {error && <div className="caixa-error">{error}</div>}

      {/* CABEÇALHO */}
      <div className="pdv-topbar">
        <div>
          <strong>🛒 CAIXA</strong>
          <span className="pdv-topbar-status">
            {carrinho.length === 0 ? 'Pronto para iniciar um pedido' : 'Pedido em andamento'}
          </span>
        </div>
        <span className="pdv-topbar-clock">{dataFormatada} • {horaFormatada}</span>
      </div>

      {/* DADOS DA VENDA */}
      <div className="pdv-infobar">
        <div className="pdv-info-campo">
          <label>Operador</label>
          <span>Operador</span>
        </div>

        <div className="pdv-info-campo">
          <label>Vendedor</label>
          <select
            value={sellerId || ''}
            onChange={(e) => setSellerId(Number(e.target.value))}
          >
            <option value="">Selecione o vendedor</option>
            {listaVendedores
              .filter(v => Number(v.unit_id) === Number(caixa.unit_id))
              .map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </div>

        <div className="pdv-info-campo pdv-info-cliente">
          <label>Cliente</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Cliente padrão"
          />
        </div>

        <div className="pdv-info-campo">
          <label>CPF na nota</label>
          <input
            value={customerCpf}
            onChange={(e) => setCustomerCpf(e.target.value)}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="pdv-main-grid">

        {/* PEDIDO */}
        <div className="pdv-main-left">

          <div className="pdv-pedido-header">
            <div>
              <span className="pdv-pedido-titulo">🛒 PEDIDO</span>
              <small>
                {carrinho.length === 0
                  ? 'Nenhum item adicionado'
                  : `${carrinho.length} item(ns) no pedido`}
              </small>
            </div>

            <button
              className="btn-novo-pedido"
              onClick={limparVenda}
            >
              🛒 {carrinho.length === 0 ? 'Incluir Pedido' : 'Novo Pedido'}
            </button>
          </div>

          {/* BIPAGEM */}
          <div className="pdv-campo-grande pdv-bipagem-box">
            <label>
              Código de Barras
              <small>(bipe ou digite nome/SKU e Enter)</small>
            </label>

            <input
              ref={buscaRef}
              className="pdv-busca"
              placeholder="🔎 Bipe ou digite o produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={handleBuscaKeyDown}
              autoComplete="off"
            />

            {busca && (
              <div className="pdv-produtos-lista">
                {produtosFiltrados.length === 0 && (
                  <div className="pdv-lista-vazia">
                    Nenhum produto encontrado.
                  </div>
                )}

                {produtosFiltrados.slice(0, 20).map(p => (
                  <button
                    key={p.id}
                    className="pdv-produto-item"
                    onClick={() => {
                      adicionarItem(p);
                      setBusca('');
                      buscaRef.current?.focus();
                    }}
                    disabled={Number(p.quantity) <= 0}
                  >
                    <span className="pdv-item-nome">{p.name}</span>
                    <span className="pdv-item-sku">{p.sku || '—'}</span>
                    <span className="pdv-item-preco">
                      R$ {Number(p.price).toFixed(2)}
                    </span>
                    <span className="pdv-item-estoque">
                      Estq: {Number(p.quantity)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ÚLTIMO ITEM */}
          <div className="pdv-item-atual">
            <div className="pdv-item-atual-qtd">
              {ultimoItem ? ultimoItem.quantity : '—'}
            </div>

            <div className="pdv-item-atual-desc">
              {ultimoItem
                ? ultimoItem.product_name
                : 'Nenhum item adicionado ao pedido'}
            </div>

            <div className="pdv-item-atual-preco">
              {ultimoItem
                ? `R$ ${Number(ultimoItem.subtotal).toFixed(2)}`
                : 'R$ 0,00'}
            </div>
          </div>

          {/* ITENS */}
          <div className="pdv-itens-lista-classic">
            <div className="pdv-itens-header">
              <span>Qtd</span>
              <span>Produto</span>
              <span>Vl. Unit.</span>
              <span>Subtotal</span>
              <span></span>
            </div>

            {carrinho.length === 0 ? (
              <div className="pdv-lista-vazia pdv-lista-pedido-vazio">
                🛒
                <strong>Pedido vazio</strong>
                <span>Bipe ou digite um produto acima para começar.</span>
              </div>
            ) : (
              carrinho.map(i => (
                <div key={i.product_id} className="pdv-item-row">
                  <span className="pdv-item-row-qtd">
                    <button onClick={() => alterarQuantidade(i.product_id, -1)}>−</button>
                    {i.quantity}
                    <button onClick={() => alterarQuantidade(i.product_id, 1)}>+</button>
                  </span>

                  <span>{i.product_name}</span>

                  <span>
                    R$ {Number(i.unit_price).toFixed(2)}
                  </span>

                  <span>
                    R$ {Number(i.subtotal).toFixed(2)}
                  </span>

                  <button
                    className="pdv-item-row-remover"
                    onClick={() => removerItem(i.product_id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* PAGAMENTO */}
          <div className="pdv-pagamento-row">
            <div className="campo-grupo">
              <label>Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">💵 Dinheiro</option>
                <option value="CARD">💳 Cartão</option>
                <option value="PIX">📱 PIX</option>
              </select>
            </div>

            <div className="campo-grupo">
              <label>Desconto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            {paymentMethod === 'CASH' && (
              <div className="campo-grupo">
                <label>Valor Recebido</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={total.toFixed(2)}
                />
              </div>
            )}
          </div>

        </div>

        {/* RESUMO */}
        <div className="pdv-main-right">

          <div className="pdv-resumo-card">
            <div className="pdv-resumo-titulo">
              RESUMO DO PEDIDO
            </div>

            <div className="pdv-resumo-linha">
              <span>Itens</span>
              <strong>{carrinho.length}</strong>
            </div>

            <div className="pdv-resumo-linha">
              <span>Total bruto</span>
              <strong>R$ {subtotal.toFixed(2)}</strong>
            </div>

            <div className="pdv-resumo-linha">
              <span>Desconto</span>
              <strong>R$ {Number(discount || 0).toFixed(2)}</strong>
            </div>

            <div className="pdv-total-liquido">
              <label>TOTAL</label>
              <div className="pdv-total-valor">
                R$ {total.toFixed(2)}
              </div>
            </div>

            <div className="pdv-pago-troco">
              <div>
                <label>VALOR PAGO</label>
                <div>
                  R$ {paymentMethod === 'CASH'
                    ? Number(amountPaid || 0).toFixed(2)
                    : total.toFixed(2)}
                </div>
              </div>

              <div>
                <label>TROCO</label>
                <div>R$ {troco.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* AÇÕES */}
          <div className="pdv-acoes-classic">
            <button
              className="btn-destaque btn-finalizar-grande"
              onClick={handleFinalizarVenda}
              disabled={carrinho.length === 0}
            >
              ✅ Finalizar Venda
            </button>

            <button
              className="btn-secundario"
              onClick={() => {
                setShowVendas(true);
                carregarVendas();
              }}
            >
              📋 Ver Vendas
            </button>

            <button
              className="btn-fechar-caixa"
              onClick={() => setShowFechar(true)}
            >
              🔒 Fechar Caixa
            </button>
          </div>

        </div>
      </div>

      {/* ATALHOS — FAIXA INFERIOR */}
      <div className="pdv-atalhos pdv-atalhos-inferior">
        <strong>⌨ ATALHOS</strong>

        <div className="pdv-atalhos-lista">
          <span className="atalho ativo">
            <kbd>F2</kbd> Bipagem
          </span>

          <span className="atalho ativo">
            <kbd>Alt+F</kbd> Finalizar
          </span>

          <span className="atalho ativo">
            <kbd>Esc</kbd> Limpar
          </span>

          <span className="atalho em-breve">
            <kbd>F1</kbd> Desconto <small>em breve</small>
          </span>

          <span className="atalho em-breve">
            <kbd>F7</kbd> Cupom <small>em breve</small>
          </span>

          <span className="atalho em-breve">
            <kbd>F8</kbd> Reimprimir <small>em breve</small>
          </span>

          <span className="atalho em-breve">
            <kbd>F10</kbd> Cliente <small>em breve</small>
          </span>
        </div>
      </div>

      {/* MODAL FECHAR CAIXA */}
      {showFechar && (
        <div className="modal-overlay" onClick={() => setShowFechar(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🔒 Fechar Caixa</h2>
            <p>Informe o valor em dinheiro contado no caixa:</p>
            <input
              type="number"
              step="0.01"
              min="0"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              placeholder="0.00"
            />
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleFecharCaixa}>Confirmar Fechamento</button>
              <button className="btn-cancel" onClick={() => setShowFechar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VENDAS */}
      {showVendas && (
        <div className="modal-overlay" onClick={() => setShowVendas(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Últimas Vendas</h2>
            <div className="vendas-list">
              {vendas.slice(0, 10).map(v => (
                <div key={v.id} className="venda-item">
                  <strong>#{v.id}</strong> — {v.customer_name || 'Sem nome'}
                  <br />
                  <small>R$ {Number(v.total).toFixed(2)} • {v.payment_method} • {v.operador_nome}</small>
                </div>
              ))}
            </div>
            <button className="btn-cancel" onClick={() => setShowVendas(false)}>Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL RECIBO */}
      {showRecibo && (
        <div className="modal-overlay" onClick={() => setShowRecibo(null)}>
          <div className="modal-content recibo" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Venda #{showRecibo.id}</h2>
            <p><strong>Cliente:</strong> {showRecibo.customer_name || 'Não informado'}</p>
            {showRecibo.customer_cpf && (
              <p><strong>CPF na nota:</strong> {showRecibo.customer_cpf}</p>
            )}
            <p><strong>Total:</strong> R$ {Number(showRecibo.total).toFixed(2)}</p>
            <p><strong>Pagamento:</strong> {showRecibo.payment_method}</p>
            {showRecibo.change_amount > 0 && (
              <p><strong>Troco:</strong> R$ {Number(showRecibo.change_amount).toFixed(2)}</p>
            )}
            <hr />
            <h3>Itens:</h3>
            <ul>
              {showRecibo.items.map((item, idx) => (
                <li key={idx}>
                  {item.quantity}× {item.product_name} — R$ {Number(item.subtotal).toFixed(2)}
                </li>
              ))}
            </ul>
            <button className="btn-primary" onClick={() => setShowRecibo(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
