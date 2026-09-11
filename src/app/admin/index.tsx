import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminScreen() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de administración</Text>

      <Text style={styles.welcome}>
        Bienvenido, {profile?.name ?? 'Admin'}
      </Text>

      <Pressable
        style={styles.button}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>
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
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  welcome: {
    fontSize: 16,
    marginBottom: 30,
  },

  button: {
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
