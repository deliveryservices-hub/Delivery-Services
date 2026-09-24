import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { createRoute } from '@/services/routesService';

type Driver = {
  id: string;
  name: string;
};

type CreateRouteFormProps = {
  onRouteCreated?: () => void;
};

export default function CreateRouteForm({
  onRouteCreated,
}: CreateRouteFormProps) {
  const getTodayLocal = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };
  const [date, setDate] = useState(getTodayLocal());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState('');
  const [serviceTime, setServiceTime] = useState('8');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'CHOFER');

    if (error) {
      console.error('Error cargando choferes:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los choferes.'
      );
      return;
    }

    setDrivers(data ?? []);
  }

  async function handleCreateRoute() {
    if (!driverId) {
      Alert.alert(
        'Falta información',
        'Seleccioná un chofer.'
      );
      return;
    }

    if (!date) {
      Alert.alert(
        'Falta información',
        'Ingresá una fecha.'
      );
      return;
    }

    const serviceTimeMinutes = Number(serviceTime);

    if (
      !Number.isInteger(serviceTimeMinutes) ||
      serviceTimeMinutes <= 0
    ) {
      Alert.alert(
        'Dato inválido',
        'El tiempo por entrega debe ser un número mayor a 0.'
      );
      return;
    }

    setLoading(true);

    try {
      const route = await createRoute(
        date,
        driverId,
        serviceTimeMinutes
      );

      console.log('Recorrido creado:', route);

      Alert.alert(
        'Recorrido creado',
        'El recorrido se creó correctamente.'
      );

      // Limpiamos la selección después de crear
      setDriverId('');
      setServiceTime('8');
      onRouteCreated?.();
    } catch (error) {
      console.error('Error creando recorrido:', error);

      Alert.alert(
        'Error',
        'No se pudo crear el recorrido.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Nuevo recorrido
      </Text>

      <Text style={styles.label}>
        Fecha
      </Text>

      <TextInput
        value={date}
        onChangeText={setDate}
        style={styles.input}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>
        Chofer
      </Text>

      {drivers.length === 0 ? (
        <Text style={styles.noDrivers}>
          No hay choferes disponibles.
        </Text>
      ) : (
        drivers.map((driver) => (
          <View
            key={driver.id}
            style={styles.driverButton}
          >
            <Button
              title={
                driverId === driver.id
                  ? `✓ ${driver.name}`
                  : driver.name
              }
              onPress={() => setDriverId(driver.id)}
            />
          </View>
        ))
      )}

      <Text style={styles.label}>
        Tiempo por entrega (minutos)
      </Text>

      <TextInput
        value={serviceTime}
        onChangeText={setServiceTime}
        style={styles.input}
        keyboardType="numeric"
        placeholder="8"
      />

      <View style={styles.createButton}>
        <Button
          title={
            loading
              ? 'Creando...'
              : 'Crear recorrido'
          }
          onPress={handleCreateRoute}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 30,
    gap: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },

  driverButton: {
    marginBottom: 4,
  },

  noDrivers: {
    color: '#777',
    marginVertical: 8,
  },

  createButton: {
    marginTop: 12,
  },
});
