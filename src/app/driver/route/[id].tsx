import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  getDeliveriesByRoute,
  updateDeliveryStatus,
} from '@/services/deliveriesService';
import { 
  startRoute,
  completeRoute,
} from '@/services/routesService';
import * as Location from 'expo-location';
import { LOCATION_TASK_NAME } from '@/services/locationTask';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  started_at: string | null;
};

type Delivery = {
  id: string;
  claim_number: string;
  full_name: string;
  email: string;
  address: string;
  phone: string | null;
  status: string;
  failure_reason: string | null;
  stop_index: number;
  eta_window_start: string | null;
  eta_window_end: string | null;
  last_updated_at: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function DriverRouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const deliveryPositions =
    useRef<Record<string, number>>({});

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
          started_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error cargando recorrido:', error);
        return;
      }

      setRoute(data as Route);

      const deliveriesData = await getDeliveriesByRoute(id);

      const orderedDeliveries = [...(deliveriesData as Delivery[])].sort(
        (a, b) => a.stop_index - b.stop_index
      );

      setDeliveries(orderedDeliveries);
    } catch (error) {
      console.error('Error cargando detalle del recorrido:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nextDelivery = deliveries.find(
    (delivery) =>
      delivery.status === 'PENDIENTE' ||
      delivery.status === 'EN_CAMINO'
  );

  useEffect(() => {
    if (
      route?.status !== 'EN_CURSO' ||
      !nextDelivery
    ) {
      return;
    }

    const position =
      deliveryPositions.current[nextDelivery.id];

    if (position === undefined) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(position - 20, 0),
        animated: true,
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [nextDelivery?.id, route?.status]);

  const calculateRouteTimes = async (
    origin: {
      latitude: number;
      longitude: number;
    },
    pendingDeliveries: Delivery[]
  ) => {
    const deliveriesWithCoordinates = pendingDeliveries.filter(
      (delivery) =>
        typeof delivery.latitude === 'number' &&
        typeof delivery.longitude === 'number'
    );

    if (deliveriesWithCoordinates.length === 0) {
      return [];
    }

    const destinations = deliveriesWithCoordinates
      .slice(0, 5)
      .map((delivery) => ({
        latitude: delivery.latitude!,
        longitude: delivery.longitude!,
      }));

    const { data, error } = await supabase.functions.invoke(
      'calculate-route-times',
      {
        body: {
          origin,
          destinations,
        },
      }
    );

    if (error) {
      console.error(
        'Error calculando tiempos de ruta:',
        error
      );
      throw error;
    }

    return data?.segments ?? [];
  };

  const getCurrentDriverLocation = async () => {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  };

  const calculateAccumulatedETAs = (
    segments: {
      segmentIndex: number;
      durationSeconds: number;
      distanceMeters: number;
    }[],
    startTime: Date,
    serviceTimeMinutes = 8
  ) => {
    let accumulatedMinutes = 0;

    return segments.map((segment) => {
      const travelMinutes = segment.durationSeconds / 60;

      accumulatedMinutes += travelMinutes;
      accumulatedMinutes += serviceTimeMinutes;

      const eta = new Date(startTime);
      eta.setMinutes(
        eta.getMinutes() + accumulatedMinutes
      );

      return {
        segmentIndex: segment.segmentIndex,
        eta,
        travelMinutes,
        distanceMeters: segment.distanceMeters,
      };
    });
  };

  const buildDeliveryETAs = (
    deliveries: Delivery[],
    accumulatedETAs: {
      segmentIndex: number;
      eta: Date;
      travelMinutes: number;
      distanceMeters: number;
    }[]
  ) => {
    return deliveries
      .slice(0, accumulatedETAs.length)
      .map((delivery, index) => ({
        deliveryId: delivery.id,
        eta: accumulatedETAs[index].eta,
        distanceMeters:
          accumulatedETAs[index].distanceMeters,
        travelMinutes:
          accumulatedETAs[index].travelMinutes,
      }));
  };

  const calculateInitialRouteETAs = async (
    origin: {
      latitude: number;
      longitude: number;
    },
    pendingDeliveries: Delivery[]
  ) => {
    const deliveriesWithCoordinates = pendingDeliveries.filter(
      (delivery) =>
        typeof delivery.latitude === 'number' &&
        typeof delivery.longitude === 'number'
    );

    if (deliveriesWithCoordinates.length === 0) {
      return [];
    }

    const startTime = new Date();

    let currentOrigin = origin;
    let accumulatedMinutes = 0;

    const results: {
      deliveryId: string;
      eta: Date;
      distanceMeters: number;
      travelMinutes: number;
    }[] = [];

    for (
      let startIndex = 0;
      startIndex < deliveriesWithCoordinates.length;
      startIndex += 5
    ) {
      const chunk = deliveriesWithCoordinates.slice(
        startIndex,
        startIndex + 5
      );

      const segments = await calculateRouteTimes(
        currentOrigin,
        chunk
      );

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const delivery = chunk[i];

        const travelMinutes =
          segment.durationSeconds / 60;

        accumulatedMinutes += travelMinutes;
        accumulatedMinutes += 8;

        const eta = new Date(startTime);

        eta.setMinutes(
          eta.getMinutes() + accumulatedMinutes
        );

        results.push({
          deliveryId: delivery.id,
          eta,
          distanceMeters: segment.distanceMeters,
          travelMinutes,
        });
      }

      const lastDelivery =
        chunk[chunk.length - 1];

      currentOrigin = {
        latitude: lastDelivery.latitude!,
        longitude: lastDelivery.longitude!,
      };
    }

    return results;
  };

  const saveInitialRouteETAs = async (
    origin: {
      latitude: number;
      longitude: number;
    },
    pendingDeliveries: Delivery[]
  ) => {
    const routeETAs = await calculateInitialRouteETAs(
      origin,
      pendingDeliveries
    );

    for (const deliveryETA of routeETAs) {
      await saveDeliveryETA(
        deliveryETA.deliveryId,
        deliveryETA.eta
      );
    }

    return routeETAs;
  };

  const recalculateNextFiveETAs = async () => {
    if (!route) return;

    const currentLocation =
      await getCurrentDriverLocation();

    const freshDeliveries =
      await getDeliveriesByRoute(route.id);

    const pendingDeliveries = freshDeliveries
      .filter(
        (delivery) =>
          delivery.status === 'PENDIENTE' &&
          typeof delivery.latitude === 'number' &&
          typeof delivery.longitude === 'number'
      )
      .sort(
        (a, b) =>
          a.stop_index - b.stop_index
      )
      .slice(0, 5);

    if (pendingDeliveries.length === 0) {
      console.log(
        'No hay entregas pendientes para recalcular.'
      );
      return;
    }

    console.log(
      'Recalculando ETA de próximas:',
      pendingDeliveries.length
    );

    const segments = await calculateRouteTimes(
      currentLocation,
      pendingDeliveries
    );

    const accumulatedETAs =
      calculateAccumulatedETAs(
        segments,
        new Date(),
        8
      );

    const deliveryETAs =
      buildDeliveryETAs(
        pendingDeliveries,
        accumulatedETAs
      );

    for (const deliveryETA of deliveryETAs) {
      await saveDeliveryETA(
        deliveryETA.deliveryId,
        deliveryETA.eta
      );
    }

    console.log(
      'ETAs recalculados:',
      deliveryETAs.length
    );
  };

  const saveDeliveryETA = async (
    deliveryId: string,
    eta: Date
  ) => {
    const etaWindowStart = new Date(eta);

    const etaWindowEnd = new Date(eta);
    etaWindowEnd.setHours(
      etaWindowEnd.getHours() + 2
    );

    const { error } = await supabase
      .from('deliveries')
      .update({
        eta_window_start: etaWindowStart.toISOString(),
        eta_window_end: etaWindowEnd.toISOString(),
      })
      .eq('id', deliveryId);

    if (error) {
      console.error(
        'Error guardando ETA:',
        error
      );
      throw error;
    }
  };

  const startLocationTracking = async () => {
    console.log('Solicitando permiso de ubicación en primer plano');

    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    console.log('Permiso foreground:', foregroundStatus);

    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permiso de ubicación',
        'Necesitamos permiso para acceder a la ubicación del dispositivo.'
      );
      return false;
    }

    console.log('Solicitando permiso de ubicación en segundo plano');

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();

    console.log('Permiso background:', backgroundStatus);

    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Permiso de ubicación en segundo plano',
        'Necesitamos permiso para poder seguir registrando la ubicación mientras usás otra aplicación.'
      );
      return false;
    }

    const isTracking =
      await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

    console.log('¿GPS ya estaba activo?:', isTracking);

    if (!isTracking) {
      await Location.startLocationUpdatesAsync(
        LOCATION_TASK_NAME,
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 60000,
          distanceInterval: 0,
          foregroundService: {
            notificationTitle: 'Recorrido en curso',
            notificationBody: 'La ubicación se está actualizando.',
          },
        }
      );

      console.log('Se solicitó iniciar el GPS');
    }

    return true;
  };

  const isRouteToday = (routeDate: string) => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return routeDate === `${year}-${month}-${day}`;
  };

  const handleStartRoute = async () => {
    if (!route) return;

    try {
      console.log('Iniciando recorrido:', route.id);

      const wasTracking =
        await Location.hasStartedLocationUpdatesAsync(
          LOCATION_TASK_NAME
        );

      if (wasTracking) {
        console.log('Deteniendo seguimiento anterior...');
        await Location.stopLocationUpdatesAsync(
          LOCATION_TASK_NAME
        );
      }

      await AsyncStorage.setItem(
        'active_route_id',
        route.id
      );

      console.log(
        'Recorrido activo guardado en AsyncStorage'
      );

      const trackingStarted =
        await startLocationTracking();

      console.log('GPS iniciado:', trackingStarted);

      const isDefined =
        TaskManager.isTaskDefined(
          LOCATION_TASK_NAME
        );

      const registeredTasks =
        await TaskManager.getRegisteredTasksAsync();

      console.log(
        '¿GPS iniciado?:',
        trackingStarted
      );

      console.log(
        '¿Tarea definida?:',
        isDefined
      );

      console.log(
        'Tareas registradas:',
        registeredTasks.map(
          (task) => task.taskName
        )
      );

      if (!trackingStarted) {
        await AsyncStorage.removeItem(
          'active_route_id'
        );
        return;
      }

      // 📍 Obtener ubicación actual del chofer
      const currentLocation =
        await getCurrentDriverLocation();

      console.log(
        'Ubicación para calcular ETA:',
        currentLocation
      );

      // 📦 Entregas pendientes ordenadas por recorrido
      const pendingDeliveries = deliveries
        .filter(
          (delivery) =>
            delivery.status === 'PENDIENTE'
        )
        .sort(
          (a, b) =>
            a.stop_index - b.stop_index
        );

      console.log(
        'Entregas pendientes:',
        pendingDeliveries.length
      );

      // 🕐 Calcular ETA inicial de toda la ruta
      const initialETAs =
        await saveInitialRouteETAs(
          currentLocation,
          pendingDeliveries
        );

      console.log(
        'ETAs iniciales guardados:',
        initialETAs.length
      );

      // 🚚 Iniciar recorrido en Supabase
      await startRoute(route.id);

      console.log(
        'Recorrido iniciado en Supabase'
      );

      await loadData();
    } catch (error) {
      console.error(
        'Error iniciando recorrido:',
        error
      );

      await AsyncStorage.removeItem(
        'active_route_id'
      );

      try {
        const isTracking =
          await Location.hasStartedLocationUpdatesAsync(
            LOCATION_TASK_NAME
          );

        if (isTracking) {
          await Location.stopLocationUpdatesAsync(
            LOCATION_TASK_NAME
          );
        }
      } catch (trackingError) {
        console.error(
          'Error deteniendo GPS:',
          trackingError
        );
      }

      Alert.alert(
        'Error',
        'No se pudo iniciar el recorrido.'
      );
    }
  };

  const handleStartDelivery = async (deliveryId: string) => {
    try {
      await updateDeliveryStatus(deliveryId, 'EN_CAMINO');
      await loadData();
    } catch (error) {
      console.error('Error iniciando entrega:', error);
    }
  };

  const handleCompleteDelivery = async (
    deliveryId: string
  ) => {
    try {
      await updateDeliveryStatus(
        deliveryId,
        'ENTREGADO'
      );

      try {
        await recalculateNextFiveETAs();
      } catch (error) {
        console.error(
          'Error recalculando ETA después de entregar:',
          error
        );
      }

      await loadData();
    } catch (error) {
      console.error(
        'Error marcando entrega como completada:',
        error
      );
    }
  };

  const processFailedDelivery = async (
    deliveryId: string,
    reason: string
  ) => {
    try {
      await updateDeliveryStatus(
        deliveryId,
        'NO_ENTREGADO',
        reason
      );

      try {
        await recalculateNextFiveETAs();
      } catch (error) {
        console.error(
          'Error recalculando ETA después de entrega no realizada:',
          error
        );
      }

      await loadData();
    } catch (error) {
      console.error(
        'Error marcando entrega como no realizada:',
        error
      );
    }
  };

  const handleFailedDelivery = (
    deliveryId: string
  ) => {
    Alert.alert(
      'Entrega no realizada',
      'Seleccioná el motivo:',
      [
        {
          text: 'Destinatario ausente',
          onPress: () =>
            processFailedDelivery(
              deliveryId,
              'Destinatario ausente'
            ),
        },

        {
          text: 'Dirección incorrecta',
          onPress: () =>
            processFailedDelivery(
              deliveryId,
              'Dirección incorrecta'
            ),
        },

        {
          text: 'Rechazó la entrega',
          onPress: () =>
            processFailedDelivery(
              deliveryId,
              'Rechazó la entrega'
            ),
        },

        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleCompleteRoute = async () => {
    if (!route) return;

    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

      if (isTracking) {
        await Location.stopLocationUpdatesAsync(
          LOCATION_TASK_NAME
        );
      }

      await AsyncStorage.removeItem('active_route_id');

      await completeRoute(route.id);
      await loadData();
    } catch (error) {
      console.error('Error finalizando recorrido:', error);
    }
  };

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

  const allDeliveriesCompleted =
    deliveries.length > 0 &&
    deliveries.every(
      (delivery) =>
        delivery.status === 'ENTREGADO' ||
        delivery.status === 'NO_ENTREGADO'
    );

  const handleOpenMaps = async (address: string) => {
    if (!address?.trim()) {
      Alert.alert('Dirección no disponible', 'No hay una dirección para mostrar.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error abriendo Google Maps:', error);
      Alert.alert('Error', 'No se pudo abrir el mapa.');
    }
  };

  const handleCall = async (phone: string | null) => {
    if (!phone?.trim()) {
      Alert.alert('Teléfono no disponible', 'No hay un teléfono informado.');
      return;
    }

    const cleanPhone = phone.replace(/[^\d+]/g, '');

    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch (error) {
      console.error('Error al abrir el teléfono:', error);
      Alert.alert('Error', 'No se pudo abrir la aplicación de llamadas.');
    }
  };
  
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ref={scrollViewRef}
    >
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>
          ‹  Mis recorridos
        </Text>
      </Pressable>

      <Text style={styles.pageTitle}>
        Detalle del recorrido
      </Text>

      <Text style={styles.pageSubtitle}>
        Consultá las entregas y gestioná tu recorrido.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleGroup}>
            <Text style={styles.cardEyebrow}>
              RECORRIDO
            </Text>

            <Text style={styles.summaryDate}>
              {new Date(`${route.date}T12:00:00`).toLocaleDateString(
                'es-AR',
                {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              route.status === 'PENDIENTE' &&
                styles.statusPending,
              route.status === 'EN_CURSO' &&
                styles.statusInProgress,
              route.status === 'COMPLETADO' &&
                styles.statusCompleted,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                route.status === 'PENDIENTE' &&
                  styles.dotPending,
                route.status === 'EN_CURSO' &&
                  styles.dotInProgress,
                route.status === 'COMPLETADO' &&
                  styles.dotCompleted,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                route.status === 'PENDIENTE' &&
                  styles.textPending,
                route.status === 'EN_CURSO' &&
                  styles.textInProgress,
                route.status === 'COMPLETADO' &&
                  styles.textCompleted,
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

        <View style={styles.summaryDivider} />

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.statNumber}>
              {deliveries.length}
            </Text>

            <Text style={styles.statLabel}>
              Entregas
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.summaryStat}>
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

          <View style={styles.summaryStat}>
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

        {route.status === 'PENDIENTE' && (
          <Pressable
            style={[
              styles.primaryButton,
              !isRouteToday(route.date) && styles.startButtonDisabled,
            ]}
            onPress={() => handleStartRoute}
            disabled={!isRouteToday(route.date)}
          >
            <Text style={[
              styles.primaryButtonText,
              !isRouteToday(route.date) && styles.startButtonTextDisabled,
            ]}>
              Iniciar recorrido
            </Text>

            <Text style={styles.buttonArrow}>
              →
            </Text>
          </Pressable>
        )}

        {route.status === 'EN_CURSO' &&
          allDeliveriesCompleted && (
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleCompleteRoute}
            >
              <Text style={styles.primaryButtonText}>
                Finalizar recorrido
              </Text>

              <Text style={styles.buttonArrow}>
                ✓
              </Text>
            </Pressable>
          )}

        {route.status === 'EN_CURSO' &&
          !allDeliveriesCompleted && (
            <View style={styles.activeNotice}>
              <View style={styles.activeNoticeDot} />

              <Text style={styles.activeNoticeText}>
                Recorrido activo. Actualizá el estado de cada
                entrega a medida que avances.
              </Text>
            </View>
          )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Entregas
        </Text>

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
        deliveries.map((delivery) => {
          const isNext =
            nextDelivery?.id === delivery.id;

          const isActive =
            delivery.status === 'EN_CAMINO';

          const isCompleted =
            delivery.status === 'ENTREGADO' ||
            delivery.status === 'NO_ENTREGADO';

          return (
            <View
              key={delivery.id}
              style={[
                styles.deliveryCard,
                isNext &&
                  route.status === 'EN_CURSO' &&
                  styles.nextDeliveryCard,
                isCompleted &&
                  styles.completedDeliveryCard,
              ]}
              onLayout={(event) => {
                deliveryPositions.current[delivery.id] =
                  event.nativeEvent.layout.y;
              }}
            >
              {isCompleted ? (
                <View style={styles.completedRow}>
                  <View
                    style={styles.completedStopNumber}
                  >
                    <Text
                      style={
                        styles.completedStopNumberText
                      }
                    >
                      {delivery.stop_index}
                    </Text>
                  </View>

                  <Text
                    style={styles.completedName}
                    numberOfLines={1}
                  >
                    {delivery.full_name}
                  </Text>

                  <Text
                    style={[
                      styles.completedStatus,
                      delivery.status === 'ENTREGADO'
                        ? styles.completedStatusDelivered
                        : styles.completedStatusFailed,
                    ]}
                  >
                    {delivery.status === 'ENTREGADO'
                      ? '✓ Entregada'
                      : '✕ No entregada'}
                  </Text>
                </View>
              ) : (
                <View style={styles.deliveryHeader}>
                  <View style={styles.stopContainer}>
                    <View
                      style={[
                        styles.stopNumber,
                        isNext &&
                          route.status === 'EN_CURSO' &&
                          styles.nextStopNumber,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stopNumberText,
                          isNext &&
                            route.status === 'EN_CURSO' &&
                            styles.nextStopNumberText,
                        ]}
                      >
                        {delivery.stop_index}
                      </Text>
                    </View>

                    <Text style={styles.stopLabel}>
                      PARADA
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isActive && styles.statusActive,
                      isCompleted &&
                        styles.statusCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isActive &&
                          styles.statusActiveText,
                        isCompleted &&
                          styles.statusCompletedText,
                      ]}
                    >
                      {delivery.status === 'PENDIENTE'
                        ? 'Pendiente'
                        : delivery.status === 'EN_CAMINO'
                        ? 'En curso'
                        : delivery.status === 'ENTREGADO'
                        ? 'Entregada'
                        : 'No entregada'}
                    </Text>
                  </View>
                </View>
              )}

              {!isCompleted &&
                isNext &&
                route.status === 'EN_CURSO' && (
                  <View style={styles.nextNotice}>
                    <Text style={styles.nextNoticeText}>
                      {isActive
                        ? 'Entrega en curso'
                        : 'Próxima entrega'}
                    </Text>
                  </View>
                )}

              {!isCompleted && (
                <>
                  <Text style={styles.deliveryName}>
                    {delivery.full_name}
                  </Text>

                  <Text style={styles.claimText}>
                    Reclamo #{delivery.claim_number}
                  </Text>

                  <View style={styles.deliveryInfoRow}>
                    <Text style={styles.infoIcon}>
                      ⌖
                    </Text>

                    <Text style={styles.infoText}>
                      {delivery.address}
                    </Text>
                  </View>

                  <View style={styles.deliveryInfoRow}>
                    <Text style={styles.phoneIcon}>
                      ☎
                    </Text>

                    <Text style={styles.infoText}>
                      {delivery.phone ??
                        'Sin teléfono informado'}
                    </Text>
                  </View>

                  <View style={styles.quickActions}>
                    <Pressable
                      style={styles.mapAction}
                      onPress={() =>
                        handleOpenMaps(
                          delivery.address
                        )
                      }
                    >
                      <Text
                        style={styles.mapActionText}
                      >
                        ↗ Abrir en mapa
                      </Text>
                    </Pressable>

                    {delivery.phone && (
                      <Pressable
                        style={styles.callAction}
                        onPress={() =>
                          handleCall(
                            delivery.phone
                          )
                        }
                      >
                        <Text
                          style={
                            styles.callActionText
                          }
                        >
                          ☎ Llamar
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {delivery.eta_window_start && (
                      <View style={styles.etaBox}>
                        <Text
                          style={styles.etaLabel}
                        >
                          Horario estimado
                        </Text>

                        <Text
                          style={styles.etaValue}
                        >
                          {new Date(
                            delivery.eta_window_start
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </Text>
                      </View>
                    )}

                  {delivery.status ===
                    'NO_ENTREGADO' &&
                    delivery.failure_reason && (
                      <Text
                        style={styles.failureText}
                      >
                        Motivo:{' '}
                        {delivery.failure_reason}
                      </Text>
                    )}

                  {route.status === 'EN_CURSO' &&
                    delivery.status ===
                      'PENDIENTE' &&
                    isNext && (
                      <Pressable
                        style={
                          styles.primaryAction
                        }
                        onPress={() =>
                          handleStartDelivery(
                            delivery.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.primaryActionText
                          }
                        >
                          Iniciar entrega →
                        </Text>
                      </Pressable>
                    )}

                  {isActive && (
                    <>
                      <Pressable
                        style={
                          styles.primaryAction
                        }
                        onPress={() =>
                          handleCompleteDelivery(
                            delivery.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.primaryActionText
                          }
                        >
                          Marcar como entregada
                        </Text>
                      </Pressable>

                      <Pressable
                        style={
                          styles.secondaryAction
                        }
                        onPress={() =>
                          handleFailedDelivery(
                            delivery.id
                          )
                        }
                      >
                        <Text
                          style={
                            styles.secondaryActionText
                          }
                        >
                          No se pudo entregar
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </View>
          );
        })
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
    paddingTop: 55,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 22,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingRight: 10,
  },
  backButtonText: {
    color: '#376194',
    fontSize: 15,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#253047',
    marginBottom: 5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#7D8795',
    marginBottom: 22,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 27,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    shadowColor: '#253047',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitleGroup: {
    flex: 1,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  summaryDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#253047',
    textTransform: 'capitalize',
  },
  statusPending: {
    backgroundColor: '#FFF2DB',
  },
  statusInProgress: {
    backgroundColor: '#E8F0FA',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotPending: {
    backgroundColor: '#C78B20',
  },
  dotInProgress: {
    backgroundColor: '#376194',
  },
  dotCompleted: {
    backgroundColor: '#20866B',
  },
  textPending: {
    color: '#A66A08',
  },
  textInProgress: {
    color: '#376194',
  },
  textCompleted: {
    color: '#20866B',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#EDF0F3',
    marginVertical: 17,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#253047',
  },
  statLabel: {
    fontSize: 11,
    color: '#7D8795',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 39,
    backgroundColor: '#EDF0F3',
  },
  primaryButton: {
    minHeight: 49,
    borderRadius: 13,
    backgroundColor: '#EF3038',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  activeNotice: {
    backgroundColor: '#E8F0FA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  activeNoticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#376194',
  },
  activeNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#376194',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#253047',
  },
  countBadge: {
    backgroundColor: '#E8F0FA',
    minWidth: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#376194',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
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
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  nextDeliveryCard: {
    borderColor: '#376194',
    borderWidth: 1.5,
  },
  completedDeliveryCard: {
    opacity: 0.8,
    paddingVertical: 10,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedStopNumber: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStopNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#376194',
  },
  completedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#253047',
  },
  completedStatus: {
    fontSize: 12,
    fontWeight: '800',
  },
  completedStatusDelivered: {
    color: '#2E8B57',
  },
  completedStatusFailed: {
    color: '#D64545',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF0F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStopNumber: {
    backgroundColor: '#376194',
  },
  stopNumberText: {
    color: '#376194',
    fontSize: 17,
    fontWeight: '800',
  },
  nextStopNumberText: {
    color: '#FFFFFF',
  },
  stopLabel: {
    color: '#7B8492',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: '#FFF0D5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: '#E8F1FF',
  },
  statusCompleted: {
    backgroundColor: '#E5F5EA',
  },
  statusText: {
    color: '#98651C',
    fontSize: 12,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#376194',
  },
  statusCompletedText: {
    color: '#287A45',
  },
  nextNotice: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF4FC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  nextNoticeText: {
    color: '#376194',
    fontSize: 12,
    fontWeight: '700',
  },
  deliveryName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#303746',
    marginBottom: 3,
  },
  claimText: {
    color: '#7B8492',
    fontSize: 13,
    marginBottom: 14,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoIcon: {
    color: '#376194',
    fontSize: 20,
    width: 20,
    textAlign: 'center',
  },
  phoneIcon: {
    color: '#EF3038',
    fontSize: 18,
    width: 20,
    textAlign: 'center',
  },
  infoText: {
    flex: 1,
    color: '#596273',
    fontSize: 14,
    lineHeight: 20,
  },
  etaBox: {
    backgroundColor: '#F3F5F8',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  etaLabel: {
    color: '#7B8492',
    fontSize: 12,
    marginBottom: 3,
  },
  etaValue: {
    color: '#303746',
    fontSize: 15,
    fontWeight: '700',
  },
  failureText: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 6,
  },
  primaryAction: {
    backgroundColor: '#EF3038',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF3038',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 9,
  },
  secondaryActionText: {
    color: '#EF3038',
    fontSize: 14,
    fontWeight: '700',
  },
  deliveryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1,
  },
  deliveryStatusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deliveryPending: {
    backgroundColor: '#FFF2DB',
  },
  deliveryOnWay: {
    backgroundColor: '#E8F0FA',
  },
  deliveryDelivered: {
    backgroundColor: '#E4F5EF',
  },
  deliveryFailed: {
    backgroundColor: '#FCE8E8',
  },
  deliveryStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  deliveryPendingText: {
    color: '#A66A08',
  },
  deliveryOnWayText: {
    color: '#376194',
  },
  deliveryDeliveredText: {
    color: '#20866B',
  },
  deliveryFailedText: {
    color: '#C43B40',
  },
  claimNumber: {
    color: '#8993A1',
    fontSize: 11,
    marginBottom: 13,
  },
  deliveryInfoGroup: {
    gap: 10,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  failureNotice: {
    backgroundColor: '#FCE8E8',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
  },
  failureLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C43B40',
    marginBottom: 3,
  },
  deliveryAction: {
    marginTop: 2,
  },
  actionsGroup: {
    gap: 9,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#F0C6C8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  secondaryButtonText: {
    color: '#C43B40',
    fontSize: 13,
    fontWeight: '800',
  },
  finalNotice: {
    backgroundColor: '#E4F5EF',
    borderRadius: 10,
    padding: 11,
  },
  finalNoticeText: {
    color: '#20866B',
    fontSize: 12,
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F8',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  mapAction: {
    flex: 1,
    backgroundColor: '#376194',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  callAction: {
    flex: 1,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F8C9CB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callActionText: {
    color: '#D92730',
    fontSize: 13,
    fontWeight: '700',
  },
  startButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  startButtonTextDisabled: {
    color: '#6B7280',
  },
});
