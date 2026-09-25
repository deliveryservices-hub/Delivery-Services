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
  driver_id: string | null;
  driver: {
    id: string;
    name: string | null;
  } | null;
  deliveries: {
    id: string;
  }[];
};

export default function DeliveriesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeTab, setActiveTab] = useState<
    'today' | 'upcoming' | 'history'
  >('today');
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

  const getTodayLocal = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');

    return `${day}/${month}/${year}`;
  };

  const today = getTodayLocal();

  const filteredRoutes = routes
    .filter((route) => {
      if (activeTab === 'today') {
        return route.date === today;
      }

      if (activeTab === 'upcoming') {
        return route.date > today;
      }

      return route.date < today;
    })
    .sort((a, b) => {
      if (activeTab === 'history') {
        return b.date.localeCompare(a.date);
      }

      return a.date.localeCompare(b.date);
    });

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

        <View style={styles.tabs}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'today' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('today')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'today' && styles.activeTabText,
              ]}
            >
              Hoy
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'upcoming' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'upcoming' && styles.activeTabText,
              ]}
            >
              Próximos
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'history' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'history' && styles.activeTabText,
              ]}
            >
              Historial
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator />
        ) : filteredRoutes.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === 'today'
              ? 'No hay recorridos para hoy.'
              : activeTab === 'upcoming'
                ? 'No hay recorridos próximos.'
                : 'No hay recorridos en el historial.'}
          </Text>
        ) : (
          filteredRoutes.map((route) => (
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
                {formatDate(route.date)}
              </Text>

              <Text style={styles.info}>
                Chofer:{' '}
                {route.driver?.name ?? 'Sin asignar'}
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

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777',
  },

  activeTabText: {
    color: '#222',
  },

  routeStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
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
});
