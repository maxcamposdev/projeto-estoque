import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function EmConstrucaoScreen({ route }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{route.name}</Text>
      <Text style={styles.text}>Esta tela ainda está sendo construída.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  text: { color: '#64748B', textAlign: 'center' },
});
