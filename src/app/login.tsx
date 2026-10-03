
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

const PRIMARY = '#376194';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (isLoading) return;

    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError('Completá el email y la contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: loginError } = await signIn(
        normalizedEmail,
        password
      );

      if (loginError) {
        setError('El email o la contraseña son incorrectos.');
        return;
      }

      router.replace('/');
    } catch {
      setError(
        'No se pudo conectar. Verificá tu conexión e intentá nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('../../assets/valija.png')}
                style={{ width: 56, height: 56, resizeMode: 'contain' }}
              />

              <Text style={styles.title}>
                DELIVERY <Text style={styles.titleAccent}>SERVICES</Text>
              </Text>

              <Text style={styles.subtitle}>
                Al servicio de LATAM
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.welcome}>¡Bienvenido!</Text>
              <Text style={styles.description}>
                Ingresá a tu cuenta para continuar.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#8995A3"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="usuario@email.com"
                    placeholderTextColor="#A0A8B2"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#8995A3"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresá tu contraseña"
                    placeholderTextColor="#A0A8B2"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    editable={!isLoading}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={21}
                      color="#8995A3"
                    />
                  </Pressable>
                </View>
              </View>

              {error !== '' && (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#C83C42"
                  />
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && !isLoading && styles.buttonPressed,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Iniciar sesión
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </Pressable>
            </View>

            <Text style={styles.footer}>
              Plataforma de gestión de entregas
            </Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 38,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#EF3038',
  },
  titleAccent: {
    color: PRIMARY,
  },
  subtitle: {
    fontSize: 15,
    color: '#778391',
    marginTop: 7,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  welcome: {
    fontSize: 23,
    fontWeight: '800',
    color: '#202B38',
  },
  description: {
    fontSize: 14,
    color: '#84909D',
    marginTop: 6,
    marginBottom: 26,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344252',
    marginBottom: 9,
  },
  inputWrapper: {
    height: 54,
    borderWidth: 1,
    borderColor: '#DCE2E9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#263442',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
  },
  error: {
    flex: 1,
    color: '#C83C42',
    fontSize: 13,
  },
  button: {
    height: 54,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: '#2B4D78',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#9AA4AF',
    fontSize: 12,
    marginTop: 30,
  },
});
