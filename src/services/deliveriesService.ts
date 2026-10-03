import { supabase } from '@/lib/supabase';

type GeocodedAddress = {
  latitude: number;
  longitude: number;
  formatted_address: string;
};

async function geocodeAddress(
  address: string
): Promise<GeocodedAddress> {
  const { data, error } = await supabase.functions.invoke(
    'geocode-address',
    {
      body: { address },
    }
  );

  if (error) {
    console.error('Error geocodificando dirección:', error);
    throw new Error('No se pudo localizar la dirección.');
  }

  if (
    !data ||
    typeof data.latitude !== 'number' ||
    typeof data.longitude !== 'number'
  ) {
    throw new Error(
      data?.error ?? 'Google no devolvió coordenadas válidas.'
    );
  }

  return data as GeocodedAddress;
}

export async function createDelivery(
  routeId: string,
  claimNumber: string,
  fullName: string,
  email: string,
  phone: string,
  address: string,
  stopIndex: number
) {
  const coordinates = await geocodeAddress(address);
  console.log('Coordenadas obtenidas:', coordinates);

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      route_id: routeId,
      claim_number: claimNumber,
      full_name: fullName,
      email,
      phone,
      address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      stop_index: stopIndex,
      status: 'PENDIENTE',
    })
    .select()
    .single();

    console.log('Entrega guardada:', data);
    console.log('Error de Supabase:', error);

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
      failure_reason,
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
  const coordinates = await geocodeAddress(address);

  const { data, error } = await supabase
    .from('deliveries')
    .update({
      full_name: fullName,
      email,
      phone,
      address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
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

export async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  failureReason: string | null = null
) {
  const { error } = await supabase
    .from('deliveries')
    .update({
      status,
      failure_reason: failureReason,
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId);

  if (error) {
    console.error('Error actualizando estado de entrega:', error);
    throw error;
  }
}

export async function deleteDelivery(deliveryId: string) {
  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);

  if (error) {
    console.error('Error eliminando entrega:', error);
    throw error;
  }
}
