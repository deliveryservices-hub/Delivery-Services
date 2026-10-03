
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

type Tab = 'today' | 'upcoming' | 'history';

const PRIMARY = '#376194';

export default function DeliveriesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [loading, setLoading] = useState(true);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRoutes();
      setRoutes((data ?? []) as Route[]);
    } catch (error) {
      console.error('Error cargando recorridos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const todayRoutes = routes.filter((route) => route.date === today);
  const activeRoutes = routes.filter((route) => route.status === 'EN_CURSO');

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: 'upcoming', label: 'Próximos' },
    { key: 'history', label: 'Historial' },
  ];

  const getEmptyMessage = () => {
    if (activeTab === 'today') return 'No hay recorridos para hoy';
    if (activeTab === 'upcoming') return 'No hay recorridos próximos';
    return 'No hay recorridos en el historial';
  };

  const getEmptyDescription = () => {
    if (activeTab === 'today') {
      return 'Los recorridos programados para hoy aparecerán en esta sección.';
    }
    if (activeTab === 'upcoming') {
      return 'Acá vas a encontrar los recorridos asignados para los próximos días.';
    }
    return 'Los recorridos de fechas anteriores se mostrarán acá.';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>ADMINISTRACIÓN</Text>
            <Text style={styles.title}>Recorridos</Text>
            <Text style={styles.subtitle}>
              Creá y gestioná los recorridos de entrega
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="map-outline" size={27} color={PRIMARY} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="calendar-outline" size={19} color={PRIMARY} />
            </View>
            <Text style={styles.summaryLabel}>Hoy</Text>
            <Text style={styles.summaryNumber}>{todayRoutes.length}</Text>
            <Text style={styles.summaryCaption}>
              {todayRoutes.length === 1 ? 'recorrido' : 'recorridos'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, styles.activeSummaryIcon]}>
              <Ionicons name="navigate-outline" size={19} color="#287A49" />
            </View>
            <Text style={styles.summaryLabel}>En curso</Text>
            <Text style={styles.summaryNumber}>{activeRoutes.length}</Text>
            <Text style={styles.summaryCaption}>
              {activeRoutes.length === 1 ? 'recorrido' : 'recorridos'}
            </Text>
          </View>
        </View>

        <View style={styles.createSection}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingIcon}>
              <Ionicons name="add-circle-outline" size={20} color={PRIMARY} />
            </View>
            <Text style={styles.sectionTitle}>Crear recorrido</Text>
          </View>

          <CreateRouteForm onRouteCreated={loadRoutes} />
        </View>

        <View style={styles.listContainer}>
          <View style={styles.listHeading}>
            <View>
              <Text style={styles.sectionTitle}>Todos los recorridos</Text>
              <Text style={styles.sectionSubtitle}>
                Consultá los recorridos por fecha
              </Text>
            </View>
            <Pressable
              style={styles.refreshIconButton}
              onPress={loadRoutes}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={PRIMARY} />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={PRIMARY} />
              )}
            </Pressable>
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

          {!loading && (
            <Text style={styles.routeCount}>
              {filteredRoutes.length}{' '}
              {filteredRoutes.length === 1 ? 'recorrido' : 'recorridos'}
            </Text>
          )}

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
                      pathname: '/admin/route/[id]',
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
                      <View style={styles.dateContent}>
                        <Text style={styles.dateLabel}>Fecha</Text>
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

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color="#667085"
                      />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Chofer</Text>
                        <Text style={styles.detailValue}>
                          {route.driver?.name ?? 'Sin asignar'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Ionicons
                        name="cube-outline"
                        size={17}
                        color="#667085"
                      />
                      <Text style={styles.metricText}>
                        {route.deliveries?.length ?? 0}{' '}
                        {route.deliveries?.length === 1
                          ? 'entrega'
                          : 'entregas'}
                      </Text>
                    </View>

                    <View style={styles.metric}>
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color="#667085"
                      />
                      <Text style={styles.metricText}>
                        {route.service_time_minutes} min por entrega
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.openRoute}>Ver detalles</Text>
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
        </View>
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
  headerTextContainer: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: PRIMARY,
    marginBottom: 5,
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
    marginLeft: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    padding: 14,
    elevation: 2,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  activeSummaryIcon: {
    backgroundColor: '#E2F4E9',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D2939',
  },
  summaryCaption: {
    fontSize: 11,
    color: '#98A2B3',
    marginTop: 1,
  },
  createSection: {
    marginBottom: 28,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },
  sectionHeadingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344054',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
  },
  listContainer: {
    marginTop: 2,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  refreshIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E9EDF3',
    borderRadius: 13,
    padding: 4,
    marginBottom: 12,
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
  routeCount: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 45,
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
  dateContent: {
    flex: 1,
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
  detailRow: {
    marginBottom: 13,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  detailContent: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    fontSize: 11,
    color: '#667085',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 12,
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
});