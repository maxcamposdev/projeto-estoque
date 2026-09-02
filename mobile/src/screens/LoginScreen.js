import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const entrar = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Atenção', 'Informe seu e-mail e sua senha.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      console.log('Erro no login:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        Alert.alert('Não foi possível entrar', 'E-mail ou senha incorretos.');
      } else {
        Alert.alert('Erro de conexão', 'Não foi possível conectar ao servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  const acessoDemo = async () => {
    setLoading(true);
    try {
      await loginDemo();
    } catch (error) {
      console.log('Erro no acesso demo:', error.response?.data || error.message);
      Alert.alert('Erro de conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.loginScreen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
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

          <TouchableOpacity style={styles.loginButton} onPress={entrar} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.demoButton} onPress={acessoDemo} disabled={loading}>
            <Text style={styles.demoButtonText}>Acessar demonstração</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Sistema de gestão de rotinas de estoque</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginScreen: { flex: 1, backgroundColor: '#0B83B6' },
  loginContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { fontSize: 40, fontWeight: '900', color: '#0B83B6' },
  appTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  appSubtitle: { fontSize: 16, color: '#DFF5FC', marginBottom: 28 },
  loginCard: { width: '100%', maxWidth: 430, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24 },
  welcome: { fontSize: 25, fontWeight: '800', color: '#0F172A' },
  loginDescription: { marginTop: 6, marginBottom: 22, color: '#64748B', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 7, marginTop: 10 },
  input: { height: 52, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, color: '#0F172A' },
  loginButton: { height: 52, borderRadius: 12, backgroundColor: '#0B83B6', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  demoButton: { alignItems: 'center', paddingVertical: 16 },
  demoButtonText: { color: '#0B83B6', fontWeight: '700' },
  footerText: { marginTop: 22, color: '#DFF5FC', textAlign: 'center' },
});
