// App.jsx — Rotas da aplicação (apenas português)
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ConsultaEstoque from './pages/ConsultaEstoque';
import Comunicacao from './pages/Comunicacao';
import Caixa from './pages/Caixa';
import ChatFlutuante from './components/ChatFlutuante';
import CaixaFlutuante from './components/CaixaFlutuante';
import './styles/theme.css';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
}

function AuthenticatedLayout({ children }) {
  return (
    <>
      <Layout>
        {children}
      </Layout>

      <ChatFlutuante />
      <CaixaFlutuante />
              </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><Login /></Layout>} />
        <Route path="/dashboard" element={<PrivateRoute><AuthenticatedLayout><Dashboard /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/produtos" element={<PrivateRoute><AuthenticatedLayout><Produtos /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/movimentacoes" element={<PrivateRoute><AuthenticatedLayout><Movimentacoes /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/relatorios" element={<PrivateRoute><AuthenticatedLayout><Relatorios /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/estoque-baixo" element={<PrivateRoute><AuthenticatedLayout><EstoqueBaixo /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/pedidos-compra" element={<PrivateRoute><AuthenticatedLayout><PedidosCompra /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/fornecedores" element={<PrivateRoute><AuthenticatedLayout><Fornecedores /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/transferencias" element={<PrivateRoute><AuthenticatedLayout><Transferencias /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/devolucoes" element={<PrivateRoute><AuthenticatedLayout><Devolucoes /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/consulta-estoque" element={<PrivateRoute><AuthenticatedLayout><ConsultaEstoque /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="/caixa" element={<PrivateRoute><AuthenticatedLayout><Caixa /></AuthenticatedLayout></PrivateRoute>} />
          <Route path="/comunicacao" element={<PrivateRoute><AuthenticatedLayout><Comunicacao /></AuthenticatedLayout></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
