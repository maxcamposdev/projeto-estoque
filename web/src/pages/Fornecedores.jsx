import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './Fornecedores.css';

const FORM_INICIAL = {
  type: 'PJ',
  legal_name: '',
  trade_name: '',
  cnpj: '',
  state_registration: '',
  municipal_registration: '',
  contact_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  payment_terms: '',
  delivery_days: '',
  minimum_order: '',
  freight_type: '',
  notes: '',
  status: 'ACTIVE',
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);

  async function carregarFornecedores() {
    try {
      setLoading(true);
      setErro('');

      const { data } = await api.get('/fornecedores');
      setFornecedores(data.fornecedores || []);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível carregar os fornecedores.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setErro('');
    setSucesso('');
    setModalAberto(true);
  }

  function abrirEdicao(fornecedor) {
    setEditando(fornecedor);

    setForm({
      type: fornecedor.type || 'PJ',
      legal_name: fornecedor.legal_name || '',
      trade_name: fornecedor.trade_name || '',
      cnpj: fornecedor.cnpj || '',
      state_registration: fornecedor.state_registration || '',
      municipal_registration: fornecedor.municipal_registration || '',
      contact_name: fornecedor.contact_name || '',
      phone: fornecedor.phone || '',
      whatsapp: fornecedor.whatsapp || '',
      email: fornecedor.email || '',
      website: fornecedor.website || '',
      zip_code: fornecedor.zip_code || '',
      street: fornecedor.street || '',
      number: fornecedor.number || '',
      complement: fornecedor.complement || '',
      neighborhood: fornecedor.neighborhood || '',
      city: fornecedor.city || '',
      state: fornecedor.state || '',
      payment_terms: fornecedor.payment_terms || '',
      delivery_days: fornecedor.delivery_days ?? '',
      minimum_order: fornecedor.minimum_order ?? '',
      freight_type: fornecedor.freight_type || '',
      notes: fornecedor.notes || '',
      status: fornecedor.status || 'ACTIVE',
    });

    setErro('');
    setSucesso('');
    setModalAberto(true);
  }

  function alterarCampo(e) {
    const { name, value } = e.target;

    setForm((atual) => ({
      ...atual,
      [name]: value,
    }));
  }

  async function salvarFornecedor(e) {
    e.preventDefault();

    if (!form.legal_name.trim()) {
      setErro('Informe a razão social ou nome completo.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      setSucesso('');

      if (editando) {
        await api.put(`/fornecedores/${editando.id}`, form);
        setSucesso('Fornecedor atualizado com sucesso.');
      } else {
        await api.post('/fornecedores', form);
        setSucesso('Fornecedor cadastrado com sucesso.');
      }

      setModalAberto(false);
      setEditando(null);
      setForm(FORM_INICIAL);

      await carregarFornecedores();

      setTimeout(() => setSucesso(''), 4000);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível salvar o fornecedor.'
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirFornecedor(fornecedor) {
    const nome =
      fornecedor.trade_name ||
      fornecedor.legal_name;

    if (!window.confirm(
      `Excluir o fornecedor "${nome}"?\n\n` +
      'Os pedidos já registrados serão preservados.'
    )) {
      return;
    }

    try {
      setErro('');
      await api.delete(`/fornecedores/${fornecedor.id}`);

      setSucesso('Fornecedor excluído com sucesso.');
      await carregarFornecedores();

      setTimeout(() => setSucesso(''), 4000);
    } catch (err) {
      setErro(
        err.response?.data?.message ||
        'Não foi possível excluir o fornecedor.'
      );
    }
  }

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return fornecedores;
    }

    return fornecedores.filter((f) =>
      [
        f.legal_name,
        f.trade_name,
        f.cnpj,
        f.contact_name,
        f.email,
        f.phone,
      ]
        .filter(Boolean)
        .some((valor) =>
          String(valor).toLowerCase().includes(termo)
        )
    );
  }, [fornecedores, busca]);

  if (loading) {
    return (
      <div className="fornecedores-loading">
        <div className="spinner" />
        <p>Carregando fornecedores...</p>
      </div>
    );
  }

  return (
    <div className="fornecedores">

      <div className="fornecedores-header">
        <div>
          <h1>Fornecedores</h1>
          <p>
            Cadastre e mantenha os fornecedores utilizados nas compras da empresa.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={abrirNovo}
        >
          ＋ Novo fornecedor
        </button>
      </div>

      {sucesso && (
        <div className="fornecedor-message fornecedor-success">
          ✓ {sucesso}
        </div>
      )}

      {erro && (
        <div className="fornecedor-message fornecedor-error">
          ⚠️ {erro}
        </div>
      )}

      <div className="fornecedores-filtros">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por fornecedor, CNPJ, contato ou e-mail..."
        />

        <span>
          {fornecedoresFiltrados.length} fornecedor(es)
        </span>
      </div>

      {fornecedoresFiltrados.length === 0 ? (
        <div className="fornecedores-vazio">
          <h3>Nenhum fornecedor encontrado</h3>

          <p>
            Cadastre o primeiro fornecedor para começar a utilizar
            pedidos de compra.
          </p>

          {!busca && (
            <button
              className="btn-primary"
              onClick={abrirNovo}
            >
              ＋ Cadastrar fornecedor
            </button>
          )}
        </div>
      ) : (
        <div className="fornecedores-tabela-wrapper">
          <table className="fornecedores-tabela">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>Pedidos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {fornecedoresFiltrados.map((f) => (
                <tr key={f.id}>

                  <td>
                    <div className="fornecedor-nome">
                      <strong>
                        {f.trade_name || f.legal_name}
                      </strong>

                      {f.trade_name && (
                        <span>{f.legal_name}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    {f.cnpj || '—'}
                  </td>

                  <td>
                    {f.contact_name || '—'}
                  </td>

                  <td>
                    {f.phone || f.whatsapp || '—'}
                  </td>

                  <td>
                    {Number(f.total_pedidos || 0)}
                  </td>

                  <td>
                    <span
                      className={`fornecedor-status ${
                        f.status === 'ACTIVE'
                          ? 'fornecedor-status-ativo'
                          : 'fornecedor-status-inativo'
                      }`}
                    >
                      {f.status === 'ACTIVE'
                        ? 'Ativo'
                        : 'Inativo'}
                    </span>
                  </td>

                  <td>
                    <div className="fornecedor-acoes">
                      <button
                        className="acao-editar"
                        onClick={() => abrirEdicao(f)}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        className="acao-excluir"
                        onClick={() => excluirFornecedor(f)}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div
          className="fornecedor-modal-overlay"
          onClick={() => !salvando && setModalAberto(false)}
        >
          <div
            className="fornecedor-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="fornecedor-modal-header">
              <div>
                <span>Cadastro</span>
                <h2>
                  {editando
                    ? 'Editar fornecedor'
                    : 'Novo fornecedor'}
                </h2>
              </div>

              <button
                className="fornecedor-modal-fechar"
                onClick={() => setModalAberto(false)}
                disabled={salvando}
              >
                ×
              </button>
            </div>

            <form onSubmit={salvarFornecedor}>

              <div className="fornecedor-form">

                <section>
                  <h3>Dados principais</h3>

                  <div className="fornecedor-grid">

                    <div className="campo">
                      <label>Tipo</label>
                      <select
                        name="type"
                        value={form.type}
                        onChange={alterarCampo}
                      >
                        <option value="PJ">
                          Pessoa Jurídica
                        </option>

                        <option value="PF">
                          Pessoa Física
                        </option>
                      </select>
                    </div>

                    <div className="campo campo-destaque">
                      <label>
                        Razão social / Nome completo *
                      </label>

                      <input
                        name="legal_name"
                        value={form.legal_name}
                        onChange={alterarCampo}
                        required
                      />
                    </div>

                    <div className="campo">
                      <label>Nome fantasia</label>

                      <input
                        name="trade_name"
                        value={form.trade_name}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>CNPJ / CPF</label>

                      <input
                        name="cnpj"
                        value={form.cnpj}
                        onChange={alterarCampo}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div className="campo">
                      <label>Inscrição estadual</label>

                      <input
                        name="state_registration"
                        value={form.state_registration}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Inscrição municipal</label>

                      <input
                        name="municipal_registration"
                        value={form.municipal_registration}
                        onChange={alterarCampo}
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3>Contato</h3>

                  <div className="fornecedor-grid">

                    <div className="campo">
                      <label>Nome do contato</label>
                      <input
                        name="contact_name"
                        value={form.contact_name}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Telefone</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>WhatsApp</label>
                      <input
                        name="whatsapp"
                        value={form.whatsapp}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>E-mail</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo campo-full">
                      <label>Site</label>
                      <input
                        name="website"
                        value={form.website}
                        onChange={alterarCampo}
                        placeholder="https://"
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3>Endereço</h3>

                  <div className="fornecedor-grid">

                    <div className="campo">
                      <label>CEP</label>
                      <input
                        name="zip_code"
                        value={form.zip_code}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo campo-destaque">
                      <label>Logradouro</label>
                      <input
                        name="street"
                        value={form.street}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Número</label>
                      <input
                        name="number"
                        value={form.number}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Complemento</label>
                      <input
                        name="complement"
                        value={form.complement}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Bairro</label>
                      <input
                        name="neighborhood"
                        value={form.neighborhood}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Cidade</label>
                      <input
                        name="city"
                        value={form.city}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>UF</label>
                      <input
                        name="state"
                        value={form.state}
                        onChange={alterarCampo}
                        maxLength="2"
                      />
                    </div>

                  </div>
                </section>

                <section>
                  <h3>Informações comerciais</h3>

                  <div className="fornecedor-grid">

                    <div className="campo">
                      <label>Condição de pagamento</label>
                      <input
                        name="payment_terms"
                        value={form.payment_terms}
                        onChange={alterarCampo}
                        placeholder="Ex.: 28 dias"
                      />
                    </div>

                    <div className="campo">
                      <label>Prazo de entrega (dias)</label>
                      <input
                        type="number"
                        min="0"
                        name="delivery_days"
                        value={form.delivery_days}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Pedido mínimo</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="minimum_order"
                        value={form.minimum_order}
                        onChange={alterarCampo}
                      />
                    </div>

                    <div className="campo">
                      <label>Frete</label>
                      <input
                        name="freight_type"
                        value={form.freight_type}
                        onChange={alterarCampo}
                        placeholder="Ex.: CIF / FOB"
                      />
                    </div>

                    <div className="campo">
                      <label>Status</label>
                      <select
                        name="status"
                        value={form.status}
                        onChange={alterarCampo}
                      >
                        <option value="ACTIVE">
                          Ativo
                        </option>
                        <option value="INACTIVE">
                          Inativo
                        </option>
                      </select>
                    </div>

                    <div className="campo campo-full">
                      <label>Observações</label>

                      <textarea
                        name="notes"
                        value={form.notes}
                        onChange={alterarCampo}
                        rows="4"
                      />
                    </div>

                  </div>
                </section>

              </div>

              <div className="fornecedor-modal-acoes">

                <button
                  type="button"
                  className="btn-secundario"
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={salvando}
                >
                  {salvando
                    ? 'Salvando...'
                    : '✓ Salvar fornecedor'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
