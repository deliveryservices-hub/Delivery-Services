
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
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

export default function DriverHomeScreen() {
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
    if (status === 'PENDIENTE') return 'Pendiente';
    if (status === 'EN_CURSO') return 'En curso';
    if (status === 'COMPLETADO') return 'Completado';
    return status;
  };

  const getStatusStyle = (status: string) => {
    if (status === 'PENDIENTE') return styles.statusPending;
    if (status === 'EN_CURSO') return styles.statusInProgress;
    if (status === 'COMPLETADO') return styles.statusCompleted;
    return styles.statusDefault;
  };

  const today = getTodayLocal();

  const filteredRoutes = routes
    .filter((route) => {
      if (activeTab === 'today') return route.date === today;
      if (activeTab === 'upcoming') return route.date > today;
      return route.date < today;
    })
    .sort((a, b) => {
      if (activeTab === 'history') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });

  const pendingCount = filteredRoutes.filter(
    (route) => route.status === 'PENDIENTE'
  ).length;

  const inProgressCount = filteredRoutes.filter(
    (route) => route.status === 'EN_CURSO'
  ).length;

  const completedCount = filteredRoutes.filter(
    (route) => route.status === 'COMPLETADO'
  ).length;

  const getTabTitle = () => {
    if (activeTab === 'today') return 'Recorridos de hoy';
    if (activeTab === 'upcoming') return 'Próximos recorridos';
    return 'Recorridos anteriores';
  };

  const getEmptyMessage = () => {
    if (activeTab === 'today') return 'No tenés recorridos para hoy.';
    if (activeTab === 'upcoming') return 'No tenés recorridos próximos.';
    return 'Todavía no tenés recorridos anteriores.';
  };

  
  const testGeocoding = async () => {
    const { data, error } = await supabase.functions.invoke(
      "geocode-address",
      {
        body: {
          address: "Obelisco, Buenos Aires, Argentina",
        },
      }
    );

    if (error) {
      console.error("Error de geocodificación:", error);
      return;
    }

    console.log("Resultado:", data);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <Text style={styles.brandDelivery}>DELIVERY</Text>
          <Text style={styles.brandServices}>SERVICES</Text>
        </View>
        <Image
          source={require('../../../assets/valija.png')}
          style={{ width: 56, height: 56, resizeMode: 'contain' }}
        />
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>
          Hola, {profile?.name ?? 'Chofer'} 👋
        </Text>
        <Text style={styles.subtitle}>
          ¿Listo para comenzar tu jornada?
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de actividad</Text>
        <Text style={styles.summaryDescription}>
          {activeTab === 'today'
            ? 'El estado de tus recorridos de hoy'
            : 'El estado de los recorridos de esta sección'}
        </Text>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.pendingIcon]}>
              <Text style={styles.statIconText}>○</Text>
            </View>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.progressIcon]}>
              <Text style={styles.statIconText}>↗</Text>
            </View>
            <Text style={styles.statNumber}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>En curso</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIcon, styles.completedIcon]}>
              <Text style={styles.statIconText}>✓</Text>
            </View>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis recorridos</Text>
        <Text style={styles.routeCount}>
          {filteredRoutes.length} {filteredRoutes.length === 1 ? 'recorrido' : 'recorridos'}
        </Text>
      </View>

      <View style={styles.tabs}>
        {([
          { key: 'today', label: 'Hoy' },
          { key: 'upcoming', label: 'Próximos' },
          { key: 'history', label: 'Historial' },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.listTitle}>{getTabTitle()}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#376194" />
          <Text style={styles.loadingText}>Cargando recorridos...</Text>
        </View>
      ) : filteredRoutes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>▤</Text>
          </View>
          <Text style={styles.emptyTitle}>{getEmptyMessage()}</Text>
          <Text style={styles.emptyText}>
            Los recorridos correspondientes a esta sección aparecerán acá.
          </Text>
        </View>
      ) : (
        filteredRoutes.map((route) => (
          <Pressable
            key={route.id}
            style={({ pressed }) => [
              styles.routeCard,
              pressed && styles.routeCardPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/driver/route/[id]',
                params: { id: route.id },
              })
            }
          >
            <View style={styles.routeHeader}>
              <View style={styles.dateSection}>
                <View style={styles.calendarIcon}>
                  <Text style={styles.calendarIconText}>▦</Text>
                </View>
                <View>
                  <Text style={styles.dateCaption}>Fecha del recorrido</Text>
                  <Text style={styles.routeDate}>
                    {formatDate(route.date)}
                  </Text>
                </View>
              </View>

              <View style={[styles.statusBadge, getStatusStyle(route.status)]}>
                <View style={[styles.statusDot, getStatusStyle(route.status)]} />
                <Text style={[styles.statusText, getStatusStyle(route.status)]}>
                  {getStatusLabel(route.status)}
                </Text>
              </View>
            </View>

            <View style={styles.routeDivider} />

            <View style={styles.routeInfoRow}>
              <View style={styles.routeInfo}>
                <Text style={styles.infoLabel}>Tiempo por entrega</Text>
                <Text style={styles.infoValue}>
                  {route.service_time_minutes} min
                </Text>
              </View>
              {route.started_at && (
                <View style={styles.routeInfo}>
                  <Text style={styles.infoLabel}>Inicio</Text>
                  <Text style={styles.infoValue}>
                    {new Date(route.started_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.openRouteRow}>
              <Text style={styles.openRoute}>Ver detalle del recorrido</Text>
              <Text style={styles.openRouteArrow}>→</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5F8',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brand: {
    gap: 0,
  },
  brandDelivery: {
    color: '#EF3038',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  brandServices: {
    color: '#376194',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#376194',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  welcomeSection: {
    marginBottom: 22,
  },
  greeting: {
    fontSize: 25,
    fontWeight: '800',
    color: '#253047',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#737E8D',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#253047',
  },
  summaryDescription: {
    fontSize: 12,
    color: '#8993A1',
    marginTop: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  pendingIcon: {
    backgroundColor: '#FFF0D9',
  },
  progressIcon: {
    backgroundColor: '#E8F0FA',
  },
  completedIcon: {
    backgroundColor: '#E4F5EF',
  },
  statIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#376194',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#253047',
  },
  statLabel: {
    fontSize: 11,
    color: '#7D8795',
    marginTop: 3,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 55,
    backgroundColor: '#EDF0F3',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#253047',
  },
  routeCount: {
    fontSize: 12,
    color: '#7D8795',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E7EBF0',
    borderRadius: 13,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#253047',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7D8795',
  },
  activeTabText: {
    color: '#376194',
    fontWeight: '800',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#596577',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: '#7D8795',
    fontSize: 13,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyIconText: {
    fontSize: 29,
    color: '#376194',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#253047',
    textAlign: 'center',
    marginBottom: 7,
  },
  emptyText: {
    fontSize: 13,
    color: '#7D8795',
    lineHeight: 19,
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    shadowColor: '#253047',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  routeCardPressed: {
    opacity: 0.8,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flexShrink: 1,
  },
  calendarIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconText: {
    fontSize: 22,
    color: '#376194',
  },
  dateCaption: {
    fontSize: 11,
    color: '#8993A1',
    marginBottom: 3,
  },
  routeDate: {
    fontSize: 17,
    fontWeight: '800',
    color: '#253047',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#FFF2DB',
    color: '#A66A08',
  },
  statusInProgress: {
    backgroundColor: '#E8F0FA',
    color: '#376194',
  },
  statusCompleted: {
    backgroundColor: '#E4F5EF',
    color: '#20866B',
  },
  statusDefault: {
    backgroundColor: '#EDF0F3',
    color: '#596577',
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#EDF0F3',
    marginVertical: 15,
  },
  routeInfoRow: {
    flexDirection: 'row',
    gap: 25,
    marginBottom: 15,
  },
  routeInfo: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8993A1',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#253047',
  },
  openRouteRow: {
    borderTopWidth: 1,
    borderTopColor: '#EDF0F3',
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openRoute: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF3038',
  },
  openRouteArrow: {
    fontSize: 20,
    color: '#EF3038',
    fontWeight: '700',
  },
});
