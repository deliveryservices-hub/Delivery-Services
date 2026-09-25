import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Delivery = {
  id: string;
  status: string;
};

type Route = {
  id: string;
  status: string;
  driver_id: string | null;
  driver: {
    id: string;
    name: string | null;
  } | null;
  deliveries: Delivery[];
};

export default function AdminScreen() {
  const { profile } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();

      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');

      const todayString = `${year}-${month}-${day}`;

      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          status,
          driver_id,
          deliveries (
            id,
            status
          )
        `)
        .eq('date', todayString);

      if (error) {
        console.error('Error cargando dashboard:', error);
        return;
      }

      const routesData = data ?? [];

      const driverIds = routesData
        .map((route) => route.driver_id)
        .filter(Boolean);

      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', driverIds);

      if (driversError) {
        console.error('Error cargando choferes:', driversError);
        return;
      }

      const routesWithDrivers = routesData.map((route) => ({
        ...route,
        driver: driversData?.find(
          (driver) => driver.id === route.driver_id
        ) ?? null,
      }));

      setRoutes(routesWithDrivers);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const allDeliveries = routes.flatMap(
    (route) => route.deliveries ?? []
  );

  const totalRoutes = routes.length;
  const totalDeliveries = allDeliveries.length;

  const pendingDeliveries = allDeliveries.filter(
    (delivery) => delivery.status === 'PENDIENTE'
  ).length;

  const inProgressDeliveries = allDeliveries.filter(
    (delivery) => delivery.status === 'EN_CAMINO'
  ).length;

  const completedDeliveries = allDeliveries.filter(
    (delivery) => delivery.status === 'ENTREGADO'
  ).length;

  const failedDeliveries = allDeliveries.filter(
    (delivery) => delivery.status === 'NO_ENTREGADO'
  ).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.greeting}>
        Hola, {profile?.name ?? 'Admin'} 👋
      </Text>

      <Text style={styles.subtitle}>
        Panel de administración
      </Text>

      <Text style={styles.sectionTitle}>
        Resumen de hoy
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <Text style={styles.number}>
            {totalRoutes}
          </Text>

          <Text style={styles.label}>
            Recorridos
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>
            {totalDeliveries}
          </Text>

          <Text style={styles.label}>
            Entregas
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>
            {pendingDeliveries}
          </Text>

          <Text style={styles.label}>
            Pendientes
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>
            {inProgressDeliveries}
          </Text>

          <Text style={styles.label}>
            En reparto
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>
            {completedDeliveries}
          </Text>

          <Text style={styles.label}>
            Entregadas
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.number}>
            {failedDeliveries}
          </Text>

          <Text style={styles.label}>
            No entregadas
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Recorridos de hoy
      </Text>

      {routes.length === 0 ? (
        <Text style={styles.empty}>
          No hay recorridos para hoy.
        </Text>
      ) : (
        routes.map((route) => {
          const deliveries = route.deliveries ?? [];

          const pending = deliveries.filter(
            (delivery) => delivery.status === 'PENDIENTE'
          ).length;

          const inProgress = deliveries.filter(
            (delivery) => delivery.status === 'EN_CAMINO'
          ).length;

          const completed = deliveries.filter(
            (delivery) => delivery.status === 'ENTREGADO'
          ).length;

          const failed = deliveries.filter(
            (delivery) => delivery.status === 'NO_ENTREGADO'
          ).length;

          const driverName =
            route.driver?.name ?? 'Sin chofer asignado';

          return (
            <View
              key={route.id}
              style={styles.routeCard}
            >
              <Text style={styles.routeTitle}>
                {driverName}
              </Text>

              <Text
                style={[
                  styles.routeStatus,
                  route.status === 'PENDIENTE' &&
                    styles.statusPending,
                  route.status === 'EN_CURSO' &&
                    styles.statusInProgress,
                  route.status === 'COMPLETADO' &&
                    styles.statusCompleted,
                ]}
              >
                {route.status === 'PENDIENTE'
                  ? '🟡 Pendiente'
                  : route.status === 'EN_CURSO'
                  ? '🔵 En curso'
                  : route.status === 'COMPLETADO'
                  ? '🟢 Completado'
                  : route.status}
              </Text>

              <Text style={styles.info}>
                {deliveries.length} entregas
              </Text>

              <Text style={styles.deliverySummary}>
                🟡 {pending} pendientes
              </Text>

              <Text style={styles.deliverySummary}>
                🔵 {inProgress} en reparto
              </Text>

              <Text style={styles.deliverySummary}>
                🟢 {completed} entregadas
              </Text>

              <Text style={styles.deliverySummary}>
                🔴 {failed} no entregadas
              </Text>

              <Pressable
                style={styles.viewButton}
                onPress={() =>
                  router.push(`/admin/route/${route.id}`)
                }
              >
                <Text style={styles.viewButtonText}>
                  Ver recorrido →
                </Text>
              </Pressable>
            </View>
          );
        })
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

  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 6,
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },

  card: {
    width: '48%',
    padding: 18,
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
    color: '#555',
  },

  routeCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  routeStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },

  viewButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },

  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  info: {
    fontSize: 14,
    marginBottom: 5,
  },

  empty: {
    color: '#777',
  },

  statusPending: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },

  statusInProgress: {
    backgroundColor: '#D9EDF7',
    color: '#31708F',
  },

  statusCompleted: {
    backgroundColor: '#DFF0D8',
    color: '#3C763D',
  },

  deliverySummary: {
    fontSize: 14,
    marginBottom: 5,
  },
});
