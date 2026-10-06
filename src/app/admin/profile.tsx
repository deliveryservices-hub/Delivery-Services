import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const PRIMARY = '#376194';
const RED = '#EF3038';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);

  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [showDriverPassword, setShowDriverPassword] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);

      await signOut();

      router.replace('/login');
    } catch (error) {
      console.error('Error cerrando sesión:', error);

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión.'
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'CHOFER')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error cargando choferes:', error);

        Alert.alert(
          'Error',
          'No se pudieron cargar los choferes.'
        );

        return;
      }

      setDrivers(data ?? []);
    } catch (error) {
      console.error('Error inesperado cargando choferes:', error);

      Alert.alert(
        'Error',
        'Ocurrió un error al cargar los choferes.'
      );
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'ADMIN') {
      loadDrivers();
    }
  }, [profile?.role]);

  const handleCreateDriver = async () => {
    const name = driverName.trim();
    const email = driverEmail.trim().toLowerCase();

    if (!name || !email || !driverPassword) {
      Alert.alert(
        'Falta información',
        'Completá nombre, email y contraseña.'
      );
      return;
    }

    if (driverPassword.length < 6) {
      Alert.alert(
        'Contraseña inválida',
        'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }

    try {
      setCreatingDriver(true);

      const { data, error } = await supabase.functions.invoke(
        'create-driver',
        {
          body: {
            name,
            email,
            password: driverPassword,
          },
        }
      );

      if (error) {
        console.error('Error creando chofer:', error);

        Alert.alert(
          'Error',
          error.message || 'No se pudo crear el chofer.'
        );

        return;
      }

      if (!data?.success) {
        Alert.alert(
          'Error',
          data?.error || 'No se pudo crear el chofer.'
        );

        return;
      }

      Alert.alert(
        'Chofer creado',
        `Se creó correctamente el usuario ${name}.`
      );

      setDriverName('');
      setDriverEmail('');
      setDriverPassword('');

      setShowDriverForm(false);
      await loadDrivers();
    } catch (error) {
      console.error('Error inesperado:', error);

      Alert.alert(
        'Error',
        'Ocurrió un error al crear el chofer.'
      );
    } finally {
      setCreatingDriver(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={PRIMARY}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                Mi perfil
              </Text>

              <Text style={styles.subtitle}>
                Administrá tu información y acceso
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="person-outline"
                size={26}
                color={PRIMARY}
              />
            </View>
          </View>

          {/* Perfil principal */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.name ?? 'Usuario'}
              </Text>

              <Text style={styles.profileEmail}>
                {profile.email}
              </Text>

              <View style={styles.roleBadge}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={PRIMARY}
                />

                <Text style={styles.roleText}>
                  {profile.role === 'ADMIN'
                    ? 'Administrador'
                    : 'Chofer'}
                </Text>
              </View>
            </View>
          </View>

          {/* Información personal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Información personal
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Nombre
                  </Text>

                  <Text style={styles.infoValue}>
                    {profile.name ?? 'Sin informar'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Email
                  </Text>

                  <Text style={styles.infoValue}>
                    {profile.email}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Rol
                  </Text>

                  <Text style={styles.infoValue}>
                    {profile.role === 'ADMIN'
                      ? 'Administrador'
                      : 'Chofer'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Gestión de choferes */}
          {profile.role === 'ADMIN' && (
            <>
              {/* Lista de choferes */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Choferes
                    </Text>

                    <Text style={styles.sectionDescription}>
                      Usuarios con acceso como chofer.
                    </Text>
                  </View>

                  <View style={styles.sectionIcon}>
                    <Ionicons
                      name="people-outline"
                      size={22}
                      color={PRIMARY}
                    />
                  </View>
                </View>

                <View style={styles.driversCard}>
                  {loadingDrivers ? (
                    <View style={styles.loadingDrivers}>
                      <ActivityIndicator
                        size="small"
                        color={PRIMARY}
                      />

                      <Text style={styles.loadingDriversText}>
                        Cargando choferes...
                      </Text>
                    </View>
                  ) : drivers.length === 0 ? (
                    <View style={styles.emptyDrivers}>
                      <View style={styles.emptyDriversIcon}>
                        <Ionicons
                          name="people-outline"
                          size={22}
                          color="#8A96A3"
                        />
                      </View>

                      <Text style={styles.emptyDriversTitle}>
                        No hay choferes registrados
                      </Text>

                      <Text style={styles.emptyDriversText}>
                        Creá el primer chofer usando el formulario.
                      </Text>
                    </View>
                  ) : (
                    drivers.map((driver, index) => {
                      const driverName = driver.name || 'Sin nombre';
                      const initial =
                        driverName.trim().charAt(0).toUpperCase() || 'C';

                      return (
                        <View
                          key={driver.id}
                          style={[
                            styles.driverRow,
                            index < drivers.length - 1 &&
                              styles.driverRowBorder,
                          ]}
                        >
                          <View style={styles.driverAvatar}>
                            <Text style={styles.driverAvatarText}>
                              {initial}
                            </Text>
                          </View>

                          <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>
                              {driverName}
                            </Text>

                            <Text style={styles.driverEmail}>
                              {driver.email || 'Sin email'}
                            </Text>
                          </View>

                          <View style={styles.driverRole}>
                            <Ionicons
                              name="car-outline"
                              size={15}
                              color={PRIMARY}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>

              {/* Botón mostrar / ocultar formulario */}
              <View style={styles.section}>
                <Pressable
                  style={styles.toggleFormButton}
                  onPress={() =>
                    setShowDriverForm((prev) => !prev)
                  }
                >
                  <Ionicons
                    name={
                      showDriverForm
                        ? 'chevron-up-outline'
                        : 'person-add-outline'
                    }
                    size={20}
                    color={PRIMARY}
                  />

                  <Text style={styles.toggleFormText}>
                    {showDriverForm
                      ? 'Ocultar formulario'
                      : 'Registrar nuevo chofer'}
                  </Text>
                </Pressable>

                {/* Formulario */}
                {showDriverForm && (
                  <View style={styles.formCard}>
                    {/* Nombre */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Nombre completo
                      </Text>

                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color="#777"
                        />

                        <TextInput
                          value={driverName}
                          onChangeText={setDriverName}
                          placeholder="Ej. Juan Pérez"
                          placeholderTextColor="#999"
                          style={styles.input}
                          autoCapitalize="words"
                          editable={!creatingDriver}
                        />
                      </View>
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Email
                      </Text>

                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color="#777"
                        />

                        <TextInput
                          value={driverEmail}
                          onChangeText={setDriverEmail}
                          placeholder="Ej. juan@email.com"
                          placeholderTextColor="#999"
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!creatingDriver}
                        />
                      </View>
                    </View>

                    {/* Contraseña */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Contraseña
                      </Text>

                      <View style={styles.inputWrapper}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color="#8995A3"
                        />

                        <TextInput
                          style={styles.input}
                          placeholder="Contraseña"
                          placeholderTextColor="#A0A8B2"
                          value={driverPassword}
                          onChangeText={setDriverPassword}
                          secureTextEntry={!showDriverPassword}
                          autoCapitalize="none"
                          textContentType="password"
                        />

                        <Pressable
                          onPress={() =>
                            setShowDriverPassword(
                              (prev) => !prev
                            )
                          }
                          hitSlop={10}
                        >
                          <Ionicons
                            name={
                              showDriverPassword
                                ? 'eye-off-outline'
                                : 'eye-outline'
                            }
                            size={21}
                            color="#8995A3"
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* Botón crear */}
                    <Pressable
                      style={[
                        styles.createButton,
                        creatingDriver &&
                          styles.createButtonDisabled,
                      ]}
                      onPress={handleCreateDriver}
                      disabled={creatingDriver}
                    >
                      {creatingDriver ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="person-add-outline"
                            size={20}
                            color="#FFFFFF"
                          />

                          <Text style={styles.createButtonText}>
                            Crear chofer
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Cerrar sesión */}
          <View style={styles.logoutSection}>
            <Pressable
              style={[
                styles.logoutButton,
                loggingOut &&
                  styles.logoutButtonDisabled,
              ]}
              onPress={handleSignOut}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator
                  size="small"
                  color={RED}
                />
              ) : (
                <>
                  <Ionicons
                    name="log-out-outline"
                    size={21}
                    color={RED}
                  />

                  <Text style={styles.logoutText}>
                    Cerrar sesión
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    padding: 20,
    paddingBottom: 80,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  avatarText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },

  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 3,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EAF0F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 9,
    gap: 5,
  },

  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  section: {
    marginBottom: 26,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
  },

  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    maxWidth: 280,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D9DEE5',
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 10,
    paddingVertical: 10,
  },

  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },

  passwordInput: {
    height: 50,
    paddingHorizontal: 14,
    paddingRight: 48,
    fontSize: 15,
    color: '#111827',
  },

  passwordToggle: {
    position: 'absolute',
    right: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  createButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginTop: 4,
  },

  createButtonDisabled: {
    opacity: 0.7,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  driversCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },

  loadingDrivers: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  loadingDriversText: {
    fontSize: 13,
    color: '#6B7280',
  },

  emptyDrivers: {
    padding: 24,
    alignItems: 'center',
  },

  emptyDriversIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F0F3F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  emptyDriversTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  emptyDriversText: {
    fontSize: 13,
    color: '#7A8694',
    textAlign: 'center',
    marginTop: 4,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  driverRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0F3',
  },

  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  driverAvatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },

  driverInfo: {
    flex: 1,
  },

  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },

  driverEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  driverRole: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF0F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  toggleFormButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#C9D7E6',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  toggleFormText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },

  logoutSection: {
    marginTop: 4,
    marginBottom: 20,
  },

  logoutButton: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1B7BA',
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  logoutButtonDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    color: RED,
    fontSize: 15,
    fontWeight: '700',
  },
});
