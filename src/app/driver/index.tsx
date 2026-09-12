import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  started_at: string | null;
};

export default function DriverHomeScreen() {
  const { profile, signOut } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const loadRoutes = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          status,
          service_time_minutes,
          started_at
        `)
        .eq('driver_id', profile.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error cargando recorridos:', error);
        return;
      }

      setRoutes(data as Route[]);
    } catch (error) {
      console.error('Error cargando recorridos:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Mis recorridos
      </Text>

      <Text style={styles.greeting}>
        Hola, {profile?.name ?? 'Chofer'}
      </Text>

      {loading ? (
        <ActivityIndicator />
      ) : routes.length === 0 ? (
        <Text style={styles.empty}>
          No tenés recorridos asignados.
        </Text>
      ) : (
        routes.map((route) => (
          <Pressable
            key={route.id}
            style={styles.routeCard}
            onPress={() =>
              router.push({
                pathname: '/driver/route/[id]',
                params: { id: route.id },
              })
            }
          >
            <Text style={styles.routeDate}>
              {route.date}
            </Text>

            <Text style={styles.info}>
              Estado: {route.status}
            </Text>

            <Text style={styles.info}>
              Tiempo por entrega: {route.service_time_minutes} min
            </Text>
          </Pressable>
        ))
      )}

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
    padding: 20,
    paddingTop: 70,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  greeting: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },

  routeCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  routeDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  info: {
    fontSize: 15,
    marginBottom: 4,
  },

  empty: {
    color: '#777',
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
