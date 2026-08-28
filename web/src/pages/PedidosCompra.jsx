import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './PedidosCompra.css';

const STATUS = {
  PENDING: {
    label: 'Pendente',
    className: 'status-pending',
  },
  SENT: {
    label: 'Enviado',
    className: 'status-sent',
  },
  CONFIRMED: {
    label: 'Confirmado pelo fornecedor',
    className: 'status-confirmed',
  },
  RECEIVED: {
    label: 'Recebido',
    className: 'status-received',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'status-cancelled',
  },
};

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function dataFormatada(data) {
  if (!data) return '-';

  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function imagemProduto(produto) {
  if (produto?.image_data) return produto.image_data;
  if (produto?.image_url) return produto.image_url;
  return null;
}

export default function PedidosCompra() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [modalDetalhes, setModalDetalhes] = useState(false);

  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const carregarPedidos = useCallback(async () => {
    try {
      setLoading(true);
      setErro('');

      const params = {};

      if (filtroStatus) {
        params.status = filtroStatus;
      }

      const response = await api.get('/pedidos-compra', { params });

      setPedidos(response.data?.data || []);
    } catch (error) {
      console.error(error);
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar os pedidos de compra.'
      );
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrados = !termo
      ? [...pedidos]
      : pedidos.filter((pedido) => {
          return (
            String(pedido.order_number || '')
              .toLowerCase()
              .includes(termo) ||

            String(pedido.supplier || '')
              .toLowerCase()
              .includes(termo) ||

            String(pedido.note || '')
              .toLowerCase()
              .includes(termo)
          );
        });

    // Pedidos cancelados sempre ficam no final.
    // Dentro de cada grupo, os mais recentes aparecem primeiro.
    filtrados.sort((a, b) => {
      const canceladoA =
        a.status === 'CANCELLED' ? 1 : 0;

      const canceladoB =
        b.status === 'CANCELLED' ? 1 : 0;

      if (canceladoA !== canceladoB) {
        return canceladoA - canceladoB;
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    return filtrados;
  }, [pedidos, busca]);

  async function abrirDetalhes(id) {
    try {
      setErro('');

      const response = await api.get(`/pedidos-compra/${id}`);

      setPedidoSelecionado(response.data?.data || null);
      setModalDetalhes(true);
    } catch (error) {
      console.error(error);

      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar os detalhes do pedido.'
      );
    }
  }

  async function enviarPedido(id) {
    try {
      setAlterandoStatus(true);
      setErro('');

      const response = await api.patch(
        `/pedidos-compra/${id}/enviar`
      );

      setPedidos((atual) =>
        atual.map((pedido) =>
          pedido.id === id
            ? { ...pedido, ...response.data.data }
            : pedido
        )
      );

      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado((atual) =>
          atual
            ? { ...atual, ...response.data.data }
            : atual
        );
      }

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível enviar o pedido ao fornecedor.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function confirmarFornecedor(id) {
    try {
      setAlterandoStatus(true);
      setErro('');

      const response = await api.patch(
        `/pedidos-compra/${id}/confirmar`
      );

      setPedidos((atual) =>
        atual.map((pedido) =>
          pedido.id === id
            ? { ...pedido, ...response.data.data }
            : pedido
        )
      );

      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado((atual) =>
          atual
            ? { ...atual, ...response.data.data }
            : atual
        );
      }

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível registrar a confirmação do fornecedor.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function receberPedido(id) {
    try {
      setAlterandoStatus(true);
      setErro('');

      const response = await api.patch(
        `/pedidos-compra/${id}/receber`
      );

      setPedidos((atual) =>
        atual.map((pedido) =>
          pedido.id === id
            ? { ...pedido, ...response.data.data }
            : pedido
        )
      );

      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado((atual) =>
          atual
            ? { ...atual, ...response.data.data }
            : atual
        );
      }

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível registrar o recebimento.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function cancelarPedido(id) {
    if (
      !window.confirm(
        'Cancelar este pedido de compra?\\n\\n' +
        'Essa ação não poderá ser desfeita.'
      )
    ) {
      return;
    }

    try {
      setAlterandoStatus(true);
      setErro('');

      const response = await api.patch(
        `/pedidos-compra/${id}/cancelar`
      );

      setPedidos((atual) =>
        atual.map((pedido) =>
          pedido.id === id
            ? { ...pedido, ...response.data.data }
            : pedido
        )
      );

      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado((atual) =>
          atual
            ? { ...atual, ...response.data.data }
            : atual
        );
      }

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível cancelar o pedido.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function editarPedido(id) {
    try {
      setAlterandoStatus(true);
      setErro('');

      const response = await api.get(
        `/pedidos-compra/${id}`
      );

      const pedido = response.data?.data;

      if (!pedido) {
        throw new Error('Pedido não encontrado.');
      }

      if (pedido.status !== 'PENDING') {
        setErro(
          'Somente pedidos pendentes podem ser editados diretamente.'
        );
        return;
      }

      const fornecedoresResponse =
        await api.get('/fornecedores', {
          params: { status: 'ACTIVE' }
        });

      const fornecedores =
        fornecedoresResponse.data?.fornecedores || [];

      let fornecedorId =
        String(pedido.supplier_id || '');

      const listaFornecedores =
        fornecedores
          .map(
            (f) =>
              `${f.id} - ${
                f.trade_name ||
                f.legal_name
              }`
          )
          .join('\n');

      const fornecedorDigitado =
        window.prompt(
          `Fornecedor atual: ${
            pedido.supplier || 'Não informado'
          }\n\nFornecedores disponíveis:\n${listaFornecedores}\n\nDigite o ID do novo fornecedor ou pressione Enter para manter:`,
          fornecedorId
        );

      if (fornecedorDigitado === null) {
        return;
      }

      if (fornecedorDigitado.trim()) {
        fornecedorId =
          fornecedorDigitado.trim();
      }

      if (!fornecedorId) {
        setErro(
          'Selecione um fornecedor antes de salvar a edição.'
        );
        return;
      }

      const novosItens = [];

      for (const item of pedido.items || []) {

        const resposta =
          window.prompt(
            `Quantidade de "${item.product_name}"\nSKU: ${item.sku || '-'}\nCódigo: ${item.barcode || '-'}\n\nDigite a nova quantidade:`,
            String(item.quantity)
          );

        if (resposta === null) {
          return;
        }

        const quantidade =
          Number(resposta);

        if (
          !Number.isFinite(quantidade) ||
          quantidade <= 0
        ) {
          setErro(
            `Quantidade inválida para ${item.product_name}.`
          );
          return;
        }

        novosItens.push({
          product_id: item.product_id,
          quantity: quantidade
        });
      }

      const novaObservacao =
        window.prompt(
          'Observação do pedido:',
          pedido.note || ''
        );

      if (novaObservacao === null) {
        return;
      }

      const update = await api.put(
        `/pedidos-compra/${id}`,
        {
          supplier_id:
            Number(fornecedorId),
          note: novaObservacao.trim() || null,
          invoice_number:
            pedido.invoice_number || null,
          items: novosItens
        }
      );

      setPedidos((atual) =>
        atual.map((item) =>
          item.id === id
            ? {
                ...item,
                ...update.data.data,
                total_items:
                  novosItens.length,
                total_quantity:
                  novosItens.reduce(
                    (total, item) =>
                      total +
                      Number(item.quantity),
                    0
                  )
              }
            : item
        )
      );

      if (pedidoSelecionado?.id === id) {
        setPedidoSelecionado((atual) =>
          atual
            ? {
                ...atual,
                ...update.data.data
              }
            : atual
        );
      }

    } catch (error) {
      console.error(error);

      setErro(
        error.response?.data?.message ||
        error.message ||
        'Não foi possível editar o pedido.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }


  async function solicitarCancelamento(id) {
    const motivo =
      window.prompt(
        'Informe o motivo da solicitação de cancelamento:'
      );

    if (motivo === null) {
      return;
    }

    if (!motivo.trim()) {
      setErro(
        'Informe o motivo do cancelamento.'
      );
      return;
    }

    try {
      setAlterandoStatus(true);
      setErro('');

      const response =
        await api.post(
          `/pedidos-compra/${id}/solicitar-cancelamento`,
          {
            reason: motivo.trim()
          }
        );

      setErro('');

      alert(
        response.data?.message ||
        'Solicitação de cancelamento enviada.'
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível solicitar o cancelamento.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }


  async function solicitarAlteracao(id) {
    try {
      setAlterandoStatus(true);
      setErro('');

      const response =
        await api.get(
          `/pedidos-compra/${id}`
        );

      const pedido =
        response.data?.data;

      if (!pedido) {
        throw new Error(
          'Pedido não encontrado.'
        );
      }

      const motivo =
        window.prompt(
          'Explique o que precisa ser alterado no pedido:'
        );

      if (motivo === null) {
        return;
      }

      if (!motivo.trim()) {
        setErro(
          'Informe o motivo da alteração.'
        );
        return;
      }

      const novosItens = [];

      for (const item of pedido.items || []) {

        const resposta =
          window.prompt(
            `Nova quantidade para "${item.product_name}"\nAtual: ${item.quantity}\n\nDigite a nova quantidade:`,
            String(item.quantity)
          );

        if (resposta === null) {
          return;
        }

        const quantidade =
          Number(resposta);

        if (
          !Number.isFinite(quantidade) ||
          quantidade <= 0
        ) {
          setErro(
            `Quantidade inválida para ${item.product_name}.`
          );
          return;
        }

        novosItens.push({
          product_id: item.product_id,
          quantity: quantidade
        });
      }

      const nota =
        window.prompt(
          'Nova observação do pedido:',
          pedido.note || ''
        );

      if (nota === null) {
        return;
      }

      await api.post(
        `/pedidos-compra/${id}/solicitar-alteracao`,
        {
          reason: motivo.trim(),
          supplier_id:
            Number(pedido.supplier_id),
          note: nota.trim() || null,
          items: novosItens
        }
      );

      alert(
        'Solicitação de alteração enviada ao fornecedor.'
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        error.message ||
        'Não foi possível solicitar a alteração.'
      );
    } finally {
      setAlterandoStatus(false);
    }
  }

  async function excluirPedido(pedido) {
    const confirmacao = window.confirm(
      `Excluir o pedido ${pedido.order_number || `#${pedido.id}`}?\n\n` +
      'Essa ação não poderá ser desfeita.'
    );

    if (!confirmacao) return;

    try {
      setExcluindo(true);
      setErro('');

      await api.delete(`/pedidos-compra/${pedido.id}`);

      if (pedidoSelecionado?.id === pedido.id) {
        setPedidoSelecionado(null);
        setModalDetalhes(false);
      }

      await carregarPedidos();
    } catch (error) {
      console.error(error);

      setErro(
        error.response?.data?.message ||
        'Não foi possível excluir o pedido.'
      );
    } finally {
      setExcluindo(false);
    }
  }

  function novoPedido() {
    navigate('/estoque-baixo');
  }

  if (loading) {
    return (
      <div className="pedidos-compra-loading">
        <div className="pedidos-spinner" />
        <p>Carregando pedidos de compra...</p>
      </div>
    );
  }

  return (
    <div className="pedidos-compra">

      <div className="pedidos-header">
        <div>
          <h1>Pedidos de Compra</h1>
          <p>
            Gerencie solicitações de reposição e acompanhe o recebimento
            dos produtos.
          </p>
        </div>

        <button
          className="btn-novo-pedido"
          onClick={novoPedido}
        >
          <span>＋</span>
          Novo pedido
        </button>
      </div>

      {erro && (
        <div className="pedidos-alerta">
          <span>⚠</span>
          <span>{erro}</span>
          <button onClick={() => setErro('')}>×</button>
        </div>
      )}

      <div className="pedidos-resumo">

        <div className="resumo-card">
          <div className="resumo-icone">📋</div>
          <div>
            <span>Total de pedidos</span>
            <strong>{pedidos.length}</strong>
          </div>
        </div>

        <div className="resumo-card">
          <div className="resumo-icone pendente">⏳</div>
          <div>
            <span>Pendentes</span>
            <strong>
              {pedidos.filter(p => p.status === 'PENDING').length}
            </strong>
          </div>
        </div>

        <div className="resumo-card">
          <div className="resumo-icone enviado">🚚</div>
          <div>
            <span>Enviados</span>
            <strong>
              {pedidos.filter(p => p.status === 'SENT').length}
            </strong>
          </div>
        </div>

        <div className="resumo-card">
          <div className="resumo-icone recebido">✓</div>
          <div>
            <span>Recebidos</span>
            <strong>
              {pedidos.filter(p => p.status === 'RECEIVED').length}
            </strong>
          </div>
        </div>

      </div>

      <div className="pedidos-toolbar">

        <div className="campo-busca">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Buscar por pedido, fornecedor ou observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {busca && (
            <button
              className="limpar-busca"
              onClick={() => setBusca('')}
            >
              ×
            </button>
          )}
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="SENT">Enviados ao fornecedor</option>
          <option value="CONFIRMED">Confirmados pelo fornecedor</option>
          <option value="RECEIVED">Recebidos</option>
          <option value="CANCELLED">Cancelados</option>
        </select>

        <button
          className="btn-atualizar"
          onClick={carregarPedidos}
          title="Atualizar"
        >
          ↻
        </button>

      </div>

      <div className="pedidos-content">

        {pedidosFiltrados.length === 0 ? (

          <div className="pedidos-vazio">

            <div className="vazio-icone">📦</div>

            <h2>
              {pedidos.length === 0
                ? 'Nenhum pedido de compra'
                : 'Nenhum pedido encontrado'}
            </h2>

            <p>
              {pedidos.length === 0
                ? 'Quando você gerar uma solicitação de reposição, ela aparecerá aqui.'
                : 'Tente alterar os filtros ou o termo de busca.'}
            </p>

            {pedidos.length === 0 && (
              <button
                className="btn-vazio"
                onClick={novoPedido}
              >
                Gerar pedido de reposição
              </button>
            )}

          </div>

        ) : (

          <div className="pedidos-tabela-wrapper">

            <table className="pedidos-tabela">

              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fornecedor</th>
                  <th>Itens</th>
                  <th>Quantidade</th>
                  <th>Valor estimado</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {pedidosFiltrados.map((pedido) => {

                  const status =
                    STATUS[pedido.status] || {
                      label: pedido.status || 'Desconhecido',
                      className: '',
                    };

                  return (
                    <tr key={pedido.id}>

                      <td>
                        <button
                          className="numero-pedido"
                          onClick={() => abrirDetalhes(pedido.id)}
                        >
                          {pedido.order_number || `#${pedido.id}`}
                        </button>
                      </td>

                      <td>
                        <span className="fornecedor">
                          {pedido.supplier || 'Não informado'}
                        </span>
                      </td>

                      <td>
                        {Number(pedido.total_items || 0)}
                      </td>

                      <td>
                        {Number(pedido.total_quantity || 0)}
                      </td>

                      <td>
                        <strong>
                          {moeda(pedido.estimated_total)}
                        </strong>
                      </td>

                      <td>
                        {dataFormatada(pedido.created_at)}
                      </td>

                      <td>
                        <span className={`status-badge ${status.className}`}>
                          <span className="status-dot" />
                          {status.label}
                        </span>
                      </td>

                      <td>

                        <div className="acoes-pedido">

                          <button
                            className="acao-btn visualizar"
                            title="Visualizar pedido"
                            onClick={() => abrirDetalhes(pedido.id)}
                          >
                            👁 Ver
                          </button>

                          {pedido.status === 'PENDING' && (
                            <>
                              <button
                                className="acao-btn"
                                title="Editar pedido"
                                onClick={() =>
                                  editarPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                ✏️ Editar
                              </button>

                              <button
                                className="acao-btn"
                                title="Enviar pedido ao fornecedor"
                                onClick={() =>
                                  enviarPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                🚚 Enviar
                              </button>

                              <button
                                className="acao-btn cancelar"
                                title="Cancelar pedido"
                                onClick={() =>
                                  cancelarPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                × Cancelar
                              </button>
                            </>
                          )}

                          {pedido.status === 'SENT' && (
                            <>
                              <button
                                className="acao-btn"
                                title="Editar pedido antes da confirmação"
                                onClick={() =>
                                  editarPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                ✏️ Editar
                              </button>

                              <button
                                className="acao-btn"
                                title="Registrar confirmação do fornecedor"
                                onClick={() =>
                                  confirmarFornecedor(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                ✓ Confirmar
                              </button>

                              <button
                                className="acao-btn cancelar"
                                title="Cancelar pedido antes da confirmação"
                                onClick={() =>
                                  cancelarPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                × Cancelar
                              </button>
                            </>
                          )}

                          {pedido.status === 'CONFIRMED' && (
                            <>
                              <button
                                className="acao-btn recebido"
                                title="Registrar recebimento"
                                onClick={() =>
                                  receberPedido(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                📥 Receber
                              </button>

                              <button
                                className="acao-btn"
                                title="Solicitar alteração ao fornecedor"
                                onClick={() =>
                                  solicitarAlteracao(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                ✏️ Alterar
                              </button>

                              <button
                                className="acao-btn cancelar"
                                title="Solicitar cancelamento ao fornecedor"
                                onClick={() =>
                                  solicitarCancelamento(pedido.id)
                                }
                                disabled={alterandoStatus}
                              >
                                ↩ Cancelar
                              </button>
                            </>
                          )}

                          {pedido.status === 'RECEIVED' && (
                            <button
                              className="acao-btn"
                              title="Registrar devolução"
                              onClick={() =>
                                window.location.href =
                                  `/devolucoes?pedido=${pedido.id}`
                              }
                            >
                              ↩ Devolver
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

      </div>

      {modalDetalhes && pedidoSelecionado && (

        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setModalDetalhes(false);
            }
          }}
        >

          <div className="pedido-modal">

            <div className="modal-header">

              <div>
                <span className="modal-label">
                  Pedido de compra
                </span>

                <h2>
                  {pedidoSelecionado.order_number ||
                    `#${pedidoSelecionado.id}`}
                </h2>
              </div>

              <button
                className="modal-fechar"
                onClick={() => setModalDetalhes(false)}
              >
                ×
              </button>

            </div>

            <div className="modal-info">

              <div>
                <span>Fornecedor</span>
                <strong>
                  {pedidoSelecionado.supplier || 'Não informado'}
                </strong>
              </div>

              <div>
                <span>Data do pedido</span>
                <strong>
                  {dataFormatada(pedidoSelecionado.created_at)}
                </strong>
              </div>

              <div>
                <span>Status</span>

                <strong>
                  <span
                    className={`status-badge ${
                      STATUS[pedidoSelecionado.status]?.className || ''
                    }`}
                  >
                    <span className="status-dot" />
                    {STATUS[pedidoSelecionado.status]?.label ||
                      pedidoSelecionado.status}
                  </span>
                </strong>
              </div>

            </div>

            {pedidoSelecionado.note && (
              <div className="modal-observacao">
                <span>Observação</span>
                <p>{pedidoSelecionado.note}</p>
              </div>
            )}

            <div className="modal-section-title">
              <h3>Produtos do pedido</h3>
              <span>
                {pedidoSelecionado.items?.length || 0} produto(s)
              </span>
            </div>

            <div className="modal-itens">

              {(pedidoSelecionado.items || []).map((item) => {

                const imagem = imagemProduto(item);

                return (
                  <div
                    className="modal-item"
                    key={item.id}
                  >

                    <div className="produto-imagem">

                      {imagem ? (
                        <img
                          src={imagem}
                          alt={item.product_name}
                        />
                      ) : (
                        <span>📦</span>
                      )}

                    </div>

                    <div className="produto-info">

                      <strong>
                        {item.product_name}
                      </strong>

                      <span>
                        SKU: {item.sku || '-'}
                      </span>

                      {item.barcode && (
                        <span>
                          Código: {item.barcode}
                        </span>
                      )}

                    </div>

                    <div className="produto-estoque">
                      <span>Estoque atual</span>
                      <strong>
                        {Number(item.current_quantity || 0)}
                      </strong>
                    </div>

                    <div className="produto-quantidade">
                      <span>Solicitado</span>
                      <strong>
                        {Number(item.quantity || 0)}
                      </strong>
                    </div>

                    <div className="produto-valor">
                      <span>Subtotal</span>
                      <strong>
                        {moeda(
                          Number(item.quantity || 0) *
                          Number(item.price || 0)
                        )}
                      </strong>
                    </div>

                  </div>
                );
              })}

            </div>

            <div className="modal-total">

              <span>Valor estimado do pedido</span>

              <strong>
                {moeda(pedidoSelecionado.total)}
              </strong>

            </div>

            <div className="modal-footer">

              <div className="modal-status-actions">

                {pedidoSelecionado.status === 'PENDING' && (
                  <button
                    className="btn-modal btn-enviar"
                    onClick={() =>
                      alterarStatus(
                        pedidoSelecionado.id,
                        'SENT'
                      )
                    }
                    disabled={alterandoStatus}
                  >
                    🚚 Marcar como enviado
                  </button>
                )}

                {pedidoSelecionado.status === 'PENDING' && (
                  <>
                    <button
                      className="btn-modal"
                      onClick={() =>
                        editarPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      ✏️ Editar pedido
                    </button>

                    <button
                      className="btn-modal btn-enviar"
                      onClick={() =>
                        enviarPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      🚚 Enviar ao fornecedor
                    </button>

                    <button
                      className="btn-modal btn-cancelar"
                      onClick={() =>
                        cancelarPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      × Cancelar pedido
                    </button>
                  </>
                )}

                {pedidoSelecionado.status === 'SENT' && (
                  <>
                    <button
                      className="btn-modal"
                      onClick={() =>
                        editarPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      ✏️ Editar pedido
                    </button>

                    <button
                      className="btn-modal btn-confirmar"
                      onClick={() =>
                        confirmarFornecedor(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      ✓ Registrar confirmação do fornecedor
                    </button>

                    <button
                      className="btn-modal btn-cancelar"
                      onClick={() =>
                        cancelarPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      × Cancelar pedido
                    </button>
                  </>
                )}

                {pedidoSelecionado.status === 'CONFIRMED' && (
                  <>
                    <button
                      className="btn-modal btn-receber"
                      onClick={() =>
                        receberPedido(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      📥 Registrar recebimento
                    </button>

                    <button
                      className="btn-modal"
                      onClick={() =>
                        solicitarAlteracao(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      ✏️ Alterar
                    </button>

                    <button
                      className="btn-modal btn-cancelar"
                      onClick={() =>
                        solicitarCancelamento(
                          pedidoSelecionado.id
                        )
                      }
                      disabled={alterandoStatus}
                    >
                      ↩ Cancelar
                    </button>
                  </>
                )}

                {pedidoSelecionado.status === 'RECEIVED' && (
                  <button
                    className="btn-modal"
                    onClick={() =>
                      window.location.href =
                        `/devolucoes?pedido=${pedidoSelecionado.id}`
                    }
                  >
                    ↩ Devolver
                  </button>
                )}

              </div>

              <button
                className="btn-modal btn-fechar"
                onClick={() => setModalDetalhes(false)}
              >
                Fechar
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
