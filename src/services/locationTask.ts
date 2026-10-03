import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export const LOCATION_TASK_NAME = 'driver-location-task';

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    console.log('🛰️ Tarea GPS ejecutada');
    if (error) {
      console.error('❌ Error en tarea GPS:', error);
      return;
    }

    if (!data) {
      console.log('⚠️ La tarea se ejecutó sin datos');
      return;
    }

    const { locations } = data as {
      locations: Location.LocationObject[];
    };

    console.log('📍 Ubicaciones recibidas:', locations?.length);

    const location = locations[0];

    if (!location) {
      console.log('⚠️ No se recibió ninguna ubicación');
      return;
    }

    console.log('📌 Coordenadas recibidas:', location.coords);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      return;
    }

    const user = sessionData.session?.user;

    if (!user) {
      console.log('⚠️ No se encontró un usuario autenticado');
      return;
    }

    console.log('👤 Usuario:', user.id);

    const routeId = await AsyncStorage.getItem(
      'active_route_id'
    );

    console.log('🛣️ Recorrido activo:', routeId);

    if (!routeId) {
      console.log('⚠️ No se encontró active_route_id');
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
      console.error('❌ Error guardando ubicación:', insertError);
      return;
    }

    console.log('✅ 📍 Ubicación guardada correctamente');
    console.log('Latitud:', location.coords.latitude);
    console.log('Longitud:', location.coords.longitude);
    console.log('Precisión:', location.coords.accuracy);
  }
);
