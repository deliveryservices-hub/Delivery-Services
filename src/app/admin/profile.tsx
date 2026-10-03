
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';

const PRIMARY = '#376194';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signOut();
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const initial = profile?.name?.charAt(0).toUpperCase() ?? 'A';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={21} color={PRIMARY} />
          </Pressable>

          <Text style={styles.screenTitle}>Mi perfil</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <Text style={styles.name}>
            {profile?.name ?? 'Administrador'}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={PRIMARY} />
            <Text style={styles.roleText}>Administrador</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información personal</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color={PRIMARY} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.label}>Nombre completo</Text>
                <Text style={styles.value}>
                  {profile?.name ?? 'Sin informar'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color={PRIMARY} />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.label}>Correo electrónico</Text>
                <Text style={styles.value}>
                  {profile?.email ?? 'Sin informar'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={PRIMARY}
                />
              </View>

              <View style={styles.infoContent}>
                <Text style={styles.label}>Rol</Text>
                <Text style={styles.value}>Administrador</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
            loading && styles.logoutDisabled,
          ]}
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#D64545" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#D64545" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footer}>Delivery Services</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E8EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1D2939',
  },
  topBarSpacer: {
    width: 42,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#E1EAF5',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 3,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: PRIMARY,
  },
  name: {
    fontSize: 23,
    fontWeight: '700',
    color: '#1D2939',
    textAlign: 'center',
    marginBottom: 9,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8EEF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    elevation: 2,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 13,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F4F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    color: '#1D2939',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF0F4',
  },
  logoutButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#F5D0D0',
    borderRadius: 14,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D64545',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 28,
    textAlign: 'center',
    color: '#98A2B3',
    fontSize: 12,
    fontWeight: '500',
  },
});