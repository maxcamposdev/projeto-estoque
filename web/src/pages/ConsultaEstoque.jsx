import { useState } from 'react';
import api from '../services/api';
import './ConsultaEstoque.css';

export default function ConsultaEstoque() {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function pesquisar() {
    const termo = busca.trim();

    if (!termo) {
      setProdutos([]);
      return;
    }

    try {
      setLoading(true);
      setErro('');

      const response = await api.get(
        '/estoque-rede',
        {
          params: {
            busca: termo
          }
        }
      );

      setProdutos(
        response.data?.produtos || []
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível consultar os estoques.'
      );
    } finally {
      setLoading(false);
    }
  }

  function solicitar(item) {
    const quantidade =
      window.prompt(
        `Solicitar transferência\n\n` +
        `Produto: ${item.name}\n` +
        `Origem: ${item.unit_name}\n` +
        `Disponível: ${Number(item.available_quantity)}\n\n` +
        `Quantidade desejada:`,
        '1'
      );

    if (quantidade === null) {
      return;
    }

    const qtd = Number(quantidade);

    if (
      !Number.isFinite(qtd) ||
      qtd <= 0
    ) {
      setErro(
        'Informe uma quantidade válida.'
      );
      return;
    }

    if (
      qtd >
      Number(item.available_quantity)
    ) {
      setErro(
        'A quantidade solicitada é maior que o estoque disponível.'
      );
      return;
    }

    /*
     * A tela de Transferências existente será
     * usada para finalizar o fluxo.
     *
     * A origem e o produto ficam preservados
     * na URL para o próximo passo.
     */
    window.location.href =
      `/transferencias?origem=${item.unit_id}` +
      `&produto=${item.product_id}` +
      `&quantidade=${qtd}`;
  }

  return (
    <div className="consulta-estoque">

      <header className="consulta-header">
        <div>
          <h1>Consultar estoque entre lojas</h1>

          <p>
            Consulte a disponibilidade de produtos
            em outras unidades antes de solicitar uma transferência.
          </p>
        </div>
      </header>

      <section className="consulta-card">

        <div className="consulta-busca">

          <input
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                pesquisar();
              }
            }}
            placeholder="Nome, SKU ou código de barras..."
          />

          <button
            onClick={pesquisar}
            disabled={loading}
          >
            {loading
              ? 'Consultando...'
              : '🔎 Consultar'}
          </button>

        </div>

        {erro && (
          <div className="consulta-erro">
            ⚠️ {erro}
          </div>
        )}

        {loading ? (
          <div className="consulta-vazio">
            Consultando outras unidades...
          </div>
        ) : produtos.length === 0 ? (
          <div className="consulta-vazio">
            <strong>
              Consulte um produto
            </strong>
            <span>
              O sistema mostrará somente as outras lojas
              e o estoque disponível para transferência.
            </span>
          </div>
        ) : (

          <div className="consulta-tabela-wrapper">

            <table className="consulta-tabela">

              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Código de barras</th>
                  <th>Unidade</th>
                  <th>Estoque</th>
                  <th>Reservado</th>
                  <th>Disponível</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {produtos.map((item) => (
                  <tr
                    key={`${item.product_id}-${item.unit_id}`}
                  >
                    <td>
                      <strong>
                        {item.name}
                      </strong>
                    </td>

                    <td>
                      {item.sku || '—'}
                    </td>

                    <td className="consulta-barcode">
                      {item.barcode || '—'}
                    </td>

                    <td>
                      {item.unit_name}
                    </td>

                    <td>
                      {Number(item.quantity)}
                    </td>

                    <td>
                      {Number(item.reserved_quantity)}
                    </td>

                    <td>
                      <strong>
                        {Number(
                          item.available_quantity
                        )}
                      </strong>
                    </td>

                    <td>
                      <button
                        className="consulta-solicitar"
                        onClick={() =>
                          solicitar(item)
                        }
                        disabled={
                          Number(
                            item.available_quantity
                          ) <= 0
                        }
                      >
                        {Number(
                          item.available_quantity
                        ) > 0
                          ? 'Solicitar'
                          : 'Indisponível'}
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}
