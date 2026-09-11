import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createDelivery,
  updateDelivery,
} from '@/services/deliveriesService';

type Delivery = {
  id: string;
  claim_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string;
};

type CreateDeliveryFormProps = {
  routeId: string;
  nextStopIndex: number;
  delivery?: Delivery | null;
  onDeliveryCreated?: () => void;
  onDeliveryUpdated?: () => void;
  onCancelEdit?: () => void;
};

export default function CreateDeliveryForm({
  routeId,
  nextStopIndex,
  delivery,
  onDeliveryCreated,
  onDeliveryUpdated,
  onCancelEdit,
}: CreateDeliveryFormProps) {
  const isEditing = !!delivery;
  console.log('FORM MODE:', isEditing, delivery?.id);

  const [claimNumber, setClaimNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (delivery) {
      setClaimNumber(delivery.claim_number);
      setName(delivery.full_name);
      setEmail(delivery.email);
      setPhone(delivery.phone ?? '');
      setAddress(delivery.address);
    } else {
      setClaimNumber('');
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
  }, [delivery]);

  async function handleSubmit() {
    if (!claimNumber.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresá el número de reclamo.'
      );
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresá el nombre del pasajero.'
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresá el email del pasajero.'
      );
      return;
    }

    if (!phone.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresá el teléfono del pasajero.'
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Falta información',
        'Ingresá la dirección de entrega.'
      );
      return;
    }

    setLoading(true);

    try {
      if (isEditing && delivery) {
        await updateDelivery(
          delivery.id,
          name.trim(),
          email.trim(),
          phone.trim(),
          address.trim()
        );

        Alert.alert(
          'Entrega actualizada',
          'Los datos se actualizaron correctamente.'
        );

        onDeliveryUpdated?.();
      } else {
        await createDelivery(
          routeId,
          claimNumber.trim(),
          name.trim(),
          email.trim(),
          phone.trim(),
          address.trim(),
          nextStopIndex
        );

        Alert.alert(
          'Entrega creada',
          'La entrega se agregó correctamente.'
        );

        setClaimNumber('');
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');

        onDeliveryCreated?.();
      }
    } catch (error) {
      console.error(
        isEditing
          ? 'Error actualizando entrega:'
          : 'Error creando entrega:',
        error
      );

      Alert.alert(
        'Error',
        isEditing
          ? 'No se pudo actualizar la entrega.'
          : 'No se pudo crear la entrega.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isEditing ? 'Editar entrega' : 'Nueva entrega'}
      </Text>

      <Text style={styles.label}>
        Número de reclamo
      </Text>

      <TextInput
        value={claimNumber}
        onChangeText={setClaimNumber}
        style={[
          styles.input,
          isEditing && styles.disabledInput,
        ]}
        placeholder="Ej. ABC123456"
        autoCapitalize="characters"
        editable={!isEditing}
      />

      {isEditing && (
        <Text style={styles.helper}>
          El número de reclamo no se puede modificar.
        </Text>
      )}

      <Text style={styles.label}>
        Nombre completo
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Nombre del pasajero"
      />

      <Text style={styles.label}>
        Email
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholder="correo@ejemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Teléfono
      </Text>

      <TextInput
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        placeholder="Ej. +54 9 11 1234-5678"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>
        Dirección
      </Text>

      <TextInput
        value={address}
        onChangeText={setAddress}
        style={[styles.input, styles.addressInput]}
        placeholder="Dirección completa"
        multiline
      />

      {!isEditing && (
        <Text style={styles.stopInfo}>
          Parada asignada: {nextStopIndex}
        </Text>
      )}

      <View style={styles.button}>
        <Button
          title={
            loading
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Agregar entrega'
          }
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>

      {isEditing && (
        <View style={styles.cancelButton}>
          <Button
            title="Cancelar"
            onPress={onCancelEdit}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 10,
    gap: 10,
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },

  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#777',
  },

  helper: {
    fontSize: 12,
    color: '#777',
    marginTop: -4,
  },

  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  stopInfo: {
    color: '#666',
    marginTop: 4,
  },

  button: {
    marginTop: 10,
  },

  cancelButton: {
    marginTop: 4,
  },
});
