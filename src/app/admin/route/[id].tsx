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
  Alert,
  Pressable,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useLocalSearchParams } from 'expo-router';
import CreateDeliveryForm from '@/components/admin/CreateDeliveryForm';
import { supabase } from '@/lib/supabase';
import { 
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

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] =
  useState<Delivery | null>(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [orderChanged, setOrderChanged] = useState(false);

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

  const handleSaveOrder = async () => {
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

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DraggableFlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          const reordered = data.map((delivery, index) => ({
            ...delivery,
            stop_index: index + 1,
          }));

          setDeliveries(reordered);
          setOrderChanged(true);
        }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"

        ListHeaderComponent={
          <>
            <Text style={styles.title}>
              Detalle del recorrido
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>CHOFER ASIGNADO</Text>

              <Text style={styles.driverName}>
                {route.driver?.name ?? 'Sin asignar'}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.value}>{route.date}</Text>

              <Text style={styles.label}>Estado</Text>

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
                <Text style={styles.statusText}>
                  {route.status === 'PENDIENTE'
                    ? 'Pendiente'
                    : route.status === 'EN_CURSO'
                      ? 'En curso'
                      : route.status === 'COMPLETADO'
                        ? 'Completado'
                        : route.status}
                </Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>Total de entregas</Text>
              <Text style={styles.deliveryCount}>
                {deliveries.length}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                Entregas ({deliveries.length})
              </Text>

              {deliveries.length === 0 && (
                <Text style={styles.empty}>
                  Este recorrido todavía no tiene entregas.
                </Text>
              )}

              {deliveries.length > 0 && (
                <Text style={styles.dragHint}>
                  Mantené presionada una entrega para cambiarla de posición.
                </Text>
              )}
            </View>
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
              <Text style={styles.stop}>
                Parada {item.stop_index}
              </Text>

              <Pressable
                onLongPress={drag}
                disabled={isActive}
                delayLongPress={150}
                style={styles.dragButton}
              >
                <Text style={styles.dragButtonText}>☰</Text>
              </Pressable>
            </View>

            <Text style={styles.deliveryName}>
              {item.full_name}
            </Text>

            <Text style={styles.info}>
              Reclamo: {item.claim_number}
            </Text>

            <Text style={styles.info}>
              Email: {item.email}
            </Text>

            <Text style={styles.info}>
              Teléfono: {item.phone ?? 'Sin informar'}
            </Text>

            <Text style={styles.info}>
              Dirección: {item.address}
            </Text>

            <Text style={styles.info}>
              Estado: {item.status}
            </Text>

            <Button
              title="Editar"
              onPress={() => {
                setSelectedDelivery(item);
                setShowDeliveryForm(true);
              }}
            />
          </View>
        )}

        ListFooterComponent={
          <>
            {orderChanged && (
              <View style={styles.saveOrderContainer}>
                <Button
                  title="Guardar nuevo orden"
                  onPress={handleSaveOrder}
                />
              </View>
            )}

            <View style={styles.formSection}>
              {!showDeliveryForm ? (
                <Button
                  title="＋ Agregar entrega"
                  onPress={() => setShowDeliveryForm(true)}
                />
              ) : (
                <>
                  <View style={styles.formHeader}>
                    <Text style={styles.formHeaderTitle}>
                      {selectedDelivery
                        ? 'Editar entrega'
                        : 'Nueva entrega'}
                    </Text>

                    <Button
                      title="Ocultar formulario"
                      onPress={() => {
                        setSelectedDelivery(null);
                        setShowDeliveryForm(false);
                      }}
                    />
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
                </>
              )}
            </View>
          </>
        }
      />
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

  formCard: {
    marginTop: 20,
  },

  dragHint: {
    color: '#777',
    fontSize: 13,
    marginTop: 4,
  },

  dragButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
  },

  dragButtonText: {
    fontSize: 26,
    color: '#555',
  },

  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  activeDelivery: {
    opacity: 0.8,
  },

  saveOrderContainer: {
    marginBottom: 16,
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

  driverName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 8,
  },

  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },

  statusPending: {
    backgroundColor: '#FFF3CD',
  },

  statusInProgress: {
    backgroundColor: '#D9EDF7',
  },

  statusCompleted: {
    backgroundColor: '#DFF0D8',
  },

  deliveryCount: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 5,
  },
  
  formSection: {
    marginTop: 20,
    marginBottom: 20,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  formHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
},
});
