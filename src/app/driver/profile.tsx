
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';

const PRIMARY = '#376194';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = profile?.name || 'Chofer';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'C';

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Intentá nuevamente.'
      );
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Mi perfil</Text>
        <Text style={styles.subtitle}>
          Información de tu cuenta
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <Text style={styles.name}>{displayName}</Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name="car-outline"
              size={14}
              color={PRIMARY}
            />
            <Text style={styles.roleText}>CHOFER</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={PRIMARY}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Nombre completo</Text>
              <Text style={styles.value}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={PRIMARY}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Correo electrónico</Text>
              <Text style={styles.value}>
                {profile?.email || 'Sin email'}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={PRIMARY}
              />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.label}>Rol</Text>
              <Text style={styles.value}>Chofer</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !isSigningOut && styles.logoutPressed,
            isSigningOut && styles.logoutDisabled,
          ]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#D9534F" />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#D9534F"
              />
              <Text style={styles.logoutText}>
                Cerrar sesión
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>
          Delivery Services
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#202B38',
  },
  subtitle: {
    fontSize: 14,
    color: '#7A8694',
    marginTop: 5,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F0F9',
    borderWidth: 2,
    borderColor: '#D3E2F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: PRIMARY,
    fontSize: 34,
    fontWeight: '800',
  },
  name: {
    fontSize: 21,
    fontWeight: '700',
    color: '#202B38',
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F0F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  roleText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#EDF0F3',
    marginVertical: 22,
  },
  infoSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F5FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#84909D',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#303B49',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8B8B6',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 24,
  },
  logoutPressed: {
    backgroundColor: '#FFF3F2',
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#D9534F',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: '#A0A9B3',
    fontSize: 12,
    marginTop: 28,
    marginBottom: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});