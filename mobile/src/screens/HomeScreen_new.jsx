import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { healthCheck, API_URL } from '../api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

  // __ NOTIFICACIONES __
  const [notificationsList, setNotificationsList] = useState([]);

  // Carga de notificaciones
  useEffect(() => {
    const loadPersistentNotifs = async () => {
      try {
        const stored = await AsyncStorage.getItem('persistent_notifications');
        if (stored) {
          setNotificationsList(JSON.parse(stored));
        }
      } catch (e) {
        console.log("Error cargando notificaciones persistentes:", e);
      }
    };
    loadPersistentNotifs();
  }, []);

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

  // HOOK clave: sincronización con el servidor cada vez que la pantalla gana foco
  const loadUserData = async () => {
    if (!API_URL || API_URL.includes('undefined')) return;

    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        navigation.replace('Login');
        return;
      }

      // / Carga local rápida
      const savedRole = await AsyncStorage.getItem('userRole');
      const savedName = await AsyncStorage.getItem('userName');
      const savedEmail = await AsyncStorage.getItem('userEmail');

      if (!userName && savedName) {
        setUserName(savedName);
        // Generamos la notificación.
        await addWelcomeNotification(savedName);
      }

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

      } else if (response.status === 404 || response.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.log("Error de red en HomeScreen:", e.message);
    }
  };

  // Función para añadir la notificación de inicio de sesión
  const addWelcomeNotification = async (name) => {
    const ahora = new Date();
    const fechaFormat = ahora.toLocaleDateString();
    const horaFormat = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ID único basado en el tiempo para que NO se sobreescriban
    const welcomeNote = {
      id: 'welcome-' + ahora.getTime() + '-' + Math.random().toString(36).substr(2, 9),
      user: 'Sistema FitHub',
      message: `¡Hola ${name}! Has iniciado sesión correctamente.`,
      time: `${fechaFormat} a las ${horaFormat}`,
      type: 'login',
      color: '#4CAF50',
      icon: 'shield-check'
    };

    try {
      // 1. Obtener lo que ya hay en disco directamente (más fiable que el estado actual)
      const stored = await AsyncStorage.getItem('persistent_notifications');
      let currentList = stored ? JSON.parse(stored) : [];

      // 2. Filtro de duplicados: Solo añadimos si no hay una notificación igual en el último minuto
      // (Para evitar que el focus effect la duplique mil veces por segundo)
      const yaExisteReciente = currentList.some(n =>
        n.message.includes(name) &&
        (ahora.getTime() - parseInt(n.id.split('-')[1]) < 60000)
      );

      if (!yaExisteReciente) {
        const updatedList = [welcomeNote, ...currentList];

        // 3. Guardar en disco ANTES que en el estado
        await AsyncStorage.setItem('persistent_notifications', JSON.stringify(updatedList));

        // 4. Actualizar el estado para que AppLayout lo vea
        setNotificationsList(updatedList);
      }
    } catch (e) {
      console.error("Error guardando notificación:", e);
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

      if (paymentStatus === 'success') {
        const syncPremium = async () => {
          try {
            const userId = await AsyncStorage.getItem('userId');
            const endpoint = monitorId ? '/subscriptions/confirm' : '/confirm-premium';
            const body = monitorId ? JSON.stringify({ monitorId: parseInt(monitorId) }) : JSON.stringify({});

            const response = await fetch(`${API_URL}${endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId
              },
              body: body
            });

            if (response.ok) {
              await AsyncStorage.setItem('userRole', 'PREMIUM');
              setRole('PREMIUM');
              Alert.alert("Exito", "Tu suscripcion se ha activado correctamente. Ya eres PREMIUM");

              if (monitorId) {
                navigation.navigate('MonitorDetail', { monitor: { id: parseInt(monitorId) } });
              }
            }
          } catch (error) {
            console.error("Error sincronizando premium:", error);
          }
        };
        syncPremium();
      }

      if (paymentStatus) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const isPremium = role === 'PREMIUM';
  const isTrainer = role === 'TRAINER';

  return (
    <AppLayout
      title="Dashboard"
      navigation={navigation}
      extraNotifications={notificationsList}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: 16, borderWidth: 1, borderColor: theme.borderDefault, borderStyle: 'dashed', borderRadius: 8, minHeight: 600 }}>

          {/* __ SECCIÓN BIENVENIDA __ */}
          <View style={{ marginBottom: 25 }}>
            <Text style={{ fontSize: 16, color: theme.textBody }}>Hola de nuevo,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>{userName || 'Atleta'}</Text>
              {isPremium && (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={24}
                  color={theme.textBrand}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          </View>

          {/* __ BANNER DINÁMICO __ */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate(isPremium ? 'MonitorList' : 'SubscriptionBenefits')}
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              marginBottom: 30,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)'
            }}
          >
            <LinearGradient
              colors={isPremium ? ['#1e1e1e', '#2a2a2a'] : ['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 22 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2 }}>
                  {isPremium ? 'MIEMBRO VIP' : 'OFERTA LIMITADA'}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                  {isPremium ? 'Explora contenido exclusivo' : 'Hazte PREMIUM ahora'}
                </Text>
              </View>
              <View style={{
                width: 54, height: 54, borderRadius: 27,
                backgroundColor: 'rgba(255,255,255,0.15)',
                justifyContent: 'center', alignItems: 'center'
              }}>
                <MaterialCommunityIcons name={isPremium ? "star" : "lightning-bolt"} size={30} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* __ GRID DE ACCIONES RÁPIDAS __ */}
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 }}>¿Qué quieres hacer?</Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            width: '100%'
          }}>
            <ActionCard
              title={isTrainer ? 'Comunidad' : 'Monitores'}
              desc={isTrainer ? 'Posts y seguidores' : 'Busca entrenadores'}
              icon={isTrainer ? "account-group" : "dumbbell"}
              onPress={() => isTrainer ? navigation.navigate('Social') : navigation.navigate('MonitorList')}
            />
            <ActionCard
              title="Rutinas"
              desc="Tus entrenamientos"
              icon="clipboard-text"
              onPress={() => navigation.navigate('Routines')}
            />
            <ActionCard
              title={isTrainer ? 'Disponibilidad' : 'Comunidad'}
              desc={isTrainer ? 'Tus horarios' : 'Posts y social'}
              icon={isTrainer ? "clock-outline" : "earth"}
              onPress={() => isTrainer ? navigation.navigate('TrainerAvailability') : navigation.navigate('Social')}
            />
            <ActionCard
              title="Videos"
              desc="Aprende y entrena"
              icon="play-box-multiple"
              onPress={() => navigation.navigate('Videos')}
            />
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

function ActionCard({ title, desc, icon, onPress }) {
  // Forzamos 48% en móvil para que entren dos por fila sí o sí
  const cardWidth = Platform.OS === 'web' ? '23.5%' : '48%';

  return (
    <TouchableOpacity
      style={{
        width: cardWidth,
        backgroundColor: theme.bgSecondarySoft,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.borderDefault,
        marginBottom: 15,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: theme.brandSofter,
        justifyContent: 'center', alignItems: 'center', marginBottom: 12
      }}>
        <MaterialCommunityIcons name={icon} size={24} color={theme.textBrand} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
        {title}
      </Text>
      <Text style={{ fontSize: 11, color: theme.textBody, marginTop: 4, lineHeight: 14 }} numberOfLines={2}>
        {desc}
      </Text>
    </TouchableOpacity>
  );
}