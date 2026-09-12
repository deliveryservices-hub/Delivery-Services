import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Button, 
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  getDeliveriesByRoute,
  updateDeliveryStatus,
} from '@/services/deliveriesService';
import { 
  startRoute,
  completeRoute,
} from '@/services/routesService';

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
};

export default function DriverRouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleStartRoute = async () => {
    if (!route) return;

    try {
      await startRoute(route.id);
      await loadData();
    } catch (error) {
      console.error('Error iniciando recorrido:', error);
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

  const handleCompleteDelivery = async (deliveryId: string) => {
    try {
      await updateDeliveryStatus(deliveryId, 'ENTREGADO');
      await loadData();
    } catch (error) {
      console.error('Error marcando entrega como completada:', error);
    }
  };

  const handleFailedDelivery = (deliveryId: string) => {
    Alert.alert(
      'Entrega no realizada',
      'Seleccioná el motivo:',
      [
        {
          text: 'Destinatario ausente',
          onPress: () =>
            updateDeliveryStatus(
              deliveryId,
              'NO_ENTREGADO',
              'Destinatario ausente'
            ).then(loadData),
        },
        {
          text: 'Dirección incorrecta',
          onPress: () =>
            updateDeliveryStatus(
              deliveryId,
              'NO_ENTREGADO',
              'Dirección incorrecta'
            ).then(loadData),
        },
        {
          text: 'Rechazó la entrega',
          onPress: () =>
            updateDeliveryStatus(
              deliveryId,
              'NO_ENTREGADO',
              'Rechazó la entrega'
            ).then(loadData),
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
      await completeRoute(route.id);
      await loadData();
    } catch (error) {
      console.error('Error finalizando recorrido:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const nextDelivery = deliveries.find(
    (delivery) =>
      delivery.status === 'PENDIENTE' ||
      delivery.status === 'EN_CAMINO'
  );

  const allDeliveriesCompleted =
    deliveries.length > 0 &&
    deliveries.every(
      (delivery) =>
        delivery.status === 'ENTREGADO' ||
        delivery.status === 'NO_ENTREGADO'
    );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        Detalle del recorrido
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Fecha</Text>
        <Text style={styles.value}>
          {route.date}
        </Text>

        <Text style={styles.label}>Estado</Text>

        <Text style={styles.value}>
          {route.status}
        </Text>

        {route.status === 'PENDIENTE' && (
          <View style={styles.buttonContainer}>
            <Button
              title="Iniciar recorrido"
              onPress={handleStartRoute}
            />
          </View>
        )}

        <Text style={styles.label}>Entregas</Text>
        <Text style={styles.value}>
          {deliveries.length}
        </Text>

        {route.status === 'EN_CURSO' && allDeliveriesCompleted && (
          <View style={styles.buttonContainer}>
            <Button
              title="Finalizar recorrido"
              onPress={handleCompleteRoute}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Entregas
        </Text>

        {deliveries.length === 0 ? (
          <Text style={styles.empty}>
            Este recorrido todavía no tiene entregas.
          </Text>
        ) : (
          deliveries.map((delivery) => (
            <View
              key={delivery.id}
              style={styles.deliveryCard}
            >
              <Text style={styles.stop}>
                Parada {delivery.stop_index}
              </Text>

              <Text style={styles.deliveryName}>
                {delivery.full_name}
              </Text>

              <Text style={styles.info}>
                Teléfono: {delivery.phone ?? 'Sin informar'}
              </Text>

              <Text style={styles.info}>
                Dirección: {delivery.address}
              </Text>

              <Text style={styles.info}>
                Estado: {delivery.status}
              </Text>

              {delivery.status === 'PENDIENTE' &&
                route.status === 'EN_CURSO' &&
                nextDelivery?.id === delivery.id && (
                  <View style={styles.buttonContainer}>
                    <Button
                      title="Iniciar entrega"
                      onPress={() => handleStartDelivery(delivery.id)}
                    />
                  </View>
                )}

              {delivery.status === 'EN_CAMINO' && (
                <>
                  <View style={styles.buttonContainer}>
                    <Button
                      title="Marcar como entregada"
                      onPress={() => handleCompleteDelivery(delivery.id)}
                    />
                  </View>

                  <View style={styles.buttonContainer}>
                    <Button
                      title="No entregada"
                      onPress={() => handleFailedDelivery(delivery.id)}
                    />
                  </View>
                </>
              )}

              {delivery.eta_window_start &&
                delivery.eta_window_end && (
                  <Text style={styles.info}>
                    Horario estimado:{' '}
                    {new Date(
                      delivery.eta_window_start
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {new Date(
                      delivery.eta_window_end
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
            </View>
          ))
        )}
      </View>
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

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },

  value: {
    fontSize: 17,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  empty: {
    color: '#777',
  },

  deliveryCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },

  stop: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  deliveryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  info: {
    fontSize: 14,
    marginBottom: 5,
  },

  buttonContainer: {
    marginTop: 12,
  },
});
