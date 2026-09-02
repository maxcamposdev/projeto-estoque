import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './src/services/api';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState(null);
  const [rotinas, setRotinas] = useState([]);

  useEffect(() => {
    carregarSessao();
  }, []);

  const carregarSessao = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');

      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
        await carregarRotinas(token);
      }
    } catch (error) {
      console.log('Erro ao carregar sessão:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  const carregarRotinas = async (token) => {
    try {
      const response = await api.get('/rotinas/minhas', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setRotinas(response.data || []);
    } catch (error) {
      console.log('Erro ao carregar rotinas:', error.response?.data || error.message);
    }
  };

  const entrar = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Atenção', 'Informe seu e-mail e sua senha.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, user: usuario } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(usuario));

      setUser(usuario);
      await carregarRotinas(token);
    } catch (error) {
      console.log('Erro no login:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        Alert.alert('Não foi possível entrar', 'E-mail ou senha incorretos.');
      } else {
        Alert.alert(
          'Erro de conexão',
          'Não foi possível conectar ao servidor.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const acessoDemo = async () => {
    setLoading(true);

    try {
      const response = await api.post('/auth/demo');

      const { token, user: usuario } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(usuario));

      setUser(usuario);
      await carregarRotinas(token);
    } catch (error) {
      console.log('Erro no acesso demo:', error.response?.data || error.message);

      Alert.alert(
        'Erro de conexão',
        'Não foi possível conectar ao servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sair = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
    setRotinas([]);
    setEmail('');
    setPassword('');
  };

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando aplicativo...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>E</Text>
          </View>

          <Text style={styles.appTitle}>Estoque</Text>
          <Text style={styles.appSubtitle}>Rotinas & Operação</Text>

          <View style={styles.loginCard}>
            <Text style={styles.welcome}>Bem-vindo</Text>
            <Text style={styles.loginDescription}>
              Acesse suas rotinas, tarefas e comunicações.
            </Text>

            <Text style={styles.label}>E-mail</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <Text style={styles.label}>Senha</Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={entrar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={acessoDemo}
              disabled={loading}
            >
              <Text style={styles.demoButtonText}>
                Acessar demonstração
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Sistema de gestão de rotinas de estoque
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.homeScreen}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.homeContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.smallTitle}>MINHAS ROTINAS</Text>
            <Text style={styles.greeting}>
              Olá, {user.name || 'Funcionário'} 👋
            </Text>
          </View>

          <TouchableOpacity onPress={sair} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.unitCard}>
          <Text style={styles.unitLabel}>UNIDADE</Text>
          <Text style={styles.unitName}>
            Unidade {user.unit_id || 'Principal'}
          </Text>
          <Text style={styles.roleText}>
            {user.role === 'admin' ? 'Administrador' : 'Funcionário'}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rotinas de hoje</Text>
          <Text style={styles.sectionCount}>{rotinas.length}</Text>
        </View>

        {rotinas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              Nenhuma rotina atribuída
            </Text>
            <Text style={styles.emptyText}>
              Quando uma rotina for atribuída a você, ela aparecerá aqui.
            </Text>
          </View>
        ) : (
          rotinas.map((rotina) => (
            <View key={rotina.assignment_id || rotina.id} style={styles.routineCard}>
              <View style={styles.routineIcon}>
                <Text>📋</Text>
              </View>

              <View style={styles.routineInfo}>
                <Text style={styles.routineName}>
                  {rotina.name}
                </Text>

                <Text style={styles.routineProgress}>
                  {rotina.tarefas_concluidas || 0} de{' '}
                  {rotina.total_tarefas || 0} tarefas concluídas
                </Text>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width:
                          rotina.total_tarefas > 0
                            ? `${Math.min(
                                100,
                                ((rotina.tarefas_concluidas || 0) /
                                  rotina.total_tarefas) *
                                  100
                              )}%`
                            : '0%',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.futureCard}>
          <Text style={styles.futureTitle}>🔔 Avisos</Text>
          <Text style={styles.futureText}>
            Avisos importantes da administração aparecerão aqui.
          </Text>
        </View>

        <View style={styles.futureCard}>
          <Text style={styles.futureTitle}>💬 Comunicação</Text>
          <Text style={styles.futureText}>
            Canal de comunicação com Administração, RH e responsáveis.
          </Text>
        </View>

        <View style={styles.futureCard}>
          <Text style={styles.futureTitle}>🙋 Precisa de ajuda?</Text>
          <Text style={styles.futureText}>
            Solicite ajuda diretamente pelo aplicativo.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },

  loginScreen: {
    flex: 1,
    backgroundColor: '#0B83B6',
  },

  loginContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#0B83B6',
  },

  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  appSubtitle: {
    fontSize: 16,
    color: '#DFF5FC',
    marginBottom: 28,
  },

  loginCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
  },

  welcome: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0F172A',
  },

  loginDescription: {
    marginTop: 6,
    marginBottom: 22,
    color: '#64748B',
    lineHeight: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#0F172A',
  },

  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0B83B6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  demoButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  demoButtonText: {
    color: '#0B83B6',
    fontWeight: '700',
  },

  footerText: {
    marginTop: 22,
    color: '#DFF5FC',
    textAlign: 'center',
  },

  homeScreen: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  homeContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  smallTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B83B6',
    letterSpacing: 1,
  },

  greeting: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },

  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  logoutText: {
    color: '#DC2626',
    fontWeight: '700',
  },

  unitCard: {
    backgroundColor: '#0B83B6',
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },

  unitLabel: {
    color: '#CFF3FF',
    fontSize: 11,
    fontWeight: '800',
  },

  unitName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 5,
  },

  roleText: {
    color: '#E0F2FE',
    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  sectionCount: {
    minWidth: 30,
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    color: '#0369A1',
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyIcon: {
    fontSize: 34,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },

  emptyText: {
    marginTop: 7,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  routineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 12,
  },

  routineIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  routineInfo: {
    flex: 1,
  },

  routineName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  routineProgress: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
  },

  progressBackground: {
    height: 7,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#0B83B6',
    borderRadius: 10,
  },

  futureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginTop: 12,
  },

  futureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },

  futureText: {
    marginTop: 6,
    color: '#64748B',
    lineHeight: 20,
  },
});
