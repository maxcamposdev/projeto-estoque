import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Transferencias.css';

const STATUS = {
  PENDING: ['Pendente', 'transfer-status-pending'],
  APPROVED: ['Aprovada / Reservada', 'transfer-status-approved'],
  SHIPPED: ['Enviada', 'transfer-status-shipped'],
  PARTIAL: ['Recebimento parcial', 'transfer-status-partial'],
  RECEIVED: ['Recebida', 'transfer-status-received'],
  REJECTED: ['Recusada', 'transfer-status-rejected'],
  CANCELLED: ['Cancelada', 'transfer-status-rejected'],
};

export default function Transferencias() {
  const [unidades, setUnidades] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [origem, setOrigem] = useState('');
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [itens, setItens] = useState([]);
  const [observacao, setObservacao] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [processando, setProcessando] = useState(null);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);

      const [u, p] = await Promise.all([
        api.get('/transferencias/unidades'),
        api.get('/transferencias'),
      ]);

      setUnidades(u.data.unidades || []);
      setPedidos(p.data.data || []);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível carregar as transferências.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function pesquisar() {
    if (!origem || !busca.trim()) {
      setProdutos([]);
      return;
    }

    try {
      setBuscando(true);

      const { data } = await api.get('/transferencias/estoque', {
        params: {
          unit_id: origem,
          busca: busca.trim(),
        },
      });

      setProdutos(data.produtos || []);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível consultar o estoque da unidade.'
      );
    } finally {
      setBuscando(false);
    }
  }

  function adicionar(produto) {
    const existente = itens.find(
      (item) => item.product_id === produto.product_id
    );

    if (existente) {
      return;
    }

    setItens((atual) => [
      ...atual,
      {
        product_id: produto.product_id,
        name: produto.name,
        sku: produto.sku,
        barcode: produto.barcode,
        available_quantity: Number(produto.available_quantity),
        quantity: 1,
      },
    ]);

    setBusca('');
    setProdutos([]);
  }

  function alterarQuantidade(id, valor) {
    const numero = Math.max(1, Number(valor) || 1);

    setItens((atual) =>
      atual.map((item) =>
        item.product_id === id
          ? {
              ...item,
              quantity: Math.min(
                numero,
                item.available_quantity
              ),
            }
          : item
      )
    );
  }

  function remover(id) {
    setItens((atual) =>
      atual.filter((item) => item.product_id !== id)
    );
  }

  async function criarSolicitacao(e) {
    e.preventDefault();

    if (!origem) {
      setErro('Selecione a loja de origem.');
      return;
    }

    if (itens.length === 0) {
      setErro('Adicione pelo menos um produto.');
      return;
    }

    if (
      itens.some(
        (item) =>
          item.quantity > item.available_quantity
      )
    ) {
      setErro(
        'A quantidade solicitada não pode ser maior que o estoque disponível.'
      );
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      setSucesso('');

      const { data } = await api.post(
        '/transferencias',
        {
          origin_unit_id: Number(origem),
          items: itens.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          note: observacao.trim() || null,
        }
      );

      setSucesso(data.message);
      setOrigem('');
      setBusca('');
      setItens([]);
      setObservacao([]);

      await carregar();

    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível criar a solicitação.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function executar(id, acao) {
    try {
      setProcessando(`${acao}-${id}`);
      setErro('');
      setSucesso('');

      if (acao === 'receber') {
        const pedido = pedidos.find(
          (item) => item.id === id
        );

        if (!pedido) return;

        const items = pedido.items.map((item) => {
          const restante =
            Number(item.quantity_approved) -
            Number(item.quantity_received);

          return {
            item_id: item.id,
            quantity_received: restante
          };
        });

        await api.patch(
          `/transferencias/${id}/receber`,
          { items }
        );
      } else {
        await api.patch(
          `/transferencias/${id}/${acao}`
        );
      }

      await carregar();

      setSucesso(
        acao === 'aprovar'
          ? 'Solicitação aprovada e estoque reservado.'
          : acao === 'recusar'
            ? 'Solicitação recusada.'
            : acao === 'enviar'
              ? 'Transferência marcada como enviada.'
              : 'Recebimento confirmado.'
      );

    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível processar a solicitação.'
      );
    } finally {
      setProcessando(null);
    }
  }

  const pedidosOrdenados = useMemo(
    () => pedidos,
    [pedidos]
  );

  if (carregando) {
    return (
      <div className="transferencias-loading">
        <div className="spinner" />
        <p>Carregando transferências...</p>
      </div>
    );
  }

  return (
    <div className="transferencias">

      <div className="transferencias-header">
        <div>
          <h1>🔄 Transferências entre lojas</h1>
          <p>
            Consulte o estoque de outras unidades e solicite reservas
            sem alterar diretamente o estoque delas.
          </p>
        </div>
      </div>

      {erro && (
        <div className="transfer-message transfer-error">
          ⚠️ {erro}
        </div>
      )}

      {sucesso && (
        <div className="transfer-message transfer-success">
          ✓ {sucesso}
        </div>
      )}

      <section className="transfer-card">

        <div className="transfer-card-header">
          <div>
            <h2>Solicitar produto de outra loja</h2>
            <p>
              A unidade de origem precisa aprovar a solicitação
              antes que o estoque seja reservado.
            </p>
          </div>
        </div>

        <form onSubmit={criarSolicitacao}>

          <div className="transfer-form-grid">

            <div className="transfer-field">
              <label>Loja de origem *</label>

              <select
                value={origem}
                onChange={(e) => {
                  setOrigem(e.target.value);
                  setProdutos([]);
                  setBusca('');
                }}
                required
              >
                <option value="">
                  Selecione a loja
                </option>

                {unidades.map((unidade) => (
                  <option
                    key={unidade.id}
                    value={unidade.id}
                  >
                    {unidade.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="transfer-field">
              <label>Pesquisar produto</label>

              <div className="transfer-search">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      pesquisar();
                    }
                  }}
                  placeholder="Nome, SKU ou código de barras..."
                  disabled={!origem}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={pesquisar}
                  disabled={!origem || buscando}
                >
                  {buscando ? 'Buscando...' : 'Pesquisar'}
                </button>
              </div>
            </div>

          </div>

          {produtos.length > 0 && (
            <div className="transfer-resultados">

              {produtos.map((produto) => (
                <button
                  type="button"
                  key={produto.product_id}
                  className="transfer-produto"
                  onClick={() => adicionar(produto)}
                  disabled={
                    itens.some(
                      (item) =>
                        item.product_id === produto.product_id
                    )
                  }
                >

                  <div>
                    <strong>{produto.name}</strong>

                    <span>
                      SKU: {produto.sku || '—'}
                      {' · '}
                      Código: {produto.barcode || '—'}
                    </span>
                  </div>

                  <div className="transfer-disponivel">
                    <small>Disponível</small>
                    <strong>
                      {Number(produto.available_quantity)}
                    </strong>
                  </div>

                  <span>
                    {itens.some(
                      (item) =>
                        item.product_id === produto.product_id
                    )
                      ? '✓ Adicionado'
                      : '+ Adicionar'}
                  </span>

                </button>
              ))}

            </div>
          )}

          {itens.length > 0 && (
            <div className="transfer-itens">

              <h3>Produtos solicitados</h3>

              {itens.map((item) => (
                <div
                  className="transfer-item"
                  key={item.product_id}
                >

                  <div className="transfer-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      SKU: {item.sku || '—'}
                      {' · '}
                      Código: {item.barcode || '—'}
                    </span>
                    <small>
                      Disponível na origem:
                      {' '}
                      {item.available_quantity}
                    </small>
                  </div>

                  <input
                    type="number"
                    min="1"
                    max={item.available_quantity}
                    value={item.quantity}
                    onChange={(e) =>
                      alterarQuantidade(
                        item.product_id,
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() =>
                      remover(item.product_id)
                    }
                  >
                    Remover
                  </button>

                </div>
              ))}

              <div className="transfer-field">
                <label>Observação</label>

                <textarea
                  value={observacao}
                  onChange={(e) =>
                    setObservacao(e.target.value)
                  }
                  rows="3"
                  placeholder="Ex.: Reposição urgente para atendimento ao cliente."
                />
              </div>

              <div className="transfer-submit">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={salvando}
                >
                  {salvando
                    ? 'Enviando solicitação...'
                    : '🔄 Solicitar reserva'}
                </button>
              </div>

            </div>
          )}

        </form>
      </section>

      <section className="transfer-card">

        <div className="transfer-card-header">
          <div>
            <h2>Solicitações de transferência</h2>
            <p>
              Acompanhe solicitações enviadas e recebidas pela sua unidade.
            </p>
          </div>
        </div>

        {pedidosOrdenados.length === 0 ? (
          <div className="transfer-empty">
            Nenhuma solicitação de transferência registrada.
          </div>
        ) : (
          <div className="transfer-tabela-wrapper">

            <table className="transfer-tabela">

              <thead>
                <tr>
                  <th>Solicitação</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Itens</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {pedidosOrdenados.map((pedido) => {

                  const [label, classe] =
                    STATUS[pedido.status] || [
                      pedido.status,
                      '',
                    ];

                  return (
                    <tr key={pedido.id}>

                      <td>
                        <strong>
                          {pedido.request_number ||
                            `#${pedido.id}`}
                        </strong>
                      </td>

                      <td>{pedido.origin_unit_name}</td>
                      <td>{pedido.destination_unit_name}</td>

                      <td>
                        {pedido.items.length}
                      </td>

                      <td>
                        <span
                          className={`transfer-status ${classe}`}
                        >
                          {label}
                        </span>
                      </td>

                      <td>
                        {new Date(
                          pedido.created_at
                        ).toLocaleString('pt-BR')}
                      </td>

                      <td>
                        <div className="transfer-acoes">

                          {pedido.status === 'PENDING' && (
                            <>
                              <button
                                className="btn-action btn-approve"
                                onClick={() =>
                                  executar(
                                    pedido.id,
                                    'aprovar'
                                  )
                                }
                                disabled={
                                  processando ===
                                  `aprovar-${pedido.id}`
                                }
                              >
                                Aprovar
                              </button>

                              <button
                                className="btn-action btn-reject"
                                onClick={() =>
                                  executar(
                                    pedido.id,
                                    'recusar'
                                  )
                                }
                                disabled={
                                  processando ===
                                  `recusar-${pedido.id}`
                                }
                              >
                                Recusar
                              </button>

                              <button
                                className="btn-action btn-cancel-transfer"
                                onClick={async () => {
                                  if (
                                    !window.confirm(
                                      'Cancelar esta solicitação de transferência?'
                                    )
                                  ) {
                                    return;
                                  }

                                  try {
                                    setProcessando(
                                      `cancelar-${pedido.id}`
                                    );
                                    setErro('');

                                    await api.patch(
                                      `/transferencias/${pedido.id}/cancelar`
                                    );

                                    await carregar();
                                    setSucesso(
                                      'Solicitação de transferência cancelada.'
                                    );
                                  } catch (err) {
                                    setErro(
                                      err.response?.data?.message ||
                                      'Não foi possível cancelar a solicitação.'
                                    );
                                  } finally {
                                    setProcessando(null);
                                  }
                                }}
                                disabled={
                                  processando ===
                                  `cancelar-${pedido.id}`
                                }
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          {pedido.status === 'APPROVED' && (
                            <button
                              className="btn-action btn-send"
                              onClick={() =>
                                executar(
                                  pedido.id,
                                  'enviar'
                                )
                              }
                            >
                              Marcar como enviada
                            </button>
                          )}

                          {pedido.status === 'SHIPPED' && (
                            <button
                              className="btn-action btn-receive"
                              onClick={() =>
                                executar(
                                  pedido.id,
                                  'receber'
                                )
                              }
                              disabled={
                                processando ===
                                `receber-${pedido.id}`
                              }
                            >
                              Confirmar recebimento
                            </button>
                          )}

                          {(pedido.status === 'PARTIAL') && (
                            <button
                              className="btn-action btn-receive"
                              onClick={() =>
                                executar(
                                  pedido.id,
                                  'receber'
                                )
                              }
                            >
                              Continuar recebimento
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>
          </div>
        )}

      </section>

    </div>
  );
}
