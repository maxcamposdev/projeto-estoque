import { useState } from 'react';
import './ChatFlutuante.css';

function obterUsuario() {
  try {
    return JSON.parse(
      localStorage.getItem('user') || 'null'
    );
  } catch {
    return null;
  }
}

const LOJAS = [
  {
    id: 1,
    nome: 'Loja Centro',
    codigo: 'CENTRO',
    online: true
  },
  {
    id: 2,
    nome: 'Loja Norte',
    codigo: 'NORTE',
    online: true
  },
  {
    id: 3,
    nome: 'Loja Sul',
    codigo: 'SUL',
    online: false
  },
  {
    id: 4,
    nome: 'Loja Shopping',
    codigo: 'SHOPPING',
    online: true
  }
];

export default function ChatFlutuante() {
  const usuario = obterUsuario();

  const [aberto, setAberto] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState(null);

  const minhaLoja =
    usuario?.unit_name ||
    usuario?.unitName ||
    'Minha unidade';

  function selecionarLoja(loja) {
    setLojaSelecionada(loja);
  }

  function voltarParaLojas() {
    setLojaSelecionada(null);
  }

  return (
    <>
      {/* =====================================================
          BOTÃO FLUTUANTE
      ====================================================== */}

      {!aberto && (
        <button
          type="button"
          className="chat-flutuante-botao"
          onClick={() => setAberto(true)}
          aria-label="Abrir comunicação entre unidades"
        >
          <span className="chat-flutuante-botao-icone">
            💬
          </span>

          <span className="chat-flutuante-botao-badge">
            Comunicação
          </span>
        </button>
      )}

      {/* =====================================================
          PAINEL
      ====================================================== */}

      {aberto && (
        <section className="chat-flutuante-painel">

          {/* =================================================
              CABEÇALHO
          ================================================== */}

          <header className="chat-flutuante-header">

            <div className="chat-flutuante-header-info">

              <div className="chat-flutuante-header-icone">
                💬
              </div>

              <div>
                <strong>
                  Comunicação
                </strong>

                <span className="chat-online-status online">
                  <i />
                  Comunicação entre unidades
                </span>
              </div>

            </div>

            <button
              type="button"
              className="chat-fechar"
              onClick={() => {
                setAberto(false);
                setLojaSelecionada(null);
              }}
              aria-label="Fechar comunicação"
            >
              ×
            </button>

          </header>


          {/* =================================================
              CONTEÚDO
          ================================================== */}

          <div className="chat-flutuante-corpo">

            {!lojaSelecionada ? (

              <div className="chat-conversas">

                {/* =============================================
                    INTRODUÇÃO
                ============================================== */}

                <div className="chat-comunicacao-intro">

                  <div className="chat-comunicacao-intro-icone">
                    💬
                  </div>

                  <div>
                    <strong>
                      Comunicação interna
                    </strong>

                    <p>
                      Converse com outras lojas
                      e unidades da empresa.
                    </p>
                  </div>

                </div>


                {/* =============================================
                    MINHA UNIDADE
                ============================================== */}

                <div className="chat-secao-titulo">
                  Minha unidade
                </div>

                <div className="chat-minha-unidade">

                  <div className="chat-loja-avatar">
                    🏪
                  </div>

                  <div className="chat-loja-info">

                    <strong>
                      {minhaLoja}
                    </strong>

                    <span>
                      Unidade atual
                    </span>

                  </div>

                  <span className="chat-loja-status">
                    Você
                  </span>

                </div>


                {/* =============================================
                    OUTRAS LOJAS
                ============================================== */}

                <div className="chat-secao-titulo">
                  Lojas e unidades
                </div>

                <div className="chat-lista-lojas">

                  {LOJAS
                    .filter(
                      (loja) =>
                        loja.nome !== minhaLoja
                    )
                    .map((loja) => (

                      <button
                        type="button"
                        key={loja.id}
                        className="chat-loja"
                        onClick={() =>
                          selecionarLoja(loja)
                        }
                      >

                        <div className="chat-loja-avatar">
                          🏪
                        </div>

                        <div className="chat-loja-info">

                          <strong>
                            {loja.nome}
                          </strong>

                          <span>
                            Unidade {loja.codigo}
                          </span>

                        </div>

                        <div className="chat-loja-direita">

                          <span
                            className={
                              `chat-loja-online ${
                                loja.online
                                  ? 'online'
                                  : 'offline'
                              }`
                            }
                          >
                            <i />

                            {loja.online
                              ? 'Online'
                              : 'Offline'}
                          </span>

                          <span className="chat-loja-seta">
                            ›
                          </span>

                        </div>

                      </button>

                    ))}

                </div>


                {/* =============================================
                    AVISO
                ============================================== */}

                <div className="chat-comunicacao-info">

                  <span>
                    ℹ️
                  </span>

                  <p>
                    Use a comunicação interna para
                    trocar informações com outras
                    unidades de forma rápida e organizada.
                  </p>

                </div>

              </div>

            ) : (

              /* =================================================
                 TELA DA LOJA SELECIONADA
              ================================================== */

              <div className="chat-flutuante-conversa">

                <div className="chat-conversa-barra">

                  <button
                    type="button"
                    onClick={voltarParaLojas}
                    aria-label="Voltar para lojas"
                  >
                    ←
                  </button>

                  <div className="chat-conversa-barra-loja">

                    <div className="chat-loja-avatar pequeno">
                      🏪
                    </div>

                    <div>
                      <strong>
                        {lojaSelecionada.nome}
                      </strong>

                      <span>
                        Unidade {lojaSelecionada.codigo}
                      </span>
                    </div>

                  </div>

                </div>


                {/* =============================================
                    ESTADO DEMONSTRATIVO
                ============================================== */}

                <div className="chat-demonstracao">

                  <div className="chat-demonstracao-icone">
                    💬
                  </div>

                  <strong>
                    Comunicação disponível
                  </strong>

                  <p>
                    Aqui você poderá conversar
                    diretamente com a equipe da{' '}
                    <b>
                      {lojaSelecionada.nome}
                    </b>.
                  </p>

                  <div className="chat-demonstracao-status">

                    <span>
                      <i />
                      {lojaSelecionada.online
                        ? 'Unidade online'
                        : 'Unidade offline'}
                    </span>

                  </div>

                </div>


                {/* =============================================
                    CAMPO VISUAL
                ============================================== */}

                <div className="chat-composicao-demo">

                  <div className="chat-input-demo">
                    Digite uma mensagem...
                  </div>

                  <button
                    type="button"
                    className="chat-enviar-demo"
                    title="Comunicação"
                  >
                    ➤
                  </button>

                </div>

              </div>

            )}

          </div>

        </section>
      )}
    </>
  );
}
