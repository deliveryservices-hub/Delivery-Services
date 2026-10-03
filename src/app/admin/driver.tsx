
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const PRIMARY = '#376194';

export default function AdminDriverScreen() {
  const { profile } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('today');

  const loadRoutes = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

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

      setRoutes((data ?? []) as Route[]);
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return {
          label: 'Pendiente',
          background: '#FFF3D6',
          color: '#986B12',
          icon: 'time-outline' as const,
        };
      case 'EN_CURSO':
        return {
          label: 'En curso',
          background: '#E4EFFB',
          color: PRIMARY,
          icon: 'navigate-outline' as const,
        };
      case 'COMPLETADO':
        return {
          label: 'Completado',
          background: '#E2F4E9',
          color: '#287A49',
          icon: 'checkmark-circle-outline' as const,
        };
      default:
        return {
          label: status,
          background: '#EEF0F3',
          color: '#667085',
          icon: 'help-circle-outline' as const,
        };
    }
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
      return 'No tenés recorridos para hoy';
    }
    if (activeTab === 'upcoming') {
      return 'No tenés recorridos próximos';
    }
    return 'Todavía no tenés recorridos anteriores';
  };

  const getEmptyDescription = () => {
    if (activeTab === 'today') {
      return 'Cuando tengas un recorrido asignado para hoy, lo vas a encontrar acá.';
    }
    if (activeTab === 'upcoming') {
      return 'Los recorridos que tengas programados para los próximos días aparecerán acá.';
    }
    return 'A medida que completes tus recorridos, vas a poder consultarlos en esta sección.';
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'upcoming', label: 'Próximos' },
    { key: 'history', label: 'Historial' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.title}>
              {profile?.name ?? 'Chofer'}
            </Text>
            <Text style={styles.subtitle}>
              Acá podés consultar tus recorridos
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="car-outline" size={27} color={PRIMARY} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="clipboard-outline" size={23} color="#FFFFFF" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Recorridos de hoy</Text>
            <Text style={styles.summaryNumber}>
              {routes.filter((route) => route.date === today).length}
            </Text>
          </View>
          <Ionicons name="calendar-outline" size={27} color="#D7E5F5" />
        </View>

        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'today'
              ? 'Recorridos de hoy'
              : activeTab === 'upcoming'
                ? 'Próximos recorridos'
                : 'Recorridos anteriores'}
          </Text>
          {!loading && (
            <Text style={styles.routeCount}>
              {filteredRoutes.length}{' '}
              {filteredRoutes.length === 1 ? 'recorrido' : 'recorridos'}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text style={styles.loadingText}>Cargando recorridos...</Text>
          </View>
        ) : filteredRoutes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  activeTab === 'history'
                    ? 'file-tray-outline'
                    : activeTab === 'upcoming'
                      ? 'calendar-outline'
                      : 'car-outline'
                }
                size={34}
                color={PRIMARY}
              />
            </View>
            <Text style={styles.emptyTitle}>{getEmptyMessage()}</Text>
            <Text style={styles.emptyText}>{getEmptyDescription()}</Text>
          </View>
        ) : (
          filteredRoutes.map((route) => {
            const status = getStatusConfig(route.status);

            return (
              <Pressable
                key={route.id}
                style={({ pressed }) => [
                  styles.routeCard,
                  pressed && styles.routeCardPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: '/admin/driver/route/[id]',
                    params: { id: route.id },
                  })
                }
              >
                <View style={styles.routeHeader}>
                  <View style={styles.dateContainer}>
                    <View style={styles.dateIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={19}
                        color={PRIMARY}
                      />
                    </View>
                    <View>
                      <Text style={styles.dateLabel}>Fecha del recorrido</Text>
                      <Text style={styles.routeDate}>
                        {formatDate(route.date)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.background },
                    ]}
                  >
                    <Ionicons
                      name={status.icon}
                      size={14}
                      color={status.color}
                    />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.routeInfo}>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color="#667085"
                    />
                    <Text style={styles.infoText}>
                      {route.service_time_minutes} min por entrega
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.openRoute}>Ver recorrido</Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={21}
                    color={PRIMARY}
                  />
                </View>
              </Pressable>
            );
          })
        )}

        {!loading && (
          <Pressable style={styles.refreshButton} onPress={loadRoutes}>
            <Ionicons name="refresh-outline" size={17} color={PRIMARY} />
            <Text style={styles.refreshText}>Actualizar recorridos</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  greeting: {
    fontSize: 15,
    color: '#667085',
    marginBottom: 2,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#1D2939',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    color: '#667085',
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    gap: 13,
  },
  summaryIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#E2EAF4',
    marginBottom: 3,
  },
  summaryNumber: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E9EDF3',
    borderRadius: 13,
    padding: 4,
    marginBottom: 23,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  activeTabText: {
    color: PRIMARY,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344054',
  },
  routeCount: {
    fontSize: 12,
    color: '#667085',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 55,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#667085',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#E9EDF3',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344054',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#667085',
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    elevation: 2,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  routeCardPressed: {
    opacity: 0.75,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 3,
  },
  routeDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2939',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EEF0F4',
    marginBottom: 13,
  },
  routeInfo: {
    marginBottom: 13,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#667085',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    paddingTop: 12,
  },
  openRoute: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY,
  },
});