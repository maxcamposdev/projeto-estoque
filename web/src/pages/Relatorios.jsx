// pages/Relatorios.jsx
// Central de relatórios — dados reais do sistema

import { useState, useEffect } from 'react';
import api from '../services/api';
import './Relatorios.css';

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function numero(valor) {
  return Number(valor || 0).toLocaleString('pt-BR');
}

function dataBR(data) {
  if (!data) return '-';

  return new Date(data).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function dataAtual() {
  return new Date().toLocaleString('pt-BR');
}

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro('');

      const [produtosResponse, movimentacoesResponse] =
        await Promise.all([
          api.get('/produtos'),
          api.get('/movimentacoes'),
        ]);

      setProdutos(produtosResponse.data.produtos || []);
      setMovimentacoes(
        movimentacoesResponse.data.movimentacoes || []
      );
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível carregar os dados dos relatórios.'
      );
    } finally {
      setLoading(false);
    }
  }

  function abrirRelatorio(tipo) {
    let dados = {};
    
    if (tipo === 'estoque') {
      const valorTotal = produtos.reduce(
        (total, p) =>
          total +
          Number(p.quantity || 0) *
          Number(p.price || 0),
        0
      );

      dados = {
        titulo: 'Relatório de Estoque',
        subtitulo:
          'Lista completa dos produtos atualmente cadastrados no estoque.',
        resumo: [
          ['Produtos cadastrados', numero(produtos.length)],
          [
            'Unidades em estoque',
            numero(
              produtos.reduce(
                (total, p) =>
                  total + Number(p.quantity || 0),
                0
              )
            ),
          ],
          ['Valor total do estoque', moeda(valorTotal)],
        ],
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Código de barras</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Preço</th>
                <th>Valor total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.barcode || '-'}</td>
                  <td>{p.categoria_nome || '-'}</td>
                  <td>{numero(p.quantity)}</td>
                  <td>{moeda(p.price)}</td>
                  <td>
                    {moeda(
                      Number(p.quantity || 0) *
                      Number(p.price || 0)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      };
    }

    if (tipo === 'movimentacoes') {
      const entradas = movimentacoes.filter(
        (m) => m.type === 'IN'
      );

      const saidas = movimentacoes.filter(
        (m) => m.type === 'OUT'
      );

      dados = {
        titulo: 'Relatório de Movimentações',
        subtitulo:
          'Histórico real de entradas e saídas registradas no sistema.',
        resumo: [
          ['Total de movimentações', numero(movimentacoes.length)],
          ['Entradas', numero(entradas.length)],
          ['Saídas', numero(saidas.length)],
        ],
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Código de barras</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Responsável</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td>{dataBR(m.created_at)}</td>
                  <td>{m.produto_nome || '-'}</td>
                  <td>{m.sku || '-'}</td>
                  <td>{m.barcode || '-'}</td>
                  <td>
                    <strong
                      className={
                        m.type === 'IN'
                          ? 'tipo-entrada'
                          : 'tipo-saida'
                      }
                    >
                      {m.type === 'IN'
                        ? 'ENTRADA'
                        : 'SAÍDA'}
                    </strong>
                  </td>
                  <td>{numero(m.quantity)}</td>
                  <td>{m.responsavel || '-'}</td>
                  <td>{m.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      };
    }

    if (tipo === 'entrada') {
      const entradas = movimentacoes.filter(
        (m) => m.type === 'IN'
      );

      dados = {
        titulo: 'Documento de Entrada',
        subtitulo:
          'Documento gerado a partir das entradas registradas no estoque.',
        resumo: [
          ['Entradas registradas', numero(entradas.length)],
          [
            'Quantidade recebida',
            numero(
              entradas.reduce(
                (total, m) =>
                  total + Number(m.quantity || 0),
                0
              )
            ),
          ],
        ],
        aviso:
          'Este documento é um demonstrativo interno. Não substitui uma NF-e fiscal emitida pelos sistemas autorizados.',
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Código de barras</th>
                <th>Quantidade</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((m) => (
                <tr key={m.id}>
                  <td>{dataBR(m.created_at)}</td>
                  <td>{m.produto_nome || '-'}</td>
                  <td>{m.sku || '-'}</td>
                  <td>{m.barcode || '-'}</td>
                  <td>{numero(m.quantity)}</td>
                  <td>{m.responsavel || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      };
    }

    if (tipo === 'saida') {
      const saidas = movimentacoes.filter(
        (m) => m.type === 'OUT'
      );

      dados = {
        titulo: 'Documento de Saída',
        subtitulo:
          'Documento gerado a partir das saídas registradas no estoque.',
        resumo: [
          ['Saídas registradas', numero(saidas.length)],
          [
            'Quantidade movimentada',
            numero(
              saidas.reduce(
                (total, m) =>
                  total + Number(m.quantity || 0),
                0
              )
            ),
          ],
        ],
        aviso:
          'Este documento é um demonstrativo interno. Não substitui uma NF-e fiscal emitida pelos sistemas autorizados.',
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Código de barras</th>
                <th>Quantidade</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {saidas.map((m) => (
                <tr key={m.id}>
                  <td>{dataBR(m.created_at)}</td>
                  <td>{m.produto_nome || '-'}</td>
                  <td>{m.sku || '-'}</td>
                  <td>{m.barcode || '-'}</td>
                  <td>{numero(m.quantity)}</td>
                  <td>{m.responsavel || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      };
    }

    if (tipo === 'vendas') {
      const saidas = movimentacoes.filter(
        (m) => m.type === 'OUT'
      );

      const valorSaidas = saidas.reduce(
        (total, m) =>
          total +
          Number(m.quantity || 0) *
          Number(m.price || 0),
        0
      );

      dados = {
        titulo: 'Relatório de Vendas / Saídas',
        subtitulo:
          'Análise das saídas registradas no controle de estoque.',
        resumo: [
          ['Operações de saída', numero(saidas.length)],
          [
            'Itens movimentados',
            numero(
              saidas.reduce(
                (total, m) =>
                  total + Number(m.quantity || 0),
                0
              )
            ),
          ],
          ['Valor dos itens movimentados', moeda(valorSaidas)],
        ],
        aviso:
          'O sistema atual registra movimentações de estoque, mas ainda não possui módulo próprio de vendas. Por isso, este relatório apresenta as saídas registradas, sem inventar vendas ou formas de pagamento.',
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>SKU</th>
                <th>Código de barras</th>
                <th>Quantidade</th>
                <th>Preço cadastrado</th>
                <th>Valor movimentado</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {saidas.map((m) => (
                <tr key={m.id}>
                  <td>{dataBR(m.created_at)}</td>
                  <td>{m.produto_nome || '-'}</td>
                  <td>{m.sku || '-'}</td>
                  <td>{m.barcode || '-'}</td>
                  <td>{numero(m.quantity)}</td>
                  <td>{moeda(m.price)}</td>
                  <td>
                    {moeda(
                      Number(m.quantity || 0) *
                      Number(m.price || 0)
                    )}
                  </td>
                  <td>{m.responsavel || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      };
    }

    if (tipo === 'financeiro') {
      const valorEstoque = produtos.reduce(
        (total, p) =>
          total +
          Number(p.quantity || 0) *
          Number(p.price || 0),
        0
      );

      const valorEntradas = movimentacoes
        .filter((m) => m.type === 'IN')
        .reduce(
          (total, m) =>
            total +
            Number(m.quantity || 0) *
            Number(m.price || 0),
          0
        );

      const valorSaidas = movimentacoes
        .filter((m) => m.type === 'OUT')
        .reduce(
          (total, m) =>
            total +
            Number(m.quantity || 0) *
            Number(m.price || 0),
          0
        );

      dados = {
        titulo: 'Relatório Financeiro',
        subtitulo:
          'Resumo financeiro baseado nos dados reais de estoque e movimentações.',
        resumo: [
          ['Valor atual do estoque', moeda(valorEstoque)],
          ['Valor das entradas', moeda(valorEntradas)],
          ['Valor das saídas', moeda(valorSaidas)],
        ],
        aviso:
          'Os valores deste relatório são calculados com base no preço cadastrado dos produtos. O sistema ainda não possui módulo de custos, despesas, vendas e lucro líquido.',
        conteudo: (
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Valor atual do estoque</td>
                <td>{moeda(valorEstoque)}</td>
              </tr>
              <tr>
                <td>Valor das entradas</td>
                <td>{moeda(valorEntradas)}</td>
              </tr>
              <tr>
                <td>Valor das saídas</td>
                <td>{moeda(valorSaidas)}</td>
              </tr>
              <tr>
                <td>Produtos cadastrados</td>
                <td>{numero(produtos.length)}</td>
              </tr>
              <tr>
                <td>Total de movimentações</td>
                <td>{numero(movimentacoes.length)}</td>
              </tr>
            </tbody>
          </table>
        ),
      };
    }

    setRelatorio(dados);
  }

  function imprimir() {
    window.print();
  }

  if (loading) {
    return (
      <div className="rel-loading">
        <div className="spinner" />
        <p>Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="relatorios">

      <div className="rel-header">
        <h1>Relatórios</h1>
        <p className="rel-subtitle">
          Gere relatórios, documentos e demonstrativos
          utilizando os dados reais do sistema.
        </p>
      </div>

      {erro && (
        <div className="rel-error">
          ❌ {erro}
        </div>
      )}

      <div className="rel-grid">

        <div className="rel-card">
          <div className="rel-card-icon">📄</div>
          <h3>Relatório de Estoque</h3>
          <p>
            Lista completa de produtos, quantidades,
            preços e valores em estoque.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('estoque')}
          >
            Gerar relatório
          </button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">📋</div>
          <h3>Relatório de Movimentações</h3>
          <p>
            Histórico real de entradas e saídas
            registradas no sistema.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('movimentacoes')}
          >
            Gerar relatório
          </button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">🧾</div>
          <h3>Nota Fiscal de Entrada</h3>
          <p>
            Documento demonstrativo das entradas
            registradas no estoque.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('entrada')}
          >
            Gerar documento
          </button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">🧾</div>
          <h3>Nota Fiscal de Saída</h3>
          <p>
            Documento demonstrativo das saídas
            registradas no estoque.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('saida')}
          >
            Gerar documento
          </button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">📈</div>
          <h3>Relatório de Vendas</h3>
          <p>
            Análise das saídas registradas,
            quantidades e valores dos produtos.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('vendas')}
          >
            Gerar relatório
          </button>
        </div>

        <div className="rel-card">
          <div className="rel-card-icon">💰</div>
          <h3>Relatório Financeiro</h3>
          <p>
            Valores do estoque, entradas e saídas
            calculados a partir dos dados reais.
          </p>
          <button
            className="btn-relatorio"
            onClick={() => abrirRelatorio('financeiro')}
          >
            Gerar relatório
          </button>
        </div>

      </div>

      <div className="rel-info">
        <p>
          🔐 <strong>Dados reais:</strong> os relatórios
          são gerados diretamente a partir dos produtos
          e movimentações cadastrados no sistema.
        </p>
      </div>

      {relatorio && (
        <div className="rel-modal-overlay">
          <div className="rel-modal">

            <div className="rel-modal-actions">
              <button
                className="btn-print"
                onClick={imprimir}
              >
                🖨️ Imprimir / Salvar PDF
              </button>

              <button
                className="btn-close"
                onClick={() => setRelatorio(null)}
              >
                ✕ Fechar
              </button>
            </div>

            <div className="rel-document">

              <div className="document-header">
                <div>
                  <h1>Controle de Estoque</h1>
                  <p>Relatório gerado pelo sistema</p>
                </div>

                <div className="document-date">
                  <strong>Data de emissão</strong>
                  <span>{dataAtual()}</span>
                </div>
              </div>

              <hr />

              <h2>{relatorio.titulo}</h2>

              <p className="document-subtitle">
                {relatorio.subtitulo}
              </p>

              {relatorio.resumo && (
                <div className="document-summary">
                  {relatorio.resumo.map(
                    ([label, valor]) => (
                      <div
                        className="summary-item"
                        key={label}
                      >
                        <span>{label}</span>
                        <strong>{valor}</strong>
                      </div>
                    )
                  )}
                </div>
              )}

              {relatorio.aviso && (
                <div className="document-warning">
                  ⚠️ {relatorio.aviso}
                </div>
              )}

              <div className="document-table">
                {relatorio.conteudo}
              </div>

              <div className="document-footer">
                Documento gerado automaticamente pelo
                sistema de controle de estoque.
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
