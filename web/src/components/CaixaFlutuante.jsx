// components/CaixaFlutuante.jsx — Botão "Caixa" / "Sistema" (posição dinâmica = Sair)
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './CaixaFlutuante.css';

export default function CaixaFlutuante() {
  const navigate = useNavigate();
  const location = useLocation();
  const [caixaAberto, setCaixaAberto] = useState(false);
  const [pos, setPos] = useState({ top: 73, right: 40 });
  const btnRef = useRef(null);

  if (location.pathname === '/') return null;

  const isCaixa = location.pathname === '/caixa';

  useEffect(() => {
    const updatePos = () => {
      const sair = document.querySelector('.btn-logout');
      if (sair) {
        const rect = sair.getBoundingClientRect();
        setPos({
          top: Math.round(rect.bottom + 20),
          right: Math.round(window.innerWidth - rect.right)
        });
      }
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos);
    const retry = setInterval(updatePos, 500);
    setTimeout(() => clearInterval(retry), 3000);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
      clearInterval(retry);
    };
  }, []);

  useEffect(() => {
    carregarCaixa();
    const interval = setInterval(carregarCaixa, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarCaixa = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const { data } = await api.get('/sales/caixa/atual');
      setCaixaAberto(!!data.cashRegister);
    } catch {
      setCaixaAberto(false);
    }
  };

  const handleClick = () => {
    if (isCaixa) {
      navigate('/dashboard');
    } else {
      navigate('/caixa');
    }
  };

  return (
    <button
      ref={btnRef}
      className={`caixa-btn ${isCaixa ? 'caixa-btn-sistema' : (caixaAberto ? 'caixa-btn-aberto' : 'caixa-btn-fechado')}`}
      onClick={handleClick}
      style={{ top: pos.top + 'px', right: pos.right + 'px' }}
      title={isCaixa ? 'Voltar ao Sistema' : (caixaAberto ? 'Caixa aberto — clique para ir ao PDV' : 'Caixa fechado — clique para abrir')}
    >
      <span className="caixa-btn-icon">{isCaixa ? '⚙️' : '💰'}</span>
      <span className="caixa-btn-text">{isCaixa ? 'Sistema' : 'Caixa'}</span>
    </button>
  );
}
