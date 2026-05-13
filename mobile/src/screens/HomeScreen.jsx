import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../api';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Importamos el layout y el tema para aplicar el estilo
import AppLayout, { theme } from './AppLayout';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Estados para el nombre y el rol
  const [role, setRole] = useState('FREE');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // __ FUNCIONES __
  const handleLogout = async () => {
    try {
      setMenuVisible(false);

      // Borramos lo que identifica a la sesión activa.
      const keysToRemove = [
        'userToken',
        'loginTimestamp',
        'userRole',
        'userId',
        'userName',
        'userEmail'
      ];
      await AsyncStorage.multiRemove(keysToRemove);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // Sincronización con el servidor
  const loadUserData = async () => {
    if (!API_URL || API_URL.includes('undefined')) return;

    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        navigation.replace('Login');
        return;
      }

      // Carga local rápida
      const savedRole = await AsyncStorage.getItem('userRole');
      const savedName = await AsyncStorage.getItem('userName');
      const savedEmail = await AsyncStorage.getItem('userEmail');

      if (savedName) setUserName(savedName);
      if (savedRole) setRole(savedRole);
      if (savedEmail) setUserEmail(savedEmail);

      // Sincronización con el Backend
      const response = await fetch(`${API_URL}/auth/user/${userId}`);
      if (response.ok) {
        const data = await response.json();

        setRole(data.role);
        setUserName(data.name);
        setUserEmail(data.email);

        await AsyncStorage.setItem('userRole', data.role);
        await AsyncStorage.setItem('userName', data.name);
        await AsyncStorage.setItem('userEmail', data.email);

        // Comprobamos si tiene suscripciones activas
        if (userId) {
          const subsRes = await fetch(`${API_URL}/subscriptions/user/${userId}`);
          if (subsRes.ok) {
            const subsData = await subsRes.json();
            setHasActiveSubscription(Array.isArray(subsData) && subsData.length > 0);
          }
        }

      } else if (response.status === 404 || response.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.log("Error de red en HomeScreen:", e.message);
    }
  };

  // Aplicamos el foco para que se dispare loadUserData
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [API_URL])
  );

  // Efecto para detectar exito del pago en Web (Stripe redirect)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const monitorId = urlParams.get('monitorId');

      if (paymentStatus === 'success' && monitorId) {
        Alert.alert("Éxito", "Tu suscripción al entrenador se ha activado correctamente.");
        navigation.navigate('MonitorDetail', { monitor: { id: parseInt(monitorId) } });
      }

      if (paymentStatus) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const isTrainer = role === 'TRAINER';

  return (
    <AppLayout
      title="Dashboard"
      navigation={navigation}
      useHeroPattern={true}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ color: 'white', fontSize: 38, fontWeight: '800', textAlign: 'center', letterSpacing: -1, marginBottom: 15 }}>
            Bienvenido de nuevo, {userName || 'Atleta'}
          </Text>
          <Text style={{ color: '#d1d5db', fontSize: 16, textAlign: 'center', marginBottom: 30, paddingHorizontal: 15, lineHeight: 24 }}>
            Transforma tu cuerpo y alcanza tu mejor versión. Entrenamientos personalizados, nutrición y comunidad en un solo lugar. ¡Empieza hoy mismo!
          </Text>

          <View style={{ flexDirection: 'column', width: '100%', maxWidth: 300, gap: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: theme.brand, paddingVertical: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => navigation.navigate(isTrainer ? 'TrainerAvailability' : 'MonitorList')}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                {isTrainer ? 'Mi Disponibilidad' : 'Reservar Monitor'}
              </Text>
              <Ionicons name={isTrainer ? 'calendar' : 'people'} size={18} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            {!isTrainer && !hasActiveSubscription && (
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => navigation.navigate('SubscriptionBenefits')}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Hazte Premium</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
}