import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name?.charAt(0).toUpperCase() ?? 'A'}
          </Text>
        </View>

        <Text style={styles.title}>
          {profile?.name ?? 'Administrador'}
        </Text>

        <Text style={styles.role}>Administrador</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>
            {profile?.name ?? 'Sin informar'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>
            {profile?.email ?? 'Sin informar'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>Administrador</Text>
        </View>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f7f7',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 25,
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e9e9e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },

  role: {
    fontSize: 14,
    color: '#777',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
  },

  infoRow: {
    gap: 4,
  },

  label: {
    fontSize: 13,
    color: '#777',
  },

  value: {
    fontSize: 16,
    fontWeight: '500',
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: '#d00',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },

  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d00',
  },
});
