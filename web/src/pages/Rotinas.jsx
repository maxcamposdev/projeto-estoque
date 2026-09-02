import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Rotinas.css';

export default function Rotinas() {
  const navigate = useNavigate();
  const [rotinas, setRotinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [criando, setCriando] = useState(false);

  async function carregarRotinas() {
    try {
      const response = await api.get('/rotinas');
      setRotinas(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar rotinas:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRotinas();
  }, []);

  async function criarRotina(e) {
    e.preventDefault();

    if (!nome.trim()) return;

    try {
      setCriando(true);

      await api.post('/rotinas', {
        name: nome.trim(),
      });

      setNome('');
      await carregarRotinas();
    } catch (error) {
      console.error('Erro ao criar rotina:', error);
      alert(
        error?.response?.data?.message ||
          'Não foi possível criar a rotina.'
      );
    } finally {
      setCriando(false);
    }
  }

  function abrirRotina(id) {
    navigate(`/rotinas/${id}`);
  }

  return (
    <div className="rotinas-page">
      <div className="rotinas-header">
        <div>
          <span className="rotinas-kicker">ORGANIZAÇÃO</span>
          <h1>Rotinas</h1>
          <p>Gerencie as tarefas e atividades da equipe.</p>
        </div>
      </div>

      <section className="rotinas-criar">
        <h2>Nova rotina</h2>

        <form onSubmit={criarRotina}>
          <input
            type="text"
            placeholder="Nome da rotina"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={160}
          />

          <button type="submit" disabled={criando || !nome.trim()}>
            {criando ? 'Criando...' : 'Criar rotina'}
          </button>
        </form>
      </section>

      <section className="rotinas-lista">
        <div className="rotinas-lista-header">
          <h2>Rotinas cadastradas</h2>
          <span>{rotinas.length}</span>
        </div>

        {loading ? (
          <div className="rotinas-vazio">
            Carregando...
          </div>
        ) : rotinas.length === 0 ? (
          <div className="rotinas-vazio">
            <strong>Nenhuma rotina cadastrada</strong>
            <span>Crie a primeira rotina acima.</span>
          </div>
        ) : (
          <div className="rotinas-grid">
            {rotinas.map((rotina) => (
              <article className="rotina-card" key={rotina.id}>
                <div className="rotina-card-top">
                  <div className="rotina-icon">✓</div>

                  <div className="rotina-card-info">
                    <h3>{rotina.name}</h3>
                    <span>
                      {rotina.total_tarefas || 0} tarefa(s)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="rotina-abrir"
                  onClick={() => abrirRotina(rotina.id)}
                >
                  Abrir rotina →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
