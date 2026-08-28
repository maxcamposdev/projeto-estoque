import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import './Devolucoes.css';

const MOTIVOS = [
  ['DAMAGED', 'Mercadoria avariada'],
  ['EXPIRED', 'Produto vencido'],
  ['WRONG_PRODUCT', 'Produto incorreto'],
  ['QUANTITY_DIVERGENCE', 'Quantidade divergente'],
  ['QUALITY', 'Problema de qualidade'],
  ['OTHER', 'Outro'],
];

const STATUS = {
  PENDING: ['Pendente', 'dev-status-pending'],
  SENT: ['Enviada ao fornecedor', 'dev-status-sent'],
  RECEIVED: ['Recebida pelo fornecedor', 'dev-status-received'],
  CANCELLED: ['Cancelada', 'dev-status-cancelled'],
};

export default function Devolucoes() {
  const [searchParams] = useSearchParams();

  const [devolucoes, setDevolucoes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  const [itens, setItens] = useState({});
  const [pedidoId, setPedidoId] = useState(
    searchParams.get('pedido') || ''
  );

  const [nota, setNota] = useState('');
  const [numeroNota, setNumeroNota] = useState('');

  const [loading, setLoading] = useState(true);
  const [carregandoPedido, setCarregandoPedido] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregarDevolucoes = useCallback(async () => {
    try {
      const response = await api.get('/devolucoes');
      setDevolucoes(response.data?.data || []);
    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar as devoluções.'
      );
    }
  }, []);

  const carregarPedidosRecebidos = useCallback(async () => {
    try {
      const response = await api.get(
        '/pedidos-compra',
        { params: { status: 'RECEIVED' } }
      );

      setPedidos(response.data?.data || []);
    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar os pedidos recebidos.'
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([
      carregarDevolucoes(),
      carregarPedidosRecebidos()
    ]).finally(() => {
      setLoading(false);
    });
  }, [
    carregarDevolucoes,
    carregarPedidosRecebidos
  ]);

  async function carregarPedido(id) {
    if (!id) {
      setPedidoSelecionado(null);
      setItens({});
      return;
    }

    try {
      setCarregandoPedido(true);
      setErro('');

      const response = await api.get(
        `/pedidos-compra/${id}`
      );

      const pedido = response.data?.data;

      setPedidoSelecionado(pedido);

      const novo = {};

      (pedido?.items || []).forEach((item) => {
        novo[item.id] = {
          quantity: 0,
          reason: 'OTHER',
          note: ''
        };
      });

      setItens(novo);

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar o pedido.'
      );
    } finally {
      setCarregandoPedido(false);
    }
  }

  function selecionarPedido(id) {
    setPedidoId(id);
    carregarPedido(id);
  }

  function alterarItem(id, campo, valor) {
    setItens((atual) => ({
      ...atual,
      [id]: {
        ...atual[id],
        [campo]: valor
      }
    }));
  }

  const itensSelecionados = useMemo(() => {
    if (!pedidoSelecionado) return [];

    return (pedidoSelecionado.items || [])
      .map((item) => ({
        purchase_order_item_id: item.id,
        product_id: item.product_id,
        quantity: Number(
          itens[item.id]?.quantity || 0
        ),
        reason:
          itens[item.id]?.reason || 'OTHER',
        note:
          itens[item.id]?.note || null
      }))
      .filter((item) => item.quantity > 0);
  }, [pedidoSelecionado, itens]);

  async function criarDevolucao() {
    setErro('');
    setSucesso('');

    if (!pedidoSelecionado) {
      setErro(
        'Selecione um pedido recebido antes de criar a devolução.'
      );
      return;
    }

    if (itensSelecionados.length === 0) {
      setErro(
        'Informe a quantidade de pelo menos um produto para devolver.'
      );
      return;
    }

    const limiteExcedido = itensSelecionados.some(
      (item) => {
        const original =
          pedidoSelecionado.items.find(
            (x) => x.id === item.purchase_order_item_id
          );

        return (
          Number(item.quantity) >
          Number(original?.received_quantity || original?.quantity || 0)
        );
      }
    );

    if (limiteExcedido) {
      setErro(
        'A quantidade devolvida não pode exceder a quantidade recebida.'
      );
      return;
    }

    try {
      setSalvando(true);

      await api.post('/devolucoes', {
        purchase_order_id: pedidoSelecionado.id,
        invoice_number: numeroNota.trim() || null,
        note: nota.trim() || null,
        items: itensSelecionados
      });

      setSucesso(
        'Solicitação de devolução criada com sucesso.'
      );

      setPedidoSelecionado(null);
      setPedidoId('');
      setItens({});
      setNota('');
      setNumeroNota('');

      await carregarDevolucoes();

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível criar a devolução.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function executar(id, acao) {
    const mensagens = {
      enviar:
        'Enviar esta devolução ao fornecedor? O estoque desta loja será reduzido.',
      cancelar:
        'Cancelar esta devolução?',
      confirmar:
        'Confirmar que o fornecedor recebeu a devolução?'
    };

    if (
      mensagens[acao] &&
      !window.confirm(mensagens[acao])
    ) {
      return;
    }

    try {
      setErro('');

      await api.patch(
        `/devolucoes/${id}/${acao === 'confirmar'
          ? 'confirmar-recebimento'
          : acao}`
      );

      await carregarDevolucoes();

      setSucesso(
        acao === 'enviar'
          ? 'Devolução enviada ao fornecedor.'
          : acao === 'confirmar'
            ? 'Recebimento da devolução confirmado.'
            : 'Devolução cancelada.'
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível atualizar a devolução.'
      );
    }
  }

  if (loading) {
    return (
      <div className="devolucoes-loading">
        <div className="pedidos-spinner" />
        <p>Carregando devoluções...</p>
      </div>
    );
  }

  return (
    <div className="devolucoes">

      <header className="devolucoes-header">
        <div>
          <h1>Devoluções</h1>
          <p>
            Registre mercadorias avariadas, vencidas,
            incorretas ou em desacordo com o pedido.
          </p>
        </div>
      </header>

      {erro && (
        <div className="dev-message dev-error">
          ⚠️ {erro}
        </div>
      )}

      {sucesso && (
        <div className="dev-message dev-success">
          ✓ {sucesso}
        </div>
      )}

      <section className="dev-card">

        <div className="dev-card-header">
          <div>
            <h2>Nova devolução</h2>
            <p>
              Somente pedidos já recebidos podem gerar devolução.
            </p>
          </div>
        </div>

        <div className="dev-form">

          <div className="dev-field">
            <label>Pedido de compra *</label>

            <select
              value={pedidoId}
              onChange={(e) =>
                selecionarPedido(e.target.value)
              }
            >
              <option value="">
                Selecione um pedido recebido
              </option>

              {pedidos.map((pedido) => (
                <option
                  key={pedido.id}
                  value={pedido.id}
                >
                  {pedido.order_number || `#${pedido.id}`}
                  {' — '}
                  {pedido.supplier || 'Fornecedor'}
                </option>
              ))}
            </select>
          </div>

          {carregandoPedido && (
            <div className="dev-loading-inline">
              Carregando produtos do pedido...
            </div>
          )}

          {pedidoSelecionado && (
            <>
              <div className="dev-order-info">
                <strong>
                  {pedidoSelecionado.order_number}
                </strong>

                <span>
                  Fornecedor: {pedidoSelecionado.supplier || '—'}
                </span>
              </div>

              <div className="dev-itens">

                {pedidoSelecionado.items?.map((item) => {

                  const estado =
                    itens[item.id] || {
                      quantity: 0,
                      reason: 'OTHER',
                      note: ''
                    };

                  return (
                    <div
                      className="dev-item"
                      key={item.id}
                    >
                      <div className="dev-item-info">
                        <strong>
                          {item.product_name}
                        </strong>

                        <span>
                          SKU: {item.sku || '—'}
                        </span>

                        <span>
                          Código: {item.barcode || '—'}
                        </span>

                        <span>
                          Recebido:{' '}
                          {Number(
                            item.received_quantity ||
                            item.quantity ||
                            0
                          )}
                        </span>
                      </div>

                      <div className="dev-item-fields">

                        <div>
                          <label>Devolver</label>

                          <input
                            type="number"
                            min="0"
                            max={
                              Number(
                                item.received_quantity ||
                                item.quantity ||
                                0
                              )
                            }
                            value={estado.quantity}
                            onChange={(e) =>
                              alterarItem(
                                item.id,
                                'quantity',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <label>Motivo</label>

                          <select
                            value={estado.reason}
                            onChange={(e) =>
                              alterarItem(
                                item.id,
                                'reason',
                                e.target.value
                              )
                            }
                          >
                            {MOTIVOS.map(
                              ([value, label]) => (
                                <option
                                  key={value}
                                  value={value}
                                >
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label>Observação do item</label>

                          <input
                            type="text"
                            value={estado.note}
                            onChange={(e) =>
                              alterarItem(
                                item.id,
                                'note',
                                e.target.value
                              )
                            }
                            placeholder="Opcional"
                          />
                        </div>

                      </div>
                    </div>
                  );
                })}

              </div>

              <div className="dev-fields-bottom">

                <div className="dev-field">
                  <label>Nota fiscal</label>
                  <input
                    value={numeroNota}
                    onChange={(e) =>
                      setNumeroNota(e.target.value)
                    }
                    placeholder="Opcional"
                  />
                </div>

                <div className="dev-field">
                  <label>Observação</label>
                  <textarea
                    value={nota}
                    onChange={(e) =>
                      setNota(e.target.value)
                    }
                    rows="3"
                    placeholder="Descreva o problema da mercadoria..."
                  />
                </div>

              </div>

              <div className="dev-actions">
                <button
                  className="dev-btn dev-btn-primary"
                  onClick={criarDevolucao}
                  disabled={salvando}
                >
                  {salvando
                    ? 'Registrando...'
                    : '↩ Registrar devolução'}
                </button>
              </div>

            </>
          )}

        </div>
      </section>

      <section className="dev-card">

        <div className="dev-card-header">
          <div>
            <h2>Histórico de devoluções</h2>
            <p>
              Acompanhe as devoluções e seus respectivos status.
            </p>
          </div>
        </div>

        {devolucoes.length === 0 ? (
          <div className="dev-empty">
            <strong>Nenhuma devolução registrada.</strong>
            <span>
              As devoluções criadas aparecerão aqui.
            </span>
          </div>
        ) : (
          <div className="dev-table-wrapper">

            <table className="dev-table">
              <thead>
                <tr>
                  <th>Devolução</th>
                  <th>Pedido</th>
                  <th>Fornecedor</th>
                  <th>Itens</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {devolucoes.map((dev) => {

                  const status =
                    STATUS[dev.status] || [
                      dev.status,
                      ''
                    ];

                  return (
                    <tr key={dev.id}>

                      <td>
                        <strong>
                          {dev.return_number ||
                            `DV-${dev.id}`}
                        </strong>
                      </td>

                      <td>
                        {dev.order_number || '—'}
                      </td>

                      <td>
                        {dev.supplier || '—'}
                      </td>

                      <td>
                        {Number(dev.total_quantity || 0)}
                      </td>

                      <td>
                        <span
                          className={`dev-status ${status[1]}`}
                        >
                          {status[0]}
                        </span>
                      </td>

                      <td>
                        {new Date(
                          dev.created_at
                        ).toLocaleDateString('pt-BR')}
                      </td>

                      <td>
                        <div className="dev-row-actions">

                          {dev.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() =>
                                  executar(
                                    dev.id,
                                    'enviar'
                                  )
                                }
                                className="dev-btn-small"
                              >
                                📤 Enviar
                              </button>

                              <button
                                onClick={() =>
                                  executar(
                                    dev.id,
                                    'cancelar'
                                  )
                                }
                                className="dev-btn-small dev-btn-danger"
                              >
                                × Cancelar
                              </button>
                            </>
                          )}

                          {dev.status === 'SENT' && (
                            <button
                              onClick={() =>
                                executar(
                                  dev.id,
                                  'confirmar'
                                )
                              }
                              className="dev-btn-small"
                            >
                              ✓ Confirmar recebimento
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
