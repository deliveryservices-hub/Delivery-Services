
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
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { createRoute } from '@/services/routesService';

type Driver = {
  id: string;
  name: string;
};

type CreateRouteFormProps = {
  onRouteCreated?: () => void;
};

const PRIMARY = '#376194';

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState('');
  const serviceTime = 8;
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      setLoadingDrivers(true);

      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['CHOFER', 'ADMIN']);

      if (error) {
        console.error('Error cargando choferes:', error);
        Alert.alert('Error', 'No se pudieron cargar los choferes.');
        return;
      }

      setDrivers(
        (data ?? [])
          .filter(
            (driver) =>
              typeof driver.id === 'string' &&
              typeof driver.name === 'string'
          )
          .map((driver) => ({
            id: driver.id,
            name: driver.name,
          }))
      );
    } catch (error) {
      console.error('Error cargando choferes:', error);
      Alert.alert('Error', 'No se pudieron cargar los choferes.');
    } finally {
      setLoadingDrivers(false);
    }
  }

  function parseDate(dateString: string) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDateForDisplay(dateString: string) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  function formatDateForDatabase(dateValue: Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getTodayDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }

  function handleSelectDate(day: number) {
    const selectedDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );

    if (selectedDate < getTodayDate()) {
      return;
    }

    setDate(formatDateForDatabase(selectedDate));
    setShowCalendar(false);
  }

  function changeMonth(offset: number) {
    const nextMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + offset,
      1
    );

    const today = getTodayDate();
    const currentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    if (nextMonth < currentMonth) {
      return;
    }

    setCalendarMonth(nextMonth);
  }

  async function handleCreateRoute() {
    if (loading) return;

    if (!driverId) {
      Alert.alert('Falta información', 'Seleccioná un chofer.');
      return;
    }

    if (!date) {
      Alert.alert('Falta información', 'Ingresá una fecha.');
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

    const { data: existingRoute, error: existingRouteError } =
      await supabase
        .from('routes')
        .select('id')
        .eq('driver_id', driverId)
        .eq('date', date)
        .maybeSingle();

    if (existingRouteError) {
      console.error(
        'Error verificando recorrido existente:',
        existingRouteError
      );

      Alert.alert(
        'Error',
        'No se pudo verificar si el chofer ya tiene un recorrido para esa fecha.'
      );
      return;
    }

    if (existingRoute) {
      Alert.alert(
        'Recorrido existente',
        'Este chofer ya tiene un recorrido asignado para esa fecha.'
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

      setDriverId('');
      onRouteCreated?.();
    } catch (error) {
      console.error('Error creando recorrido:', error);

      Alert.alert('Error', 'No se pudo crear el recorrido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.formTitle}>Nuevo recorrido</Text>
      <Text style={styles.formSubtitle}>
        Completá los datos para programar un reparto.
      </Text>

      <Text style={styles.label}>Fecha</Text>

      <Pressable
        style={({ pressed }) => [
          styles.dateInput,
          showCalendar && styles.dateInputActive,
          pressed && styles.pressed,
        ]}
        onPress={() => {
          setCalendarMonth(parseDate(date));
          setShowCalendar((current) => !current);
        }}
      >
        <View style={styles.fieldIcon}>
          <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
        </View>

        <View style={styles.dateContent}>
          <Text style={styles.fieldCaption}>Fecha del recorrido</Text>
          <Text style={styles.dateText}>{formatDateForDisplay(date)}</Text>
        </View>

        <Ionicons
          name={showCalendar ? 'chevron-up' : 'chevron-down'}
          size={19}
          color="#667085"
        />
      </Pressable>

      {showCalendar && (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.monthArrow}
              onPress={() => changeMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color={PRIMARY} />
            </Pressable>

            <Text style={styles.monthTitle}>
              {calendarMonth.toLocaleDateString('es-AR', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>

            <Pressable
              style={styles.monthArrow}
              onPress={() => changeMonth(1)}
            >
              <Ionicons name="chevron-forward" size={20} color={PRIMARY} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
              <Text key={index} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({
              length: getFirstDayOfMonth(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth()
              ),
            }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.day} />
            ))}

            {Array.from({
              length: getDaysInMonth(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth()
              ),
            }).map((_, index) => {
              const day = index + 1;

              const selectedDate = new Date(
                calendarMonth.getFullYear(),
                calendarMonth.getMonth(),
                day
              );

              const isPast = selectedDate < getTodayDate();
              const isSelected =
                formatDateForDatabase(selectedDate) === date;
              const isToday =
                formatDateForDatabase(selectedDate) === getTodayLocal();

              return (
                <Pressable
                  key={day}
                  disabled={isPast}
                  onPress={() => handleSelectDate(day)}
                  style={[
                    styles.day,
                    isSelected && styles.selectedDay,
                    isToday && !isSelected && styles.todayDay,
                    isPast && styles.disabledDay,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      isPast && styles.disabledDayText,
                      isToday && !isSelected && styles.todayDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Text style={styles.calendarHint}>
              Seleccioná una fecha a partir de hoy.
            </Text>
            <Pressable onPress={() => setShowCalendar(false)}>
              <Text style={styles.calendarClose}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.label}>Chofer</Text>

      {loadingDrivers ? (
        <View style={styles.driverLoading}>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.driverLoadingText}>
            Cargando choferes...
          </Text>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.noDriversContainer}>
          <Ionicons name="people-outline" size={23} color="#667085" />
          <Text style={styles.noDrivers}>
            No hay choferes disponibles.
          </Text>
          <Pressable onPress={loadDrivers}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.driversList}>
          {drivers.map((driver) => {
            const selected = driverId === driver.id;

            return (
              <Pressable
                key={driver.id}
                style={({ pressed }) => [
                  styles.driverCard,
                  selected && styles.selectedDriverCard,
                  pressed && styles.pressed,
                ]}
                onPress={() => setDriverId(driver.id)}
              >
                <View
                  style={[
                    styles.driverAvatar,
                    selected && styles.selectedDriverAvatar,
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={19}
                    color={selected ? '#FFFFFF' : PRIMARY}
                  />
                </View>

                <Text
                  style={[
                    styles.driverName,
                    selected && styles.selectedDriverName,
                  ]}
                  numberOfLines={1}
                >
                  {driver.name}
                </Text>

                <Ionicons
                  name={
                    selected
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={22}
                  color={selected ? PRIMARY : '#B8C1CC'}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {/* <Text style={styles.label}>Tiempo por entrega</Text>
      <View style={styles.timeInputContainer}>
        <View style={styles.fieldIcon}>
          <Ionicons name="time-outline" size={20} color={PRIMARY} />
        </View>

        <TextInput
          value={serviceTime}
          onChangeText={setServiceTime}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="8"
          placeholderTextColor="#98A2B3"
          maxLength={3}
        />

        <Text style={styles.minutesLabel}>minutos</Text>
      </View> */}

      <Pressable
        style={({ pressed }) => [
          styles.createButton,
          (loading || loadingDrivers) && styles.createButtonDisabled,
          pressed && !loading && styles.createButtonPressed,
        ]}
        onPress={handleCreateRoute}
        disabled={loading || loadingDrivers}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Crear recorrido</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    padding: 16,
    gap: 10,
    elevation: 2,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D2939',
  },
  formSubtitle: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 7,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    marginTop: 5,
    marginBottom: 2,
  },
  dateInput: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  dateInputActive: {
    borderColor: PRIMARY,
    backgroundColor: '#F8FAFD',
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContent: {
    flex: 1,
    gap: 3,
  },
  fieldCaption: {
    fontSize: 11,
    color: '#667085',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D2939',
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#E0E7F0',
    borderRadius: 15,
    padding: 12,
    backgroundColor: '#FDFEFF',
    marginTop: 3,
    marginBottom: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D2939',
    textTransform: 'capitalize',
  },
  monthArrow: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: '14.2857%',
    height: 39,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 13,
    color: '#344054',
  },
  selectedDay: {
    backgroundColor: PRIMARY,
  },
  selectedDayText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  todayDayText: {
    color: PRIMARY,
    fontWeight: '700',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#98A2B3',
  },
  calendarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    marginTop: 10,
    paddingTop: 10,
  },
  calendarHint: {
    fontSize: 10,
    color: '#667085',
    flex: 1,
  },
  calendarClose: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '700',
    paddingLeft: 10,
  },
  driversList: {
    gap: 9,
  },
  driverCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedDriverCard: {
    borderColor: PRIMARY,
    backgroundColor: '#F0F5FB',
  },
  driverAvatar: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDriverAvatar: {
    backgroundColor: PRIMARY,
  },
  driverName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
  },
  selectedDriverName: {
    color: PRIMARY,
    fontWeight: '700',
  },
  driverLoading: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  driverLoadingText: {
    fontSize: 13,
    color: '#667085',
  },
  noDriversContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  noDrivers: {
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  createButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: "#EF3038",
    borderRadius: 12,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#EF3038",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
});