import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

type Delivery = {
  id: string;
  claim_number: string;
  full_name: string;
  address: string;
  status: string;
  stop_index: number;
};

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  users: {
    id: string;
    name: string;
  }[];
  deliveries: Delivery[];
};

export default function LatamScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          status,
          service_time_minutes,
          users (
            id,
            name
          ),
          deliveries (
            id,
            claim_number,
            full_name,
            address,
            status,
            stop_index
          )
        `)
        .eq('date', today)
        .order('id');

      if (error) {
        console.error('Error cargando recorridos de LATAM:', error);
        return;
      }

      const orderedRoutes = (data as Route[]).map((route) => ({
        ...route,
        deliveries: [...(route.deliveries ?? [])].sort(
          (a, b) => a.stop_index - b.stop_index
        ),
      }));

      setRoutes(orderedRoutes);
    } catch (error) {
      console.error('Error cargando panel de LATAM:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Entregas del día</Text>
          <Text style={styles.subtitle}>
            Panel de LATAM
          </Text>
        </View>

        <Pressable
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.logoutText}>
            Cerrar sesión
          </Text>
        </Pressable>
      </View>

      {routes.length === 0 ? (
        <Text style={styles.empty}>
          No hay recorridos para hoy.
        </Text>
      ) : (
        routes.map((route) => (
          <View key={route.id} style={styles.routeCard}>
            <Text style={styles.driverName}>
              Chofer:{' '}
              {route.users?.[0]?.name ?? 'Sin asignar'}
            </Text>

            <Text style={styles.info}>
              Estado del recorrido: {route.status}
            </Text>

            <Text style={styles.info}>
              Entregas: {route.deliveries.length}
            </Text>

            <View style={styles.deliveriesContainer}>
              {route.deliveries.map((delivery) => (
                <View
                  key={delivery.id}
                  style={styles.deliveryCard}
                >
                  <Text style={styles.stop}>
                    Parada {delivery.stop_index}
                  </Text>

                  <Text style={styles.deliveryName}>
                    {delivery.full_name}
                  </Text>

                  <Text style={styles.info}>
                    Reclamo: {delivery.claim_number}
                  </Text>

                  <Text style={styles.info}>
                    Dirección: {delivery.address}
                  </Text>

                  <Text style={styles.info}>
                    Estado: {delivery.status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  routeCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  driverName: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  info: {
    fontSize: 14,
    marginBottom: 5,
  },

  deliveriesContainer: {
    marginTop: 10,
  },

  deliveryCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },

  stop: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  deliveryName: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
  },

  empty: {
    color: '#777',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
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
