import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSessao();
  }, []);

  const carregarSessao = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const savedToken = await AsyncStorage.getItem('token');

      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (error) {
      console.log('Erro ao carregar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: novoToken, user: usuario } = response.data;
    await AsyncStorage.setItem('token', novoToken);
    await AsyncStorage.setItem('user', JSON.stringify(usuario));
    setToken(novoToken);
    setUser(usuario);
  };

  const loginDemo = async () => {
    const response = await api.post('/auth/demo');
    const { token: novoToken, user: usuario } = response.data;
    await AsyncStorage.setItem('token', novoToken);
    await AsyncStorage.setItem('user', JSON.stringify(usuario));
    setToken(novoToken);
    setUser(usuario);
  };

  const sair = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginDemo, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }
  return context;
}
