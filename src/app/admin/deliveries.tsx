import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from 'react-native';
import { router } from 'expo-router';
import CreateRouteForm from '@/components/admin/CreateRouteForm';
import { getRoutes } from '@/services/routesService';

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  started_at: string | null;
  driver_id: string;
  users: {
    id: string;
    name: string;
  }[];
  deliveries: {
    id: string;
  }[];
};

export default function DeliveriesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getRoutes();

      setRoutes(data as Route[]);
    } catch (error) {
      console.error('Error cargando recorridos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <CreateRouteForm
        onRouteCreated={loadRoutes}
      />

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          Recorridos
        </Text>

        {loading ? (
          <ActivityIndicator />
        ) : routes.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay recorridos creados.
          </Text>
        ) : (
          routes.map((route) => (
            <Pressable
              key={route.id}
              style={styles.routeCard}
              onPress={() =>
                router.push({ 
                    pathname: `/admin/route/[id]`,
                    params: { 
                        id: route.id 
                    }
                })
              }
            >
              <Text style={styles.routeDate}>
                {route.date}
              </Text>

              <Text style={styles.info}>
                Chofer:{' '}
                {route.users?.[0]?.name ?? 'Sin asignar'}
              </Text>

              <Text style={styles.info}>
                Estado: {route.status}
              </Text>

              <Text style={styles.info}>
                Tiempo por entrega:{' '}
                {route.service_time_minutes} min
              </Text>

              <Text style={styles.info}>
                Entregas: {route.deliveries?.length ?? 0}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },

  listContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
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

  emptyText: {
    color: '#777',
  },
});
