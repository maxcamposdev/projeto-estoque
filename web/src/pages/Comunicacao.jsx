import { useEffect, useState } from 'react';
import api from '../services/api';
import './Comunicacao.css';

export default function Comunicacao() {
  const [conversas, setConversas] = useState([]);
  const [unidades, setUnidades] = useState([]);

  const [conversaAtual, setConversaAtual] =
    useState(null);

  const [mensagens, setMensagens] =
    useState([]);

  const [texto, setTexto] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState('');

  const [novaUnidade, setNovaUnidade] =
    useState('');

  async function carregarConversas() {
    try {
      const response =
        await api.get(
          '/comunicacao/conversas'
        );

      setConversas(
        response.data?.conversas || []
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar as conversas.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function carregarUnidades() {
    try {
      const response =
        await api.get(
          '/comunicacao/unidades'
        );

      setUnidades(
        response.data?.unidades || []
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar as unidades.'
      );
    }
  }

  useEffect(() => {
    carregarConversas();
    carregarUnidades();
  }, []);

  async function abrirConversa(conversa) {
    try {
      setConversaAtual(conversa);

      const response =
        await api.get(
          `/comunicacao/conversas/${conversa.id}/mensagens`
        );

      setMensagens(
        response.data?.mensagens || []
      );

      carregarConversas();

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível carregar as mensagens.'
      );
    }
  }

  async function criarConversa() {
    if (!novaUnidade) {
      return;
    }

    try {
      setErro('');

      const response =
        await api.post(
          '/comunicacao/conversas',
          {
            unit_id:
              Number(novaUnidade)
          }
        );

      setNovaUnidade('');

      await carregarConversas();

      await abrirConversa(
        response.data.data
      );

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível iniciar a conversa.'
      );
    }
  }

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
      const response =
        await api.post(
          `/comunicacao/conversas/${conversaAtual.id}/mensagens`,
          {
            message: mensagem
          }
        );

      setMensagens((atual) => [
        ...atual,
        response.data.data
      ]);

      setTexto('');

      await carregarConversas();

    } catch (error) {
      setErro(
        error.response?.data?.message ||
        'Não foi possível enviar a mensagem.'
      );
    }
  }

  function unidadeDaConversa(conversa) {
    return (
      conversa.unit_a_name &&
      conversa.unit_b_name
    )
      ? `${conversa.unit_a_name} ↔ ${conversa.unit_b_name}`
      : 'Conversa';
  }

  if (loading) {
    return (
      <div className="comunicacao-loading">
        Carregando comunicação...
      </div>
    );
  }

  return (
    <div className="comunicacao">

      <header className="comunicacao-header">
        <div>
          <h1>Comunicação</h1>
          <p>
            Converse com outras unidades para
            agilizar transferências, compras e operações.
          </p>
        </div>
      </header>

      {erro && (
        <div className="comunicacao-erro">
          ⚠️ {erro}
        </div>
      )}

      <div className="comunicacao-layout">

        <aside className="comunicacao-sidebar">

          <div className="comunicacao-sidebar-top">
            <strong>Conversas</strong>

            <div className="nova-conversa">

              <select
                value={novaUnidade}
                onChange={(e) =>
                  setNovaUnidade(e.target.value)
                }
              >
                <option value="">
                  Nova conversa...
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

              {novaUnidade && (
                <button
                  onClick={criarConversa}
                >
                  Iniciar
                </button>
              )}

            </div>
          </div>

          <div className="conversas-lista">

            {conversas.length === 0 ? (
              <div className="conversas-vazio">
                Nenhuma conversa ainda.
              </div>
            ) : (
              conversas.map((conversa) => (
                <button
                  key={conversa.id}
                  className={
                    `conversa-item ${
                      conversaAtual?.id === conversa.id
                        ? 'conversa-ativa'
                        : ''
                    }`
                  }
                  onClick={() =>
                    abrirConversa(conversa)
                  }
                >

                  <strong>
                    {unidadeDaConversa(conversa)}
                  </strong>

                  <span>
                    {conversa.last_message ||
                      'Nenhuma mensagem ainda'}
                  </span>

                  {Number(
                    conversa.unread_count || 0
                  ) > 0 && (
                    <b>
                      {conversa.unread_count}
                    </b>
                  )}

                </button>
              ))
            )}

          </div>

        </aside>

        <main className="comunicacao-chat">

          {!conversaAtual ? (
            <div className="chat-vazio">
              <span className="chat-icone">
                💬
              </span>

              <h2>
                Selecione uma conversa
              </h2>

              <p>
                Escolha uma conversa existente
                ou inicie uma nova.
              </p>
            </div>
          ) : (
            <>

              <div className="chat-header">
                <strong>
                  {unidadeDaConversa(
                    conversaAtual
                  )}
                </strong>
              </div>

              <div className="mensagens">

                {mensagens.map((mensagem) => {

                  let usuarioAtual = null;

                  try {
                    usuarioAtual =
                      JSON.parse(
                        localStorage.getItem(
                          'user'
                        ) || 'null'
                      );
                  } catch {}

                  const propria =
                    Number(
                      usuarioAtual?.id
                    ) ===
                    Number(
                      mensagem.user_id
                    );

                  return (
                    <div
                      key={mensagem.id}
                      className={
                        `mensagem ${
                          propria
                            ? 'mensagem-propria'
                            : 'mensagem-outra'
                        }`
                      }
                    >
                      <div className="mensagem-nome">
                        {mensagem.user_name ||
                          'Usuário'}
                      </div>

                      <div className="mensagem-texto">
                        {mensagem.message}
                      </div>

                      <div className="mensagem-data">
                        {new Date(
                          mensagem.created_at
                        ).toLocaleString(
                          'pt-BR'
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>

              <div className="chat-composer">

                <textarea
                  value={texto}
                  onChange={(e) =>
                    setTexto(e.target.value)
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
                  rows="2"
                />

                <button
                  onClick={enviarMensagem}
                  disabled={!texto.trim()}
                >
                  Enviar
                </button>

              </div>

            </>
          )}

        </main>

      </div>

    </div>
  );
}
