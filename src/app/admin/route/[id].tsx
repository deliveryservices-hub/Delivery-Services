import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  Button,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import CreateDeliveryForm from '@/components/admin/CreateDeliveryForm';
import { supabase } from '@/lib/supabase';
import { getDeliveriesByRoute } from '@/services/deliveriesService';

type Route = {
  id: string;
  date: string;
  status: string;
  service_time_minutes: number;
  started_at: string | null;
  driver_id: string;
  users: {
    id: string;
    name: string;
  }[];
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

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] =
  useState<Delivery | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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
          driver_id,
          users (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error cargando recorrido:', error);
        return;
      }

      setRoute(data as Route);

      const deliveriesData = await getDeliveriesByRoute(id);

      setDeliveries(deliveriesData as Delivery[]);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedDelivery) {
        setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({
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

  const nextStopIndex =
  deliveries.length > 0
    ? Math.max(
        ...deliveries.map(
          (delivery) => delivery.stop_index
        )
      ) + 1
    : 1;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.title}>
            Detalle del recorrido
        </Text>

        <View style={styles.card}>
            <Text style={styles.label}>Fecha</Text>
            <Text style={styles.value}>{route.date}</Text>

            <Text style={styles.label}>Chofer</Text>
            <Text style={styles.value}>
            {route.users?.[0]?.name ?? 'Sin asignar'}
            </Text>

            <Text style={styles.label}>Estado</Text>
            <Text style={styles.value}>
            {route.status}
            </Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>
            Entregas ({deliveries.length})
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
                    Reclamo: {delivery.claim_number}
                </Text>

                <Text style={styles.info}>
                    Email: {delivery.email}
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

                <Button
                    title="Editar"
                    onPress={() => {console.log('EDITAR ENTREGA:', delivery.id);setSelectedDelivery(delivery)}}
                />
                </View>
            ))
            )}
        </View>

        <View style={styles.card}>
            <CreateDeliveryForm
                routeId={route.id}
                nextStopIndex={nextStopIndex}
                delivery={selectedDelivery}
                onDeliveryCreated={loadData}
                onDeliveryUpdated={() => {
                    setSelectedDelivery(null);
                    loadData();
                }}
                onCancelEdit={() => setSelectedDelivery(null)}
            />
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },

  screen: {
    flex: 1,
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
    marginBottom: 6,
  },

  info: {
    fontSize: 14,
    marginBottom: 3,
  },
});
