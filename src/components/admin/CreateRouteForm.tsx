import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Pressable,
  ScrollView,
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
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
      .select('id, name, role')
      .in('role', ['CHOFER', 'ADMIN']);

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

  function parseDate(dateString: string) {
    const [year, month, day] = dateString
      .split('-')
      .map(Number);

    return new Date(year, month - 1, day);
  }

  function formatDateForDisplay(dateString: string) {
    const [year, month, day] = dateString.split('-');

    return `${day}/${month}/${year}`;
  }

  function formatDateForDatabase(dateValue: Date) {
    const year = dateValue.getFullYear();
    const month = String(
      dateValue.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      dateValue.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getTodayDate() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }

  function getDaysInMonth(year: number, month: number) {
    return new Date(
      year,
      month + 1,
      0
    ).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    const day = new Date(
      year,
      month,
      1
    ).getDay();

    // Convertimos domingo = 0 a lunes = 0
    return day === 0 ? 6 : day - 1;
  }

  function handleSelectDate(day: number) {
    const selectedDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );

    const today = getTodayDate();

    if (selectedDate < today) {
      return;
    }

    setDate(formatDateForDatabase(selectedDate));
    setShowCalendar(false);
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

      <Pressable
        style={styles.dateInput}
        onPress={() => {
          setCalendarMonth(parseDate(date));
          setShowCalendar((current) => !current);
        }}
      >
        <Text style={styles.dateText}>
          📅 {formatDateForDisplay(date)}
        </Text>
      </Pressable>

      {showCalendar && (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={() => {
                const previousMonth = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth() - 1,
                  1
                );

                const today = getTodayDate();

                if (
                  previousMonth.getFullYear() <
                    today.getFullYear() ||
                  (
                    previousMonth.getFullYear() ===
                      today.getFullYear() &&
                    previousMonth.getMonth() <
                      today.getMonth()
                  )
                ) {
                  return;
                }

                setCalendarMonth(previousMonth);
              }}
            >
              <Text style={styles.monthButton}>‹</Text>
            </Pressable>

            <Text style={styles.monthTitle}>
              {calendarMonth.toLocaleDateString(
                'es-AR',
                {
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </Text>

            <Pressable
              onPress={() => {
                setCalendarMonth(
                  new Date(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth() + 1,
                    1
                  )
                );
              }}
            >
              <Text style={styles.monthButton}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {[
              'L',
              'M',
              'M',
              'J',
              'V',
              'S',
              'D',
            ].map((day, index) => (
              <Text
                key={index}
                style={styles.weekDay}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({
              length:
                getFirstDayOfMonth(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth()
                ),
            }).map((_, index) => (
              <View
                key={`empty-${index}`}
                style={styles.day}
              />
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

              const today = getTodayDate();

              const isPast = selectedDate < today;

              const selected =
                formatDateForDatabase(selectedDate) ===
                date;

              return (
                <Pressable
                  key={day}
                  disabled={isPast}
                  onPress={() =>
                    handleSelectDate(day)
                  }
                  style={[
                    styles.day,
                    selected &&
                      styles.selectedDay,
                    isPast &&
                      styles.disabledDay,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected &&
                        styles.selectedDayText,
                      isPast &&
                        styles.disabledDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

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

  dateInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },

  dateText: {
    fontSize: 16,
  },

  calendar: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  monthButton: {
    fontSize: 30,
    paddingHorizontal: 10,
  },

  weekHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  day: {
    width: '14.28%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },

  dayText: {
    fontSize: 14,
  },

  selectedDay: {
    backgroundColor: '#e8e8e8',
    borderRadius: 21,
  },

  selectedDayText: {
    fontWeight: '700',
  },

  disabledDay: {
    opacity: 0.3,
  },

  disabledDayText: {
    color: '#999',
  },
});
