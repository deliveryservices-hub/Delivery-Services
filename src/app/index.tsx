import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (profile?.role === 'ADMIN') {
    return <Redirect href="/admin" />;
  }

  if (profile?.role === 'CHOFER') {
    return <Redirect href="/driver" />;
  }

  if (profile?.role === 'LATAM') {
    return <Redirect href="/latam" />;
  }

  return <Redirect href="/login" />;
}
