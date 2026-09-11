import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function AdminScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Hola, {profile?.name ?? 'Admin'} 👋
      </Text>

      <Text style={styles.subtitle}>
        Panel de administración
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <Text style={styles.number}>12</Text>
          <Text style={styles.label}>Reclamos</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>5</Text>
          <Text style={styles.label}>En reparto</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>4</Text>
          <Text style={styles.label}>Pendientes</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>8</Text>
          <Text style={styles.label}>Entregados</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },

  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 16,
    marginTop: 6,
    marginBottom: 30,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
  },

  number: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  label: {
    marginTop: 5,
    fontSize: 14,
  },
});
