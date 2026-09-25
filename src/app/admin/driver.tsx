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

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  started_at: string | null;
};

type Tab = 'today' | 'upcoming' | 'history';

export default function AdminDriverScreen() {
  const { profile } = useAuth();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('today');

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

  const getStatusLabel = (status: string) => {
    if (status === 'PENDIENTE') return '🟡 Pendiente';
    if (status === 'EN_CURSO') return '🔵 En curso';
    if (status === 'COMPLETADO') return '🟢 Completado';

    return status;
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

  const getEmptyMessage = () => {
    if (activeTab === 'today') {
      return 'No tenés recorridos para hoy.';
    }

    if (activeTab === 'upcoming') {
      return 'No tenés recorridos próximos.';
    }

    return 'Todavía no tenés recorridos anteriores.';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Mis recorridos
      </Text>

      <Text style={styles.greeting}>
        Hola, {profile?.name ?? 'Admin'}
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
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {getEmptyMessage()}
          </Text>

          <Text style={styles.emptyText}>
            Los recorridos correspondientes a esta sección aparecerán acá.
          </Text>
        </View>
      ) : (
        filteredRoutes.map((route) => (
          <Pressable
            key={route.id}
            style={styles.routeCard}
            onPress={() =>
              router.push({
                pathname: '/admin/driver/route/[id]',
                params: { id: route.id },
                })
            }
          >
            <View style={styles.routeHeader}>
              <Text style={styles.routeDate}>
                {formatDate(route.date)}
              </Text>

              <Text
                style={[
                  styles.status,
                  route.status === 'PENDIENTE' &&
                    styles.statusPending,
                  route.status === 'EN_CURSO' &&
                    styles.statusInProgress,
                  route.status === 'COMPLETADO' &&
                    styles.statusCompleted,
                ]}
              >
                {getStatusLabel(route.status)}
              </Text>
            </View>

            <Text style={styles.info}>
              ⏱ Tiempo por entrega: {route.service_time_minutes} min
            </Text>

            <Text style={styles.openRoute}>
              Ver recorrido →
            </Text>
          </Pressable>
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
    backgroundColor: '#f7f7f7',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },

  greeting: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
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

  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  routeDate: {
    fontSize: 18,
    fontWeight: '700',
  },

  status: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: '600',
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

  info: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },

  openRoute: {
    fontSize: 14,
    fontWeight: '600',
  },

  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
  },
});
