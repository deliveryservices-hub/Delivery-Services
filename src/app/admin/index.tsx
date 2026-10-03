
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

const PRIMARY = '#376194';

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

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'PENDIENTE':
      return {
        label: 'Pendiente',
        color: '#A66B0B',
        background: '#FFF2D6',
        icon: 'time-outline' as const,
      };
    case 'EN_CURSO':
      return {
        label: 'En curso',
        color: '#3175B5',
        background: '#E3F1FF',
        icon: 'car-outline' as const,
      };
    case 'COMPLETADO':
      return {
        label: 'Completado',
        color: '#32804B',
        background: '#E1F4E6',
        icon: 'checkmark-circle-outline' as const,
      };
    default:
      return {
        label: status,
        color: '#66717E',
        background: '#EEF0F3',
        icon: 'help-circle-outline' as const,
      };
  }
};

export default function AdminScreen() {
  const { profile } = useAuth();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;

      const { data, error: routesError } = await supabase
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

      if (routesError) {
        console.error('Error cargando recorridos:', routesError);
        setError('No se pudieron cargar los recorridos de hoy.');
        return;
      }

      const routesData = (data ?? []) as Omit<Route, 'driver'>[];

      const driverIds = [
        ...new Set(
          routesData
            .map((route) => route.driver_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      let driversData: { id: string; name: string | null }[] = [];

      if (driverIds.length > 0) {
        const { data: drivers, error: driversError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', driverIds);

        if (driversError) {
          console.error('Error cargando choferes:', driversError);
          setError('No se pudo obtener la información de los choferes.');
          return;
        }

        driversData = drivers ?? [];
      }

      const routesWithDrivers: Route[] = routesData.map((route) => ({
        ...route,
        driver:
          driversData.find((driver) => driver.id === route.driver_id) ?? null,
      }));

      setRoutes(routesWithDrivers);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setError('Ocurrió un error inesperado al cargar el panel.');
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

  const stats = [
    {
      label: 'Recorridos',
      value: totalRoutes,
      icon: 'car-outline' as const,
      color: PRIMARY,
      background: '#E8F0F9',
    },
    {
      label: 'Entregas',
      value: totalDeliveries,
      icon: 'cube-outline' as const,
      color: PRIMARY,
      background: '#E8F0F9',
    },
    {
      label: 'Pendientes',
      value: pendingDeliveries,
      icon: 'time-outline' as const,
      color: '#A66B0B',
      background: '#FFF2D6',
    },
    {
      label: 'En reparto',
      value: inProgressDeliveries,
      icon: 'bicycle-outline' as const,
      color: '#3175B5',
      background: '#E3F1FF',
    },
    {
      label: 'Entregadas',
      value: completedDeliveries,
      icon: 'checkmark-circle-outline' as const,
      color: '#32804B',
      background: '#E1F4E6',
    },
    {
      label: 'No entregadas',
      value: failedDeliveries,
      icon: 'alert-circle-outline' as const,
      color: '#C83C42',
      background: '#FCE8E7',
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
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

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Hola, {profile?.name || 'Admin'} 👋
            </Text>
            <Text style={styles.subtitle}>
              Panel de administración
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Resumen de hoy</Text>
            <Text style={styles.sectionSubtitle}>
              Estado general de las entregas
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={loadDashboard}
            accessibilityRole="button"
            accessibilityLabel="Actualizar panel"
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={PRIMARY}
            />
          </Pressable>
        </View>

        {error !== '' ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={23}
              color="#C83C42"
            />
            <View style={styles.errorContent}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={loadDashboard}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: stat.background },
                  ]}
                >
                  <Ionicons
                    name={stat.icon}
                    size={21}
                    color={stat.color}
                  />
                </View>

                <Text style={styles.statNumber}>
                  {stat.value}
                </Text>

                <Text style={styles.statLabel}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recorridos de hoy</Text>
            <Text style={styles.sectionSubtitle}>
              Seguimiento de los choferes
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalRoutes}</Text>
          </View>
        </View>

        {routes.length === 0 && error === '' ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="car-outline"
                size={32}
                color="#8A9BAE"
              />
            </View>
            <Text style={styles.emptyTitle}>
              No hay recorridos
            </Text>
            <Text style={styles.emptyText}>
              Todavía no se crearon recorridos para hoy.
            </Text>
          </View>
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

            const status = getStatusConfig(route.status);

            return (
              <View key={route.id} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Ionicons
                        name="person-outline"
                        size={21}
                        color={PRIMARY}
                      />
                    </View>

                    <View style={styles.driverText}>
                      <Text style={styles.driverLabel}>
                        Chofer asignado
                      </Text>
                      <Text style={styles.routeTitle}>
                        {driverName}
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
                    <Text
                      style={[
                        styles.statusText,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeDivider} />

                <View style={styles.routeInfo}>
                  <Ionicons
                    name="cube-outline"
                    size={17}
                    color="#778391"
                  />
                  <Text style={styles.routeInfoText}>
                    {deliveries.length}{' '}
                    {deliveries.length === 1 ? 'entrega' : 'entregas'}
                  </Text>
                </View>

                <View style={styles.deliveryStats}>
                  <View style={styles.deliveryStat}>
                    <View
                      style={[
                        styles.deliveryDot,
                        { backgroundColor: '#D9A441' },
                      ]}
                    />
                    <Text style={styles.deliveryStatText}>
                      {pending} pendientes
                    </Text>
                  </View>

                  <View style={styles.deliveryStat}>
                    <View
                      style={[
                        styles.deliveryDot,
                        { backgroundColor: '#4C91CE' },
                      ]}
                    />
                    <Text style={styles.deliveryStatText}>
                      {inProgress} en reparto
                    </Text>
                  </View>

                  <View style={styles.deliveryStat}>
                    <View
                      style={[
                        styles.deliveryDot,
                        { backgroundColor: '#50A56B' },
                      ]}
                    />
                    <Text style={styles.deliveryStatText}>
                      {completed} entregadas
                    </Text>
                  </View>

                  <View style={styles.deliveryStat}>
                    <View
                      style={[
                        styles.deliveryDot,
                        { backgroundColor: '#D9534F' },
                      ]}
                    />
                    <Text style={styles.deliveryStatText}>
                      {failed} no entregadas
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.viewButton,
                    pressed && styles.viewButtonPressed,
                  ]}
                  onPress={() =>
                    router.push(`/admin/route/${route.id}`)
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.viewButtonText}>
                    Ver recorrido
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#778391',
    marginTop: 12,
    fontSize: 14,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerText: {
    flex: 1,
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
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#202B38',
  },
  subtitle: {
    fontSize: 14,
    color: '#778391',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#202B38',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#84909D',
    marginTop: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F0F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EDF0F3',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: '#202B38',
  },
  statLabel: {
    fontSize: 12,
    color: '#778391',
    marginTop: 4,
    fontWeight: '500',
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#E8F0F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: PRIMARY,
    fontWeight: '800',
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 15,
    borderRadius: 14,
    backgroundColor: '#FFF1F1',
    marginBottom: 24,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    color: '#A62D32',
    fontSize: 13,
    lineHeight: 19,
  },
  retryText: {
    color: '#A62D32',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9EDF2',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#E8F0F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverText: {
    flex: 1,
  },
  driverLabel: {
    color: '#84909D',
    fontSize: 11,
    marginBottom: 3,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#202B38',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#EDF0F3',
    marginVertical: 14,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  routeInfoText: {
    fontSize: 13,
    color: '#596675',
    fontWeight: '600',
  },
  deliveryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 12,
  },
  deliveryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '46%',
  },
  deliveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deliveryStatText: {
    fontSize: 11,
    color: '#687583',
    flexShrink: 1,
  },
  viewButton: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  viewButtonPressed: {
    backgroundColor: '#2B4D78',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9EDF2',
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#303B49',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#84909D',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
});