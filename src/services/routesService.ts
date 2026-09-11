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
      users (
        id,
        name
      )
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error cargando recorridos:', error);
    throw error;
  }

  return data ?? [];
}
