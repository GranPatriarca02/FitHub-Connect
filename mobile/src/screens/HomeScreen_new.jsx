import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Dimensions, Platform, Alert, ImageBackground,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { healthCheck, API_URL, getTrainerUpcomingSessions } from '../api';
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

  // __ NOTIFICACIONES __
  const [notificationsList, setNotificationsList] = useState([]);

  // __ PRÓXIMAS SESIONES (sólo TRAINER) __
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

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
      color: theme.brand,
      icon: 'shield-check'
    };

    try {
      // 1. Obtener lo que ya hay en disco directamente (más fiable que el estado actual)
      const stored = await AsyncStorage.getItem('persistent_notifications');
      let currentList = stored ? JSON.parse(stored) : [];

      // 2. Filtro de duplicados: Solo añadimos si no hay una notificación igual en el último minuto
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

  // Carga las próximas sesiones del entrenador autenticado.
  const loadTrainerUpcomingSessions = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;
      setLoadingSessions(true);
      const data = await getTrainerUpcomingSessions(userId);
      setUpcomingSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('No se pudieron cargar las próximas sesiones:', e?.message);
      setUpcomingSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Aplicamos el foco para que se dispare loadUserData
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [API_URL])
  );

  // Cuando ya conocemos el rol y es TRAINER, recargamos las sesiones al
  // ganar el foco para que la lista esté siempre al día.
  useFocusEffect(
    useCallback(() => {
      if (role === 'TRAINER') {
        loadTrainerUpcomingSessions();
      }
    }, [role])
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

  // Formatea la fecha de una sesión a un texto amigable en español.
  const formatSessionDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
    } catch {
      return '';
    }
  };

  // Devuelve "HH:MM - HH:MM" para una sesión concreta.
  const formatSessionRange = (s) => {
    const start = (s.startTime || '').slice(0, 5);
    const end = (s.endTime || '').slice(0, 5);
    if (!start && !end) return '';
    if (!end) return start;
    return `${start} - ${end}`;
  };

  // Indica si la sesión ocurre hoy (badge "Hoy").
  const isSessionToday = (iso) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  };

  // Render del bloque de "Próximas sesiones" (solo TRAINER).
  const renderTrainerUpcomingSessions = () => (
    <View style={{ width: '100%', maxWidth: 560, marginTop: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={18}
            color={theme.brand}
          />
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '800',
              marginLeft: 8,
            }}
          >
            Próximas sesiones
          </Text>
        </View>
        {!loadingSessions && upcomingSessions.length > 0 && (
          <Text style={{ color: theme.textBody, fontSize: 12 }}>
            {upcomingSessions.length}{' '}
            {upcomingSessions.length === 1 ? 'sesión' : 'sesiones'}
          </Text>
        )}
      </View>

      {loadingSessions ? (
        <ActivityIndicator
          size="small"
          color={theme.brand}
          style={{ marginVertical: 24 }}
        />
      ) : upcomingSessions.length > 0 ? (
        <View style={{ gap: 12 }}>
          {upcomingSessions.map((s) => {
            const today = isSessionToday(s.date);
            const initial = (s.clientName || '?').charAt(0).toUpperCase();
            return (
              <View
                key={s.bookingId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.bgSecondarySoft,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.borderDefault,
                }}
              >
                <LinearGradient
                  colors={[theme.brand, '#15803d']}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}
                  >
                    {initial}
                  </Text>
                </LinearGradient>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {s.clientName || 'Cliente'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color={theme.textBrand}
                    />
                    <Text
                      style={{
                        color: theme.textBrand,
                        fontSize: 12,
                        marginLeft: 4,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                      numberOfLines={1}
                    >
                      {formatSessionDate(s.date)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={theme.textBody}
                    />
                    <Text
                      style={{
                        color: theme.textBody,
                        fontSize: 12,
                        marginLeft: 4,
                      }}
                    >
                      {formatSessionRange(s)}
                    </Text>
                  </View>
                </View>

                {today ? (
                  <View
                    style={{
                      backgroundColor: theme.brandSofter,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textBrand,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      Hoy
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor:
                        s.status === 'CONFIRMED'
                          ? theme.brandSofter
                          : 'rgba(255,255,255,0.06)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          s.status === 'CONFIRMED'
                            ? theme.textBrand
                            : theme.textBody,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {s.status === 'CONFIRMED' ? 'Confirmada' : 'Pendiente'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: theme.bgSecondarySoft,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.borderDefault,
            paddingVertical: 28,
            paddingHorizontal: 20,
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={42}
            color={theme.textBody}
          />
          <Text
            style={{
              color: '#fff',
              fontSize: 15,
              fontWeight: '700',
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            No tienes sesiones programadas
          </Text>
          <Text
            style={{
              color: theme.textBody,
              fontSize: 13,
              marginTop: 6,
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            Cuando un cliente reserve una sesión contigo, aparecerá aquí. Mantén tu disponibilidad al día para recibir más reservas.
          </Text>

          <TouchableOpacity
            style={{
              marginTop: 18,
              backgroundColor: theme.brand,
              paddingVertical: 12,
              paddingHorizontal: 22,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: theme.brand,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 3,
            }}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TrainerAvailability')}
          >
            <Ionicons
              name="calendar"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}
            >
              Consultar tu disponibilidad
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <AppLayout
      title="Dashboard"
      navigation={navigation}
      extraNotifications={notificationsList}
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
            {isTrainer
              ? 'Aquí tienes el resumen de tu agenda. Revisa tus próximas sesiones y mantén tu disponibilidad al día.'
              : 'Transforma tu cuerpo y alcanza tu mejor versión. Entrenamientos personalizados, nutrición y comunidad en un solo lugar. ¡Empieza hoy mismo!'}
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

            {!isPremium && !isTrainer && (
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => navigation.navigate('SubscriptionBenefits')}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Hazte Premium</Text>
              </TouchableOpacity>
            )}
          </View>

          {isTrainer && renderTrainerUpcomingSessions()}
        </View>
      </ScrollView>
    </AppLayout >
  );
}

function ActionCard({ title, desc, icon, onPress }) {
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