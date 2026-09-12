import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text>Próximamente...</Text>

      <Pressable
        style={styles.logoutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.logoutText}>
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d00',
  },
});
