import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
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

function nomeConversa(conversa) {
  if (!conversa) {
    return 'Comunicação';
  }

  return (
    `${conversa.unit_a_name || 'Unidade'} ↔ ` +
    `${conversa.unit_b_name || 'Unidade'}`
  );
}

export default function ChatFlutuante() {
  const usuario = obterUsuario();

  const [aberto, setAberto] = useState(false);
  const [lojaDemoSelecionada, setLojaDemoSelecionada] = useState(null);
  const [mensagemDemo, setMensagemDemo] = useState('');
  const [mensagensDemo, setMensagensDemo] = useState({});


  const [conversas, setConversas] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [conversaAtual, setConversaAtual] =
    useState(null);

  const [mensagens, setMensagens] =
    useState([]);

  const [texto, setTexto] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [erro, setErro] =
    useState('');

  const [notificacao, setNotificacao] =
    useState(null);

  const [online, setOnline] =
    useState(false);

  const inicializado =
    useRef(false);

  const totalNaoLidasAnterior =
    useRef(0);

  const timeoutNotificacao =
    useRef(null);


  // ==========================================================
  // CARREGAR LOJAS
  // ==========================================================

  const carregarUnidades = useCallback(
    async () => {
      try {
        const response = await api.get(
          '/comunicacao/unidades'
        );

        setUnidades(
          response.data?.unidades || []
        );

      } catch (error) {
        console.error(
          'Erro ao carregar unidades:',
          error
        );
      }
    },
    []
  );


  // ==========================================================
  // CARREGAR CONVERSAS
  // ==========================================================

  const carregarConversas = useCallback(
    async () => {
      try {
        const response = await api.get(
          '/comunicacao/conversas'
        );

        const lista =
          response.data?.conversas || [];

        const totalNaoLidas =
          lista.reduce(
            (total, conversa) =>
              total +
              Number(
                conversa.unread_count || 0
              ),
            0
          );

        // Nova mensagem
        if (
          inicializado.current &&
          totalNaoLidas >
            totalNaoLidasAnterior.current
        ) {
          const novaConversa =
            lista.find(
              (conversa) =>
                Number(
                  conversa.unread_count || 0
                ) > 0
            );

          if (novaConversa) {

            setNotificacao({
              conversa: novaConversa,
              texto:
                novaConversa.last_message ||
                'Você recebeu uma nova mensagem.'
            });

            clearTimeout(
              timeoutNotificacao.current
            );

            timeoutNotificacao.current =
              setTimeout(() => {
                setNotificacao(null);
              }, 8000);
          }
        }

        totalNaoLidasAnterior.current =
          totalNaoLidas;

        inicializado.current = true;

        setConversas(lista);

        setOnline(true);

      } catch (error) {
        console.error(
          'Erro ao carregar comunicação:',
          error
        );

        setOnline(false);
      }
    },
    []
  );


  // ==========================================================
  // INICIALIZAÇÃO
  // ==========================================================

  useEffect(() => {

    carregarUnidades();
    carregarConversas();

    const intervalo =
      setInterval(() => {
        carregarUnidades();
        carregarConversas();
      }, 4000);

    return () => {
      clearInterval(intervalo);

      clearTimeout(
        timeoutNotificacao.current
      );
    };

  }, [
    carregarUnidades,
    carregarConversas
  ]);


  // ==========================================================
  // ABRIR CONVERSA EXISTENTE
  // ==========================================================

  async function abrirConversa(conversa) {

    try {

      setErro('');

      setConversaAtual(conversa);

      const response =
        await api.get(
          `/comunicacao/conversas/${conversa.id}/mensagens`
        );

      setMensagens(
        response.data?.mensagens || []
      );

      await carregarConversas();

    } catch (error) {

      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar as mensagens.'
      );
    }
  }


  // ==========================================================
  // ABRIR OU CRIAR CONVERSA COM UMA LOJA
  // ==========================================================

  async function abrirOuCriarConversa(unidade) {

    try {

      setErro('');

      const minhaUnidade =
        Number(usuario?.unit_id);

      const conversaExistente =
        conversas.find(
          (conversa) => {

            const a =
              Number(
                conversa.unit_a_id
              );

            const b =
              Number(
                conversa.unit_b_id
              );

            return (
              a === Number(unidade.id) &&
              b === minhaUnidade
            ) ||
            (
              b === Number(unidade.id) &&
              a === minhaUnidade
            );
          }
        );

      if (conversaExistente) {

        await abrirConversa(
          conversaExistente
        );

        return;
      }

      const response =
        await api.post(
          '/comunicacao/conversas',
          {
            unit_id:
              Number(unidade.id)
          }
        );

      const novaConversa =
        response.data?.data;

      await carregarConversas();

      if (novaConversa) {

        await abrirConversa(
          novaConversa
        );
      }

    } catch (error) {

      setErro(
        error.response?.data?.message ||
        'Não foi possível iniciar a conversa.'
      );
    }
  }


  // ==========================================================
  // ENVIAR MENSAGEM
  // ==========================================================

  async function enviarMensagem() {

    const mensagem =
      texto.trim();

    if (
      !mensagem ||
      !conversaAtual
    ) {
      return;
    }

    try {

      setLoading(true);
      setErro('');

      const response =
        await api.post(
          `/comunicacao/conversas/${conversaAtual.id}/mensagens`,
          {
            message: mensagem
          }
        );

      setMensagens(
        (atual) => [
          ...atual,
          response.data.data
        ]
      );

      setTexto('');

      await carregarConversas();

    } catch (error) {

      setErro(
        error.response?.data?.message ||
        'Não foi possível enviar a mensagem.'
      );

    } finally {
      setLoading(false);
    }
  }


  // ==========================================================
  // CONTADORES
  // ==========================================================

  const totalNaoLidas =
    conversas.reduce(
      (total, conversa) =>
        total +
        Number(
          conversa.unread_count || 0
        ),
      0
    );


  // ==========================================================
  // MAPA DE CONVERSAS POR UNIDADE
  // ==========================================================

  const conversasPorUnidade =
    new Map();

  conversas.forEach(
    (conversa) => {

      const a =
        Number(
          conversa.unit_a_id
        );

      const b =
        Number(
          conversa.unit_b_id
        );

      const minhaUnidade =
        Number(
          usuario?.unit_id
        );

      const outraUnidade =
        a === minhaUnidade
          ? b
          : a;

      conversasPorUnidade.set(
        outraUnidade,
        conversa
      );
    }
  );


  return (
    <>
      {/* ======================================================
          NOTIFICAÇÃO
      ======================================================= */}

      {notificacao && (
        <div
          className="chat-notificacao"
          role="button"
          tabIndex={0}
          onClick={() => {

            setAberto(true);

            abrirConversa(
              notificacao.conversa
            );

            setNotificacao(null);
          }}
        >

          <span className="chat-notificacao-icone">
            🔔
          </span>

          <span className="chat-notificacao-conteudo">

            <strong>
              Nova mensagem
            </strong>

            <small>
              {nomeConversa(
                notificacao.conversa
              )}
            </small>

            <span>
              {notificacao.texto}
            </span>

          </span>

          <button
            type="button"
            className="chat-notificacao-fechar"
            aria-label="Fechar notificação"
            onClick={(e) => {
              e.stopPropagation();
              setNotificacao(null);
            }}
          >
            ×
          </button>

        </div>
      )}



      {lojaDemoSelecionada && (
        <section className="chat-demo-janela">

          <header className="chat-demo-header">

            <button
              type="button"
              className="chat-demo-voltar"
              onClick={() => setLojaDemoSelecionada(null)}
            >
              ←
            </button>

            <div className="chat-demo-header-info">

              <span className="chat-demo-avatar">
                🏪
              </span>

              <div>
                <strong>
                  {lojaDemoSelecionada.nome}
                </strong>

                <small>
                  <i />
                  {lojaDemoSelecionada.status}
                </small>
              </div>

            </div>

            <button
              type="button"
              className="chat-demo-fechar"
              onClick={() => setLojaDemoSelecionada(null)}
            >
              ×
            </button>

          </header>

          <div className="chat-demo-mensagens">

            <div className="chat-demo-aviso">
              <span>🏪</span>
              <strong>
                Comunicação entre lojas
              </strong>
              <small>
                Esta é uma demonstração da conversa.
              </small>
            </div>

            <div className="chat-demo-mensagem outra">
              <small>
                {lojaDemoSelecionada.nome}
              </small>
              <div>
                Olá! Como podemos ajudar?
              </div>
              <time>
                agora
              </time>
            </div>

            {(mensagensDemo[lojaDemoSelecionada.id] || []).map(
              (msg, index) => (
                <div
                  key={index}
                  className="chat-demo-mensagem propria"
                >
                  <div>{msg}</div>
                  <time>agora</time>
                </div>
              )
            )}

          </div>

          <div className="chat-demo-composer">

            <input
              value={mensagemDemo}
              onChange={(e) => setMensagemDemo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mensagemDemo.trim()) {

                  e.preventDefault();

                  const id = lojaDemoSelecionada.id;
                  const texto = mensagemDemo.trim();

                  setMensagensDemo((atual) => ({
                    ...atual,
                    [id]: [
                      ...(atual[id] || []),
                      texto
                    ]
                  }));

                  setMensagemDemo('');
                }
              }}
              placeholder="Digite uma mensagem..."
            />

            <button
              type="button"
              disabled={!mensagemDemo.trim()}
              onClick={() => {

                const id = lojaDemoSelecionada.id;
                const texto = mensagemDemo.trim();

                if (!texto) return;

                setMensagensDemo((atual) => ({
                  ...atual,
                  [id]: [
                    ...(atual[id] || []),
                    texto
                  ]
                }));

                setMensagemDemo('');
              }}
            >
              ➤
            </button>

          </div>

        </section>
      )}


      {/* ======================================================
          JANELA DO CHAT
      ======================================================= */}

      {aberto && (

        <section
          className="chat-flutuante-painel"
        >

          <header
            className="chat-flutuante-header"
          >

            <div>

              <strong>
                Comunicação
              </strong>

              <span
                className={
                  `chat-online-status ${
                    online
                      ? 'online'
                      : 'offline'
                  }`
                }
              >
                <i />

                {online
                  ? 'Online'
                  : 'Reconectando...'}
              </span>

            </div>

            <button
              type="button"
              className="chat-fechar"
              onClick={() =>
                setAberto(false)
              }
            >
              ×
            </button>

          </header>


          <div className="chat-flutuante-corpo">

            {!conversaAtual ? (

              <div className="chat-conversas">

                {/* ==================================================
                    TODAS AS LOJAS — DEMONSTRAÇÃO
                =================================================== */}

                <div className="chat-secao-titulo">
                  Lojas
                </div>

                <div className="chat-lojas-demo">

                  {[
                    { id: 1, nome: 'Loja Centro', status: 'Online' },
                    { id: 2, nome: 'Loja Norte', status: 'Online' },
                    { id: 3, nome: 'Loja Sul', status: 'Online' },
                    { id: 4, nome: 'Loja Shopping', status: 'Online' }
                  ].map((loja) => (

                    <button
                      type="button"
                      key={loja.id}
                      className="chat-loja-demo"
                      onClick={() => setLojaDemoSelecionada(loja)}
                    >

                      <span className="chat-loja-demo-icone">
                        🏪
                      </span>

                      <span className="chat-loja-demo-info">

                        <strong>
                          {loja.nome}
                        </strong>

                        <small>
                          <i />
                          {loja.status}
                        </small>

                      </span>

                      <span className="chat-loja-demo-seta">
                        ›
                      </span>

                    </button>

                  ))}

                </div>


                {/* ==================================================
                    CONVERSAS EXISTENTES
                =================================================== */}

                {conversas.length > 0 && (

                  <div
                    className={
                      `chat-secao-titulo ` +
                      `chat-secao-recentes`
                    }
                  >
                    Conversas recentes
                  </div>

                )}

                {conversas
                  .slice(0, 5)
                  .map(
                    (conversa) => (

                      <button
                        type="button"
                        key={
                          `conversa-${conversa.id}`
                        }
                        className="chat-conversa"
                        onClick={() =>
                          abrirConversa(
                            conversa
                          )
                        }
                      >

                        <div
                          className="chat-conversa-topo"
                        >

                          <strong>
                            {nomeConversa(
                              conversa
                            )}
                          </strong>

                          {Number(
                            conversa.unread_count || 0
                          ) > 0 && (

                            <b>
                              {
                                conversa.unread_count
                              }
                            </b>

                          )}

                        </div>

                        <span>
                          {conversa.last_message ||
                            'Nenhuma mensagem ainda'}
                        </span>

                      </button>

                    )
                  )}

              </div>

            ) : (

              <div
                className="chat-flutuante-conversa"
              >

                <div
                  className="chat-conversa-barra"
                >

                  <button
                    type="button"
                    onClick={() =>
                      setConversaAtual(null)
                    }
                  >
                    ←
                  </button>

                  <strong>
                    {nomeConversa(
                      conversaAtual
                    )}
                  </strong>

                </div>


                {erro && (

                  <div className="chat-erro">
                    ⚠️ {erro}
                  </div>

                )}


                <div className="chat-mensagens">

                  {mensagens.map(
                    (mensagem) => {

                      const propria =
                        Number(
                          usuario?.id
                        ) ===
                        Number(
                          mensagem.user_id
                        );

                      return (

                        <div
                          key={
                            mensagem.id
                          }
                          className={
                            `chat-mensagem ${
                              propria
                                ? 'propria'
                                : 'outra'
                            }`
                          }
                        >

                          <small>
                            {mensagem.user_name ||
                              'Usuário'}
                          </small>

                          <div>
                            {mensagem.message}
                          </div>

                          <time>
                            {new Date(
                              mensagem.created_at
                            ).toLocaleTimeString(
                              'pt-BR',
                              {
                                hour: '2-digit',
                                minute: '2-digit'
                              }
                            )}
                          </time>

                        </div>

                      );
                    }
                  )}

                </div>


                <div
                  className="chat-flutuante-composer"
                >

                  <textarea
                    value={texto}
                    onChange={(e) =>
                      setTexto(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {

                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey
                      ) {
                        e.preventDefault();

                        enviarMensagem();
                      }

                    }}
                    placeholder="Digite uma mensagem..."
                    rows="1"
                  />

                  <button
                    type="button"
                    onClick={
                      enviarMensagem
                    }
                    disabled={
                      loading ||
                      !texto.trim()
                    }
                  >
                    ➤
                  </button>

                </div>

              </div>

            )}

          </div>

        </section>
      )}


      {/* ======================================================
          BOTÃO FLUTUANTE
      ======================================================= */}

      <button
        type="button"
        className={
          `chat-flutuante-botao ${
            aberto
              ? 'chat-botao-aberto'
              : ''
          } ${
            totalNaoLidas > 0
              ? 'chat-tem-novas'
              : ''
          }`
        }
        onClick={() => {

          setNotificacao(null);

          setAberto(
            (atual) => !atual
          );
        }}
        aria-label={aberto ? 'Fechar comunicação' : 'Abrir comunicação'}
      >

        <span className="chat-botao-icone">
          💬
        </span>

        {totalNaoLidas > 0 && (

          <span className="chat-badge">

            {totalNaoLidas > 99
              ? '99+'
              : totalNaoLidas}

          </span>

        )}

      </button>

    </>
  );
}
