import { supabase } from '@/lib/supabase';

export async function createDelivery(
  routeId: string,
  claimNumber: string,
  fullName: string,
  email: string,
  phone: string,
  address: string,
  stopIndex: number
) {
  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      route_id: routeId,
      claim_number: claimNumber,
      full_name: fullName,
      email,
      phone,
      address,
      stop_index: stopIndex,
      status: 'PENDIENTE',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creando entrega:', error);
    throw error;
  }

  return data;
}

export async function getDeliveriesByRoute(
  routeId: string
) {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      claim_number,
      full_name,
      email,
      phone,
      address,
      status,
      stop_index,
      eta_window_start,
      eta_window_end,
      last_updated_at
    `)
    .eq('route_id', routeId)
    .order('stop_index', { ascending: true });

  if (error) {
    console.error('Error cargando entregas:', error);
    throw error;
  }

  return data ?? [];
}

export async function updateDelivery(
  deliveryId: string,
  fullName: string,
  email: string,
  phone: string,
  address: string
) {
  const { data, error } = await supabase
    .from('deliveries')
    .update({
      full_name: fullName,
      email,
      phone,
      address,
    })
    .eq('id', deliveryId)
    .select()
    .single();

  if (error) {
    console.error('Error actualizando entrega:', error);
    throw error;
  }

  return data;
}

export async function updateDeliveryOrder(
  deliveryId: string,
  stopIndex: number
) {
  const { error } = await supabase
    .from('deliveries')
    .update({
      stop_index: stopIndex,
    })
    .eq('id', deliveryId);

  if (error) {
    console.error('Error actualizando orden:', error);
    throw error;
  }
}
