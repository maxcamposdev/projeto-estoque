// App.jsx — Rotas da aplicação (apenas português)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';
import EstoqueBaixo from './pages/EstoqueBaixo';
import PedidosCompra from './pages/PedidosCompra';
import Fornecedores from './pages/Fornecedores';
import Transferencias from './pages/Transferencias';
import Devolucoes from './pages/Devolucoes';
import './styles/theme.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Login /></Layout>} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/produtos" element={<PrivateRoute><Layout><Produtos /></Layout></PrivateRoute>} />
        <Route path="/movimentacoes" element={<PrivateRoute><Layout><Movimentacoes /></Layout></PrivateRoute>} />
        <Route path="/relatorios" element={<PrivateRoute><Layout><Relatorios /></Layout></PrivateRoute>} />
        <Route path="/estoque-baixo" element={<PrivateRoute><Layout><EstoqueBaixo /></Layout></PrivateRoute>} />
        <Route path="/pedidos-compra" element={<PrivateRoute><Layout><PedidosCompra /></Layout></PrivateRoute>} />
        <Route path="/fornecedores" element={<PrivateRoute><Layout><Fornecedores /></Layout></PrivateRoute>} />
        <Route path="/transferencias" element={<PrivateRoute><Layout><Transferencias /></Layout></PrivateRoute>} />
        <Route path="/devolucoes" element={<PrivateRoute><Layout><Devolucoes /></Layout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
