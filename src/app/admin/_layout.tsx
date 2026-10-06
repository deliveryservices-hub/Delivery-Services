import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const canDrive = profile?.role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#376194',
        tabBarInactiveTintColor: '#777',

        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="driver"
        options={{
          title: 'Recorridos',

          href: canDrive ? undefined : null,

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="car-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Entregas',

          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="cube-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="route/[id]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="driver/route/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
