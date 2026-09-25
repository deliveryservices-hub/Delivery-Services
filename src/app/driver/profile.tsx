import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const displayName = profile?.name || 'Chofer';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi perfil</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>CHOFER</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>
            {profile?.email || 'Sin email'}
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>Chofer</Text>
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
    backgroundColor: '#F7F5FA',
    padding: 20,
    paddingTop: 70,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
    marginBottom: 24,
  },

  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#6C3BAA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  avatarText: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '700',
  },

  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },

  roleBadge: {
    backgroundColor: '#EDE4F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  roleText: {
    color: '#6C3BAA',
    fontSize: 12,
    fontWeight: '700',
  },

  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 22,
  },

  infoSection: {
    width: '100%',
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  logoutButton: {
    marginTop: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D9534F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  logoutText: {
    color: '#D9534F',
    fontSize: 16,
    fontWeight: '600',
  },
});
