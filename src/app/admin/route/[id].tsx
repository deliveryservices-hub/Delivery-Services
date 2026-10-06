import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import CreateDeliveryForm from '@/components/admin/CreateDeliveryForm';
import { supabase } from '@/lib/supabase';
import { 
  deleteDelivery,
  getDeliveriesByRoute,
  updateDeliveryOrder 
 } from '@/services/deliveriesService';

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
};

type Delivery = {
  id: string;
  claim_number: string;
  full_name: string;
  email: string;
  address: string;
  phone: string | null;
  status: string;
  stop_index: number;
  eta_window_start: string | null;
  eta_window_end: string | null;
  last_updated_at: string | null;
};

type DriverLocation = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
};

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] =
  useState<Delivery | null>(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const listRef = useRef<any>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [locations, setLocations] = useState<DriverLocation[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          date,
          status,
          service_time_minutes,
          started_at,
          driver_id
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error cargando recorrido:', error);
        return;
      }

      let driver = null;

      if (data.driver_id) {
        const { data: driverData, error: driverError } =
          await supabase
            .from('users')
            .select('id, name')
            .eq('id', data.driver_id)
            .maybeSingle();

        if (driverError) {
          console.error('Error cargando chofer:', driverError);
        }

        driver = driverData;
      }

      setRoute({
        ...data,
        driver,
      });

      const deliveriesData = await getDeliveriesByRoute(id);

      setDeliveries(deliveriesData as Delivery[]);

      if (data.driver_id) {
        const { data: locationsData, error: locationsError } =
          await supabase
            .from('driver_locations')
            .select(
              'id, latitude, longitude, accuracy, recorded_at'
            )
            .eq('route_id', id)
            .order('recorded_at', {
              ascending: true,
            });

        if (locationsError) {
          console.error(
            'Error cargando ubicaciones:',
            locationsError
          );
        } else {
          setLocations(
            (locationsData ?? []) as DriverLocation[]
          );
        }
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`route-status-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'routes',
          filter: `id=eq.${id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadData]);

  useEffect(() => {
    if (selectedDelivery) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    }
  }, [selectedDelivery]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el recorrido.</Text>
      </View>
    );
  }

  const handleSaveOrder = async () => {
    if (route.status !== 'PENDIENTE') {
      Alert.alert(
        'Recorrido iniciado',
        'No se puede modificar el orden de las entregas una vez iniciado el recorrido.'
      );
      return;
    }

    try {
      for (let index = 0; index < deliveries.length; index++) {
        await updateDeliveryOrder(
          deliveries[index].id,
          index + 1
        );
      }

      setDeliveries((current) =>
        current.map((delivery, index) => ({
          ...delivery,
          stop_index: index + 1,
        }))
      );

      setOrderChanged(false);

      Alert.alert(
        'Orden actualizado',
        'El nuevo orden de las entregas se guardó correctamente.'
      );
    } catch (error) {
      console.error('Error guardando orden:', error);

      Alert.alert(
        'Error',
        'No se pudo guardar el nuevo orden.'
      );

      await loadData();
    }
  };

  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleDeleteDelivery = (delivery: Delivery) => {
    Alert.alert(
      'Eliminar entrega',
      `¿Seguro que querés eliminar la entrega de ${delivery.full_name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDelivery(delivery.id);
              await loadData();
            } catch (error) {
              console.error('Error eliminando entrega:', error);

              Alert.alert(
                'Error',
                'No se pudo eliminar la entrega.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DraggableFlatList
        data={deliveries}
        ref={listRef}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          if (route.status !== 'PENDIENTE') {
            return;
          }

          const reordered = data.map((delivery, index) => ({
            ...delivery,
            stop_index: index + 1,
          }));

          setDeliveries(reordered);
          setOrderChanged(true);
        }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>
                ‹  Mis recorridos
              </Text>
            </Pressable>

            <Text style={styles.title}>
              Detalle del recorrido
            </Text>

            <Text style={styles.subtitle}>
              Consultá la ruta, el chofer y las entregas asignadas.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryTitleGroup}>
                  <Text style={styles.eyebrow}>
                    RECORRIDO
                  </Text>

                  <Text style={styles.summaryDate}>
                    {formatDate(route.date)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.routeStatusBadge,
                    route.status === 'PENDIENTE' &&
                      styles.routeStatusPending,
                    route.status === 'EN_CURSO' &&
                      styles.routeStatusInProgress,
                    route.status === 'COMPLETADO' &&
                      styles.routeStatusCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      route.status === 'PENDIENTE' &&
                        styles.statusDotPending,
                      route.status === 'EN_CURSO' &&
                        styles.statusDotInProgress,
                      route.status === 'COMPLETADO' &&
                        styles.statusDotCompleted,
                    ]}
                  />

                  <Text
                    style={[
                      styles.routeStatusText,
                      route.status === 'PENDIENTE' &&
                        styles.routeStatusTextPending,
                      route.status === 'EN_CURSO' &&
                        styles.routeStatusTextInProgress,
                      route.status === 'COMPLETADO' &&
                        styles.routeStatusTextCompleted,
                    ]}
                  >
                    {route.status === 'PENDIENTE'
                      ? 'Pendiente'
                      : route.status === 'EN_CURSO'
                        ? 'En curso'
                        : route.status === 'COMPLETADO'
                          ? 'Completado'
                          : route.status}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {(route.driver?.name ?? 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.driverInfo}>
                  <Text style={styles.smallLabel}>
                    CHOFER ASIGNADO
                  </Text>

                  <Text style={styles.driverName}>
                    {route.driver?.name ?? 'Sin asignar'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryInfoRow}>
                <View style={styles.summaryInfoItem}>
                  <Text style={styles.smallLabel}>
                    FECHA
                  </Text>
                  <Text style={styles.summaryInfoValue}>
                    {formatDate(route.date)}
                  </Text>
                </View>

                <View style={styles.summaryInfoDivider} />

                <View style={styles.summaryInfoItem}>
                  <Text style={styles.smallLabel}>
                    TIEMPO POR PARADA
                  </Text>
                  <Text style={styles.summaryInfoValue}>
                    {route.service_time_minutes} min
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {deliveries.length}
                  </Text>
                  <Text style={styles.statLabel}>
                    Total
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {deliveries.filter(
                      (delivery) =>
                        delivery.status === 'ENTREGADO' ||
                        delivery.status === 'NO_ENTREGADO'
                    ).length}
                  </Text>
                  <Text style={styles.statLabel}>
                    Resueltas
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {deliveries.filter(
                      (delivery) =>
                        delivery.status === 'PENDIENTE' ||
                        delivery.status === 'EN_CAMINO'
                    ).length}
                  </Text>
                  <Text style={styles.statLabel}>
                    Pendientes
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Entregas
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {deliveries.length === 1
                    ? '1 entrega asignada'
                    : `${deliveries.length} entregas asignadas`}
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {deliveries.length}
                </Text>
              </View>
            </View>

            {deliveries.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>
                    ▤
                  </Text>
                </View>

                <Text style={styles.emptyTitle}>
                  Sin entregas asignadas
                </Text>

                <Text style={styles.emptyText}>
                  Este recorrido todavía no tiene entregas.
                </Text>
              </View>
            ) : (
              <View style={styles.dragHintCard}>
                <View style={styles.dragHintIcon}>
                  <Text style={styles.dragHintIconText}>
                    ☰
                  </Text>
                </View>

                <View style={styles.dragHintContent}>
                  <Text style={styles.dragHintTitle}>
                    Orden de entregas
                  </Text>

                  <Text style={styles.dragHint}>
                    {route.status === 'PENDIENTE'
                      ? 'Mantené presionada una entrega para cambiar su posición.'
                      : 'El orden está bloqueado porque el recorrido ya fue iniciado.'}
                  </Text>
                </View>
              </View>
            )}
          </>
        }
        renderItem={({
          item,
          drag,
          isActive,
        }) => (
          <View
            style={[
              styles.deliveryCard,
              isActive && styles.activeDelivery,
            ]}
          >
            <View style={styles.deliveryHeader}>
              <View style={styles.stopContainer}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>
                    {item.stop_index}
                  </Text>
                </View>

                <View>
                  <Text style={styles.stopLabel}>
                    PARADA
                  </Text>

                  <Text style={styles.stopCaption}>
                    #{item.stop_index}
                  </Text>
                </View>
              </View>

              <View style={styles.deliveryHeaderRight}>
                <View
                  style={[
                    styles.deliveryStatus,
                    item.status === 'PENDIENTE' &&
                      styles.deliveryStatusPending,
                    item.status === 'EN_CAMINO' &&
                      styles.deliveryStatusInProgress,
                    item.status === 'ENTREGADO' &&
                      styles.deliveryStatusCompleted,
                    item.status === 'NO_ENTREGADO' &&
                      styles.deliveryStatusFailed,
                  ]}
                >
                  <View
                    style={[
                      styles.deliveryStatusDot,
                      item.status === 'PENDIENTE' &&
                        styles.deliveryStatusDotPending,
                      item.status === 'EN_CAMINO' &&
                        styles.deliveryStatusDotInProgress,
                      item.status === 'ENTREGADO' &&
                        styles.deliveryStatusDotCompleted,
                      item.status === 'NO_ENTREGADO' &&
                        styles.deliveryStatusDotFailed,
                    ]}
                  />

                  <Text
                    style={[
                      styles.deliveryStatusText,
                      item.status === 'PENDIENTE' &&
                        styles.deliveryStatusPendingText,
                      item.status === 'EN_CAMINO' &&
                        styles.deliveryStatusInProgressText,
                      item.status === 'ENTREGADO' &&
                        styles.deliveryStatusCompletedText,
                      item.status === 'NO_ENTREGADO' &&
                        styles.deliveryStatusFailedText,
                    ]}
                  >
                    {item.status === 'PENDIENTE'
                      ? 'Pendiente'
                      : item.status === 'EN_CAMINO'
                        ? 'En reparto'
                        : item.status === 'ENTREGADO'
                          ? 'Entregada'
                          : item.status === 'NO_ENTREGADO'
                            ? 'No entregada'
                            : item.status}
                  </Text>
                </View>

                {route.status === 'PENDIENTE' && (
                  <Pressable
                    onLongPress={drag}
                    disabled={isActive}
                    delayLongPress={150}
                    style={({ pressed }) => [
                      styles.dragButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.dragButtonText}>
                      ⋮⋮
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.deliveryName}>
              {item.full_name}
            </Text>

            <Text style={styles.claimText}>
              Reclamo #{item.claim_number}
            </Text>

            <View style={styles.infoGroup}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>
                  ✉
                </Text>

                <Text style={styles.info}>
                  {item.email}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.phoneIcon}>
                  ☎
                </Text>

                <Text style={styles.info}>
                  {item.phone ?? 'Sin teléfono informado'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.addressIcon}>
                  ⌖
                </Text>

                <Text style={styles.address}>
                  {item.address}
                </Text>
              </View>
            </View>

            {item.eta_window_start &&
              item.eta_window_end && (
                <View style={styles.etaBox}>
                  <View style={styles.etaIcon}>
                    <Text style={styles.etaIconText}>
                      ◷
                    </Text>
                  </View>

                  <View style={styles.etaContent}>
                    <Text style={styles.etaLabel}>
                      Horario estimado
                    </Text>

                    <Text style={styles.etaValue}>
                      {new Date(
                        item.eta_window_start
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {new Date(
                        item.eta_window_end
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              )}

            {route.status === 'PENDIENTE' && (
              <View style={styles.deliveryActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    setSelectedDelivery(item);
                    setShowDeliveryForm(true);
                  }}
                >
                  <Text style={styles.secondaryActionText}>
                    Editar
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteAction,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleDeleteDelivery(item)}
                >
                  <Text style={styles.deleteActionText}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          <>
            {orderChanged && route.status === 'PENDIENTE' && (
              <View style={styles.saveOrderCard}>
                <View style={styles.saveOrderContent}>
                  <Text style={styles.saveOrderTitle}>
                    Orden modificado
                  </Text>

                  <Text style={styles.saveOrderText}>
                    Guardá los cambios para confirmar el nuevo recorrido.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSaveOrder}
                >
                  <Text style={styles.primaryButtonText}>
                    Guardar orden
                  </Text>
                </Pressable>
              </View>
            )}

            {route.status === 'PENDIENTE' && (
              <View style={styles.formSection}>
                {!showDeliveryForm ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.addDeliveryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setShowDeliveryForm(true)}
                  >
                    <Text style={styles.addDeliveryIcon}>
                      +
                    </Text>

                    <Text style={styles.addDeliveryText}>
                      Agregar entrega
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                      <View>
                        <Text style={styles.formEyebrow}>
                          GESTIÓN DE ENTREGA
                        </Text>

                        <Text style={styles.formHeaderTitle}>
                          {selectedDelivery
                            ? 'Editar entrega'
                            : 'Nueva entrega'}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.closeFormButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => {
                          setSelectedDelivery(null);
                          setShowDeliveryForm(false);
                        }}
                      >
                        <Text style={styles.closeFormButtonText}>
                          ×
                        </Text>
                      </Pressable>
                    </View>

                    <CreateDeliveryForm
                      routeId={id}
                      nextStopIndex={deliveries.length + 1}
                      delivery={selectedDelivery}
                      onDeliveryCreated={() => {
                        loadData();
                        setSelectedDelivery(null);
                      }}
                      onDeliveryUpdated={() => {
                        loadData();
                        setSelectedDelivery(null);
                        setShowDeliveryForm(false);
                      }}
                      onCancelEdit={() => {
                        setSelectedDelivery(null);
                        setShowDeliveryForm(false);
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F5F8',
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 45,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 18,
    paddingVertical: 5,
    paddingRight: 10,
  },

  backButtonText: {
    color: '#376194',
    fontSize: 15,
    fontWeight: '700',
  },

  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: '#253047',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7D8795',
    marginBottom: 22,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    shadowColor: '#253047',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  summaryTitleGroup: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  summaryDate: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: '#253047',
  },

  routeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },

  routeStatusPending: {
    backgroundColor: '#FFF2DB',
  },

  routeStatusInProgress: {
    backgroundColor: '#E8F0FA',
  },

  routeStatusCompleted: {
    backgroundColor: '#E4F5EF',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusDotPending: {
    backgroundColor: '#C78B20',
  },

  statusDotInProgress: {
    backgroundColor: '#376194',
  },

  statusDotCompleted: {
    backgroundColor: '#20866B',
  },

  routeStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  routeStatusTextPending: {
    color: '#A66A08',
  },

  routeStatusTextInProgress: {
    color: '#376194',
  },

  routeStatusTextCompleted: {
    color: '#20866B',
  },

  divider: {
    height: 1,
    backgroundColor: '#EDF0F3',
    marginVertical: 17,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  driverAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#376194',
  },

  driverInfo: {
    flex: 1,
  },

  smallLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1,
    marginBottom: 3,
  },

  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#253047',
  },

  summaryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  summaryInfoItem: {
    flex: 1,
  },

  summaryInfoDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#EDF0F3',
    marginHorizontal: 14,
  },

  summaryInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303746',
    marginTop: 3,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDF0F3',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
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
  },

  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#EDF0F3',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#253047',
  },

  sectionSubtitle: {
    fontSize: 12,
    color: '#8993A1',
    marginTop: 3,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    color: '#376194',
    fontSize: 12,
    fontWeight: '800',
  },

  dragHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FC',
    borderRadius: 13,
    padding: 12,
    marginTop: 12,
    marginBottom: 2,
  },

  dragHintIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCE8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  dragHintIconText: {
    color: '#376194',
    fontSize: 16,
    fontWeight: '800',
  },

  dragHintContent: {
    flex: 1,
  },

  dragHintTitle: {
    color: '#376194',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },

  dragHint: {
    color: '#60718A',
    fontSize: 11,
    lineHeight: 16,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    marginTop: 12,
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

  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EF',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    shadowColor: '#253047',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  activeDelivery: {
    borderColor: '#376194',
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },

  stopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  stopNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  stopNumberText: {
    color: '#376194',
    fontSize: 16,
    fontWeight: '800',
  },

  stopLabel: {
    color: '#8993A1',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  stopCaption: {
    color: '#596273',
    fontSize: 12,
    fontWeight: '700',
  },

  deliveryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  deliveryStatusPending: {
    backgroundColor: '#FFF2DB',
  },

  deliveryStatusInProgress: {
    backgroundColor: '#E8F0FA',
  },

  deliveryStatusCompleted: {
    backgroundColor: '#E4F5EF',
  },

  deliveryStatusFailed: {
    backgroundColor: '#FCE8E8',
  },

  deliveryStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  deliveryStatusDotPending: {
    backgroundColor: '#C78B20',
  },

  deliveryStatusDotInProgress: {
    backgroundColor: '#376194',
  },

  deliveryStatusDotCompleted: {
    backgroundColor: '#20866B',
  },

  deliveryStatusDotFailed: {
    backgroundColor: '#D64545',
  },

  deliveryStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  deliveryStatusPendingText: {
    color: '#A66A08',
  },

  deliveryStatusInProgressText: {
    color: '#376194',
  },

  deliveryStatusCompletedText: {
    color: '#20866B',
  },

  deliveryStatusFailedText: {
    color: '#C43B40',
  },

  dragButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dragButtonText: {
    fontSize: 17,
    lineHeight: 20,
    color: '#667085',
    fontWeight: '800',
    letterSpacing: -2,
  },

  deliveryName: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: '#303746',
    marginBottom: 3,
  },

  claimText: {
    color: '#7B8492',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 15,
  },

  infoGroup: {
    gap: 10,
    marginBottom: 8,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  infoIcon: {
    width: 20,
    color: '#376194',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 1,
  },

  phoneIcon: {
    width: 20,
    color: '#EF3038',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 1,
  },

  addressIcon: {
    width: 20,
    color: '#376194',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 0,
  },

  info: {
    flex: 1,
    color: '#596273',
    fontSize: 13,
    lineHeight: 19,
  },

  address: {
    flex: 1,
    color: '#596273',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  etaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
    borderRadius: 12,
    padding: 11,
    marginTop: 8,
    marginBottom: 4,
  },

  etaIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  etaIconText: {
    color: '#376194',
    fontSize: 18,
    fontWeight: '800',
  },

  etaContent: {
    flex: 1,
  },

  etaLabel: {
    color: '#7B8492',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },

  etaValue: {
    color: '#303746',
    fontSize: 14,
    fontWeight: '800',
  },

  deliveryActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
  },

  secondaryAction: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E0EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  secondaryActionText: {
    color: '#376194',
    fontSize: 13,
    fontWeight: '800',
  },

  deleteAction: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3C9CC',
    backgroundColor: '#FFF8F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  deleteActionText: {
    color: '#C43B40',
    fontSize: 13,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.72,
  },

  saveOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#F3D2D4',
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
  },

  saveOrderContent: {
    flex: 1,
  },

  saveOrderTitle: {
    color: '#303746',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },

  saveOrderText: {
    color: '#7D8795',
    fontSize: 11,
    lineHeight: 16,
  },

  primaryButton: {
    minHeight: 43,
    borderRadius: 11,
    backgroundColor: '#EF3038',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  formSection: {
    marginTop: 20,
    marginBottom: 10,
  },

  addDeliveryButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: '#EF3038',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },

  addDeliveryIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 22,
    fontWeight: '500',
  },

  addDeliveryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E9EF',
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  formEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1.1,
    marginBottom: 3,
  },

  formHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#253047',
  },

  closeFormButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F3F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeFormButtonText: {
    color: '#667085',
    fontSize: 24,
    lineHeight: 25,
    fontWeight: '400',
  },
});
