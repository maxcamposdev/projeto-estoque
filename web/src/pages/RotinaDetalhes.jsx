import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import './RotinaDetalhes.css';

export default function RotinaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rotina, setRotina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [obrigatoria, setObrigatoria] = useState(false);
  const [criando, setCriando] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      setErro('');

      const response = await api.get(`/rotinas/${id}`);
      setRotina(response.data);
    } catch (error) {
      console.error('Erro ao carregar rotina:', error);
      setErro(
        error?.response?.data?.message ||
        'Não foi possível carregar a rotina.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  async function criarTarefa(event) {
    event.preventDefault();

    if (!titulo.trim()) return;

    try {
      setCriando(true);

      await api.post(`/rotinas/${id}/tasks`, {
        title: titulo.trim(),
        description: descricao.trim() || null,
        required: obrigatoria,
      });

      setTitulo('');
      setDescricao('');
      setObrigatoria(false);

      await carregar();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);

      alert(
        error?.response?.data?.message ||
        'Não foi possível criar a tarefa.'
      );
    } finally {
      setCriando(false);
    }
  }

  async function alternarTarefa(tarefa) {
    try {
      await api.post(`/rotinas/tasks/${tarefa.id}/complete`, {
        completed: !tarefa.completed,
      });

      await carregar();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);

      alert(
        error?.response?.data?.message ||
        'Não foi possível atualizar a tarefa.'
      );
    }
  }

  if (loading) {
    return (
      <div className="rotina-detalhes-page">
        <div className="rotina-loading">Carregando rotina...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rotina-detalhes-page">
        <button
          className="rotina-voltar"
          type="button"
          onClick={() => navigate('/rotinas')}
        >
          ← Voltar para rotinas
        </button>

        <div className="rotina-erro">
          {erro}
        </div>
      </div>
    );
  }

  if (!rotina) return null;

  const progresso = rotina.progress || {
    total: 0,
    completed: 0,
    pending: 0,
    percentage: 0,
  };

  return (
    <div className="rotina-detalhes-page">

      <button
        className="rotina-voltar"
        type="button"
        onClick={() => navigate('/rotinas')}
      >
        ← Voltar para rotinas
      </button>

      <header className="rotina-detalhes-header">
        <div>
          <span className="rotina-kicker">ROTINA</span>
          <h1>{rotina.name}</h1>

          {rotina.description && (
            <p>{rotina.description}</p>
          )}
        </div>

        <div className="rotina-status">
          {rotina.active ? 'ATIVA' : 'INATIVA'}
        </div>
      </header>

      <section className="rotina-progresso">
        <div className="progresso-topo">
          <div>
            <span>Progresso de hoje</span>
            <strong>
              {progresso.completed} de {progresso.total}
            </strong>
          </div>

          <b>{progresso.percentage}%</b>
        </div>

        <div className="progresso-barra">
          <div
            className="progresso-barra-fill"
            style={{ width: `${progresso.percentage}%` }}
          />
        </div>

        <div className="progresso-resumo">
          <span>
            ✓ {progresso.completed} concluída(s)
          </span>

          <span>
            ○ {progresso.pending} pendente(s)
          </span>
        </div>
      </section>

      <div className="rotina-layout">

        <section className="rotina-tarefas">
          <div className="rotina-section-header">
            <div>
              <span className="rotina-kicker">EXECUÇÃO</span>
              <h2>Tarefas</h2>
            </div>

            <span className="rotina-count">
              {progresso.total}
            </span>
          </div>

          {rotina.tasks.length === 0 ? (
            <div className="rotina-sem-tarefas">
              <strong>Nenhuma tarefa cadastrada</strong>
              <span>
                Crie a primeira tarefa ao lado.
              </span>
            </div>
          ) : (
            <div className="tarefas-lista">
              {rotina.tasks.map((tarefa) => (
                <article
                  className={
                    tarefa.completed
                      ? 'tarefa-card concluida'
                      : 'tarefa-card'
                  }
                  key={tarefa.id}
                >
                  <button
                    type="button"
                    className="tarefa-check"
                    onClick={() => alternarTarefa(tarefa)}
                    title={
                      tarefa.completed
                        ? 'Desmarcar conclusão'
                        : 'Concluir tarefa'
                    }
                  >
                    {tarefa.completed ? '✓' : ''}
                  </button>

                  <div className="tarefa-conteudo">
                    <div className="tarefa-titulo-linha">
                      <h3>{tarefa.title}</h3>

                      {tarefa.required && (
                        <span className="tarefa-obrigatoria">
                          Obrigatória
                        </span>
                      )}
                    </div>

                    {tarefa.description && (
                      <p>{tarefa.description}</p>
                    )}

                    <span className="tarefa-status">
                      {tarefa.completed
                        ? 'Concluída hoje'
                        : 'Pendente'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rotina-sidebar">

          <section className="rotina-form-card">
            <span className="rotina-kicker">NOVA TAREFA</span>
            <h2>Adicionar tarefa</h2>

            <form onSubmit={criarTarefa}>
              <label>
                Nome da tarefa

                <input
                  type="text"
                  value={titulo}
                  onChange={(event) =>
                    setTitulo(event.target.value)
                  }
                  placeholder="Ex.: Conferir estoque"
                  maxLength={200}
                />
              </label>

              <label>
                Descrição

                <textarea
                  value={descricao}
                  onChange={(event) =>
                    setDescricao(event.target.value)
                  }
                  placeholder="Detalhes da atividade..."
                  rows={4}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={obrigatoria}
                  onChange={(event) =>
                    setObrigatoria(event.target.checked)
                  }
                />

                <span>Marcar como obrigatória</span>
              </label>

              <button
                type="submit"
                disabled={criando || !titulo.trim()}
              >
                {criando ? 'Adicionando...' : 'Adicionar tarefa'}
              </button>
            </form>
          </section>

          <section className="rotina-info-card">
            <span className="rotina-kicker">INFORMAÇÕES</span>

            <div className="rotina-info-item">
              <span>Status</span>
              <strong>
                {rotina.active ? 'Ativa' : 'Inativa'}
              </strong>
            </div>

            <div className="rotina-info-item">
              <span>Tarefas</span>
              <strong>{progresso.total}</strong>
            </div>

            {rotina.created_by_name && (
              <div className="rotina-info-item">
                <span>Criada por</span>
                <strong>{rotina.created_by_name}</strong>
              </div>
            )}
          </section>

        </aside>
      </div>
    </div>
  );
}
