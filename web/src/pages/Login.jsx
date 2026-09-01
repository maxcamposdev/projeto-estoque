import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValido) {
      setError('Informe um e-mail válido.');
      return;
    }

    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        setError('E-mail ou senha incorretos.');
      } else if (status === 400) {
        setError('Informe e-mail e senha.');
      } else {
        setError(
          'Erro ao conectar com o servidor. Verifique se a API está no ar.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/demo');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      setError(
        'Erro ao conectar com o servidor. Verifique se a API está no ar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const whatsappUrl =
    'https://wa.me/5541995712235?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20sistema.';

  const instagramUrl =
    'https://www.instagram.com/';

  return (
    <main className="login-container">

      {/* FORMAS DECORATIVAS */}
      <div className="login-shape login-shape-1"></div>
      <div className="login-shape login-shape-2"></div>
      <div className="login-shape login-shape-3"></div>
      <div className="login-shape login-shape-4"></div>

      {/* BOTÃO DE TEMA */}
      <button
        type="button"
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Alternar tema"
        title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        <span className="theme-icon">
          {theme === 'dark' ? '☀' : '☾'}
        </span>

        <span className="theme-label">
          {theme === 'dark' ? 'Claro' : 'Escuro'}
        </span>
      </button>

      {/* CARD PRINCIPAL */}
      <section className="login-card">

        {/* LOGO / IDENTIDADE */}
        <div className="login-brand">

          <div className="text-logo">
            SUALOGO
          </div>

          <div className="company-name">
            [Sua Empresa]
          </div>

          <h2>
            Gestão inteligente para o crescimento da sua empresa
          </h2>

          <p className="company-description">
            Tenha mais controle, organização e eficiência para administrar
            seus processos em um único lugar.
          </p>

        </div>

        <div className="login-separator"></div>

        {/* LOGIN */}
        <div className="login-content">

          <div className="login-header">
            <h1>Bem-vindo!</h1>
            <p>Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">

            <div className="form-group">
              <label htmlFor="email">
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">

              <div className="password-label-row">
                <label htmlFor="password">
                  Senha
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={(e) => e.preventDefault()}
                >
                  Esqueceu sua senha?
                </button>
              </div>

              <div className="password-wrapper">

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="btn-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  title={
                    showPassword
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                >
                  {showPassword ? '🙈' : '👁'}
                </button>

              </div>

            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>

          <div className="login-divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            className="btn-demo"
            onClick={handleDemoAccess}
            disabled={loading}
          >
            <span>🚀</span>
            Acessar demonstração
          </button>

          <p className="demo-description">
            Explore os recursos do sistema utilizando dados fictícios.
          </p>

          <p className="create-account">
            Ainda não possui uma conta?

            <button
              type="button"
              onClick={(e) => e.preventDefault()}
            >
              Criar conta
            </button>
          </p>

        </div>

        <div className="product-name">
          Sistema de Gestão de Estoque
        </div>

      </section>
{/* =====================================================
          COMUNICAÇÃO COMERCIAL — LATERAIS
          ===================================================== */}

      <aside className="login-marketing login-marketing-left">

        <div className="marketing-line">
          <span></span>
        </div>

        <div className="marketing-kicker">
          CONTROLE SEM COMPLICAÇÃO
        </div>

        <div className="marketing-title">
          ESTOQUE
          <br />
          <span>CAIXA</span>
          <br />
          VENDAS
        </div>

        <p className="marketing-description">
          Tudo o que o seu negócio precisa
          para trabalhar com mais controle.
        </p>
        
        <div className="marketing-socials">

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="marketing-social marketing-social-whatsapp"
            aria-label="Falar pelo WhatsApp"
            title="Falar pelo WhatsApp"
          >
            <span className="marketing-social-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.198-.497.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.075c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.374a9.86 9.86 0 1 1 8.372 4.632m8.596-18.631A12.012 12.012 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142.588 5.945L.057 24l6.304-1.654a11.95 11.95 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.295-8.747"/>
              </svg>
            </span>

            <span className="marketing-social-copy">
              <small>FALE COMIGO</small>
              <strong>WhatsApp</strong>
            </span>

            <span className="marketing-social-arrow">↗</span>
          </a>

          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="marketing-social marketing-social-instagram"
            aria-label="Conhecer trabalhos no Instagram"
            title="Conhecer trabalhos no Instagram"
          >
            <span className="marketing-social-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/>
              </svg>
            </span>

            <span className="marketing-social-copy">
              <small>CONHEÇA MEU TRABALHO</small>
              <strong>Instagram</strong>
            </span>

            <span className="marketing-social-arrow">↗</span>
          </a>

        </div>

      </aside>


      <aside className="login-marketing login-marketing-right">

        <div className="marketing-number">
          01 <span>→</span>
        </div>

        <div className="marketing-question">
          Seu negócio
          <br />
          <strong>pode ser mais organizado.</strong>
        </div>

        <p className="marketing-description">
          Conheça o sistema e descubra
          uma forma mais simples de
          controlar sua operação.
        </p>

      </aside>


    </main>
  );
}
