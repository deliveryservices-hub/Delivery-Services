import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
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
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            {isEditing ? '✎' : '+'}
          </Text>
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>
            {isEditing ? 'Editar entrega' : 'Nueva entrega'}
          </Text>

          <Text style={styles.subtitle}>
            {isEditing
              ? 'Modificá los datos de la entrega seleccionada.'
              : 'Completá los datos para agregar una nueva entrega al recorrido.'}
          </Text>
        </View>
      </View>

      {/* Referencia de edición */}
      {isEditing && delivery && (
        <View style={styles.editReference}>
          <View style={styles.editReferenceIcon}>
            <Text style={styles.editReferenceIconText}>
              #
            </Text>
          </View>

          <View style={styles.editReferenceContent}>
            <Text style={styles.editReferenceLabel}>
              ENTREGA SELECCIONADA
            </Text>

            <Text style={styles.editReferenceClaim}>
              Reclamo {delivery.claim_number}
            </Text>
          </View>
        </View>
      )}

      {/* Identificación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Identificación
        </Text>

        <View style={styles.field}>
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
            placeholderTextColor="#A0A8B4"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isEditing}
          />

          {isEditing && (
            <Text style={styles.helper}>
              El número de reclamo no se puede modificar.
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Nombre completo
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Nombre del pasajero"
            placeholderTextColor="#A0A8B4"
            autoCapitalize="words"
          />
        </View>
      </View>

      {/* Contacto */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Contacto
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor="#A0A8B4"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Teléfono
          </Text>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="Ej. +54 9 11 1234-5678"
            placeholderTextColor="#A0A8B4"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Datos de entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Datos de entrega
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>
            Dirección
          </Text>

          <TextInput
            value={address}
            onChangeText={setAddress}
            style={[
              styles.input,
              styles.addressInput,
            ]}
            placeholder="Dirección completa"
            placeholderTextColor="#A0A8B4"
            multiline
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Parada */}
      {!isEditing && (
        <View style={styles.stopInfo}>
          <View>
            <Text style={styles.stopInfoLabel}>
              PARADA ASIGNADA
            </Text>

            <Text style={styles.stopInfoDescription}>
              Esta entrega se agregará al final del recorrido.
            </Text>
          </View>

          <View style={styles.stopNumber}>
            <Text style={styles.stopNumberText}>
              {nextStopIndex}
            </Text>
          </View>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Guardando...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {isEditing
                  ? 'Guardar cambios'
                  : 'Agregar entrega'}
              </Text>

              <Text style={styles.primaryButtonArrow}>
                →
              </Text>
            </>
          )}
        </Pressable>

        {isEditing && (
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelButtonPressed,
              loading && styles.disabledButton,
            ]}
            onPress={onCancelEdit}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>
              Cancelar
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    padding: 18,
    marginTop: 12,
    marginBottom: 10,
  },

  /* Header */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerIconText: {
    color: '#376194',
    fontSize: 23,
    fontWeight: '800',
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#253047',
    marginBottom: 3,
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7D8795',
  },

  /* Edición */

  editReference: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    borderRadius: 13,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E4EAF1',
  },

  editReferenceIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#E8F0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  editReferenceIconText: {
    color: '#376194',
    fontSize: 14,
    fontWeight: '800',
  },

  editReferenceContent: {
    flex: 1,
  },

  editReferenceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8993A1',
    letterSpacing: 1,
    marginBottom: 2,
  },

  editReferenceClaim: {
    fontSize: 14,
    fontWeight: '700',
    color: '#253047',
  },

  /* Sections */

  section: {
    marginBottom: 22,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#253047',
    marginBottom: 13,
  },

  field: {
    marginBottom: 13,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#596273',
    marginBottom: 7,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#DDE2E8',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: '#253047',
  },

  disabledInput: {
    backgroundColor: '#F3F5F8',
    borderColor: '#E5E8EC',
    color: '#8993A1',
  },

  helper: {
    fontSize: 11,
    color: '#8993A1',
    marginTop: 6,
    lineHeight: 16,
  },

  addressInput: {
    minHeight: 90,
    paddingTop: 12,
  },

  /* Parada */

  stopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF4FC',
    borderRadius: 14,
    padding: 13,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDE8F5',
  },

  stopInfoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#376194',
    letterSpacing: 1,
    marginBottom: 3,
  },

  stopInfoDescription: {
    fontSize: 11,
    color: '#6F7C8D',
    lineHeight: 16,
    maxWidth: 220,
  },

  stopNumber: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#376194',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  stopNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  /* Buttons */

  actions: {
    marginTop: 2,
    gap: 9,
  },

  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#EF3038',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 9,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.78,
  },

  disabledButton: {
    opacity: 0.55,
  },

  cancelButton: {
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE1E7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonPressed: {
    backgroundColor: '#F3F5F8',
  },

  cancelButtonText: {
    color: '#596273',
    fontSize: 13,
    fontWeight: '700',
  },
});
