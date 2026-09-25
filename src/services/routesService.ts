import { supabase } from '@/lib/supabase';

export async function createRoute(
  date: string,
  driverId: string,
  serviceTimeMinutes: number = 8
) {
  const { data, error } = await supabase
    .from('routes')
    .insert({
      date,
      driver_id: driverId,
      service_time_minutes: serviceTimeMinutes,
      status: 'PENDIENTE',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando recorrido:', error);
    throw error;
  }

  return data;
}

export async function getRoutes() {
  const { data, error } = await supabase
    .from('routes')
    .select(`
      id,
      date,
      status,
      service_time_minutes,
      started_at,
      driver_id,
      created_at,
      deliveries (
        id
      )
    `)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error obteniendo recorridos:', error);
    throw error;
  }

  const routesData = data ?? [];

  const driverIds = routesData
    .map((route) => route.driver_id)
    .filter(Boolean);

  if (driverIds.length === 0) {
    return routesData.map((route) => ({
      ...route,
      driver: null,
    }));
  }

  const { data: driversData, error: driversError } =
    await supabase
      .from('users')
      .select('id, name')
      .in('id', driverIds);

  if (driversError) {
    console.error(
      'Error obteniendo choferes:',
      driversError
    );
    throw driversError;
  }

  return routesData.map((route) => ({
    ...route,
    driver:
      driversData?.find(
        (driver) => driver.id === route.driver_id
      ) ?? null,
  }));
}

export async function startRoute(routeId: string) {
  const { error } = await supabase
    .from('routes')
    .update({
      status: 'EN_CURSO',
      started_at: new Date().toISOString(),
    })
    .eq('id', routeId);

  if (error) {
    console.error('Error iniciando recorrido:', error);
    throw error;
  }
}

export async function completeRoute(routeId: string) {
  const { error } = await supabase
    .from('routes')
    .update({
      status: 'COMPLETADO',
    })
    .eq('id', routeId);

  if (error) {
    console.error('Error finalizando recorrido:', error);
    throw error;
  }
}
