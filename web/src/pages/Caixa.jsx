// pages/Caixa.jsx — Tela do Caixa (PDV) com abertura, vendas e fechamento
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './Caixa.css';

export default function Caixa() {
  const [caixa, setCaixa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [error, setError] = useState('');

  // Dados da venda atual
  const [customerName, setCustomerName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');

  // Confirmações
  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [openingAmount, setOpeningAmount] = useState(100);
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

  // ============================================================
  // CAIXA — Abrir / Fechar
  // ============================================================

  const handleAbrirCaixa = async () => {
    setError('');
    try {
      const { data } = await api.post('/sales/caixa/abrir', { opening_amount: Number(openingAmount) });
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
  // CARRINHO
  // ============================================================

  const adicionarAoCarrinho = (produto) => {
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

  const removerDoCarrinho = (productId) => {
    setCarrinho(carrinho.filter(i => i.product_id !== productId));
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    setCustomerName('');
    setDiscount(0);
    setAmountPaid('');
  };

  // ============================================================
  // FINALIZAR VENDA
  // ============================================================

  const subtotal = carrinho.reduce((acc, i) => acc + Number(i.subtotal), 0);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const troco = paymentMethod === 'CASH' && amountPaid ? Math.max(0, Number(amountPaid) - total) : 0;

  const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) return;
    setError('');
    try {
      const { data } = await api.post('/sales/vendas', {
        items: carrinho.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name: customerName,
        discount: Number(discount || 0),
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'CASH' ? Number(amountPaid || total) : total,
      });
      setShowRecibo(data.sale);
      limparCarrinho();
      carregarProdutos();
      setMensagem('Venda registrada com sucesso!');
      setTimeout(() => setMensagem(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao registrar venda');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return <div className="caixa-loading"><div className="spinner" /><p>Carregando caixa...</p></div>;
  }

  const produtosFiltrados = produtos.filter(p =>
    !busca || p.name.toLowerCase().includes(busca.toLowerCase()) || (p.sku || '').toLowerCase().includes(busca.toLowerCase())
  );

  // ============================================
  // CAIXA FECHADO — Mostrar tela de abertura
  // ============================================
  if (!caixa) {
    return (
      <div className="caixa-fechado">
        <div className="caixa-fechado-card">
          <h1>🔒 Caixa Fechado</h1>
          <p>Você precisa abrir o caixa para começar a registrar vendas.</p>

          {error && <div className="caixa-error">{error}</div>}

          {!showAbrir ? (
            <button className="btn-primary" onClick={() => setShowAbrir(true)}>
              🔓 Abrir Caixa
            </button>
          ) : (
            <div className="abrir-caixa-form">
              <label>Valor de abertura (R$):</label>
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
    <div className="caixa">
      {mensagem && <div className="caixa-success">{mensagem}</div>}
      {error && <div className="caixa-error">{error}</div>}

      <div className="caixa-header">
        <div>
          <h1>💰 Caixa</h1>
          <p>Aberto desde {new Date(caixa.opened_at).toLocaleString('pt-BR')}</p>
          <p>Valor de abertura: <strong>R$ {Number(caixa.opening_amount).toFixed(2)}</strong></p>
        </div>
        <button className="btn-fechar-caixa" onClick={() => setShowFechar(true)}>
          🔒 Fechar Caixa
        </button>
      </div>

      <div className="pdv-layout">
        {/* COLUNA ESQUERDA — PRODUTOS */}
        <div className="pdv-produtos">
          <input
            className="pdv-busca"
            placeholder="🔍 Buscar produto por nome ou SKU..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="pdv-produtos-grid">
            {produtosFiltrados.slice(0, 30).map(p => (
              <button
                key={p.id}
                className="pdv-produto-card"
                onClick={() => adicionarAoCarrinho(p)}
                disabled={Number(p.quantity) <= 0}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} />
                ) : (
                  <div className="pdv-produto-sem-img">📦</div>
                )}
                <span className="pdv-produto-nome">{p.name}</span>
                <span className="pdv-produto-preco">R$ {Number(p.price).toFixed(2)}</span>
                <span className="pdv-produto-estoque">Estoque: {Number(p.quantity)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA — CARRINHO */}
        <div className="pdv-carrinho">
          <h2>🛒 Carrinho</h2>

          {carrinho.length === 0 ? (
            <p className="carrinho-vazio">Clique nos produtos para adicionar</p>
          ) : (
            <div className="carrinho-itens">
              {carrinho.map(i => (
                <div key={i.product_id} className="carrinho-item">
                  <div className="carrinho-item-info">
                    <strong>{i.product_name}</strong>
                    <small>R$ {Number(i.unit_price).toFixed(2)} cada</small>
                  </div>
                  <div className="carrinho-item-qtd">
                    <button onClick={() => alterarQuantidade(i.product_id, -1)}>−</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => alterarQuantidade(i.product_id, 1)}>+</button>
                  </div>
                  <div className="carrinho-item-subtotal">
                    R$ {Number(i.subtotal).toFixed(2)}
                  </div>
                  <button className="carrinho-item-remover" onClick={() => removerDoCarrinho(i.product_id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          {carrinho.length > 0 && (
            <div className="carrinho-totais">
              <div className="campo-grupo">
                <label>Cliente (opcional)</label>
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
              </div>
              <div className="campo-grupo">
                <label>Desconto (R$)</label>
                <input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="totais-linha">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="totais-linha">
                <span>Desconto:</span>
                <span>- R$ {Number(discount || 0).toFixed(2)}</span>
              </div>
              <div className="totais-linha total-final">
                <span>TOTAL:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>

              <div className="campo-grupo">
                <label>Forma de pagamento</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="CASH">💵 Dinheiro</option>
                  <option value="CARD">💳 Cartão</option>
                  <option value="PIX">📱 PIX</option>
                </select>
              </div>

              {paymentMethod === 'CASH' && (
                <>
                  <div className="campo-grupo">
                    <label>Valor recebido (R$)</label>
                    <input type="number" step="0.01" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={total.toFixed(2)} />
                  </div>
                  {Number(amountPaid) >= total && (
                    <div className="totais-linha troco">
                      <span>Troco:</span>
                      <span>R$ {troco.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              <button className="btn-finalizar" onClick={handleFinalizarVenda}>
                ✅ FINALIZAR VENDA
              </button>
              <button className="btn-cancelar" onClick={limparCarrinho}>
                Cancelar
              </button>
            </div>
          )}
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

      {/* MODAL RECIBO */}
      {showRecibo && (
        <div className="modal-overlay" onClick={() => setShowRecibo(null)}>
          <div className="modal-content recibo" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Venda #{showRecibo.id}</h2>
            <p><strong>Cliente:</strong> {showRecibo.customer_name || 'Não informado'}</p>
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
