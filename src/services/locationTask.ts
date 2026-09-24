import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const LOCATION_TASK_NAME = 'driver-location-task';

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('Error en tarea de ubicación:', error);
      return;
    }

    if (!data) {
      return;
    }

    const { locations } = data as {
      locations: Location.LocationObject[];
    };

    const location = locations[0];

    if (!location) {
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        'Error obteniendo sesión para ubicación:',
        sessionError
      );
      return;
    }

    const user = sessionData.session?.user;

    if (!user) {
      console.error(
        'No hay usuario autenticado para guardar ubicación.'
      );
      return;
    }

    const routeId = await AsyncStorage.getItem(
      'active_route_id'
    );

    if (!routeId) {
      console.error(
        'No hay un recorrido activo para guardar ubicación.'
      );
      return;
    }

    const { error: insertError } = await supabase
      .from('driver_locations')
      .insert({
        driver_id: user.id,
        route_id: routeId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

    if (insertError) {
      console.error(
        'Error guardando ubicación:',
        insertError
      );
      return;
    }

    console.log('📍 Ubicación guardada');
    console.log('Latitud:', location.coords.latitude);
    console.log('Longitud:', location.coords.longitude);
    console.log('Precisión:', location.coords.accuracy);
  }
);
