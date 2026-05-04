import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Platform, Alert, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { healthCheck, API_URL } from '../api';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Estados para el nombre y el rol
  const [role, setRole] = useState('FREE');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // --- FUNCIONES (Declaradas antes de los efectos para evitar errores de referencia) ---

  const handleLogout = async () => {
    setMenuVisible(false);
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  // HOOK clave: sincronización con el servidor cada vez que la pantalla gana foco
  const loadUserData = async () => {
    // Escudo de seguridad para evitar errores de red si API_URL aún no carga
    if (!API_URL || API_URL.includes('undefined')) return;

    try {
      const userId = await AsyncStorage.getItem('userId');

      // Si no hay ID, es que no hay sesión. Al Login de cabeza.
      if (!userId) {
        navigation.replace('Login');
        return;
      }

      // 1. Carga local rápida (Opcional, pero priorizamos la limpieza si hay duda)
      const savedRole = await AsyncStorage.getItem('userRole');
      const savedName = await AsyncStorage.getItem('userName');
      const savedEmail = await AsyncStorage.getItem('userEmail');

      // Solo seteamos local si el estado actual está vacío para evitar el "salto" de datos
      if (!userName && savedName) setUserName(savedName);
      if (savedRole) setRole(savedRole);
      if (savedEmail) setUserEmail(savedEmail);

      // 2. Sincronización Real con el Backend (Prioridad absoluta)
      const response = await fetch(`${API_URL}/auth/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Actualizamos estados con la VERDAD del servidor
        setRole(data.role);
        setUserName(data.name);
        setUserEmail(data.email);

        // Guardamos para la próxima vez
        await AsyncStorage.setItem('userRole', data.role);
        await AsyncStorage.setItem('userName', data.name);
        await AsyncStorage.setItem('userEmail', data.email);
      } else if (response.status === 404 || response.status === 401) {
        // Si el servidor no reconoce el token o el ID, limpiamos y fuera
        handleLogout();
      }
    } catch (e) {
      // Capturamos el error silenciosamente para evitar el pantallazo rojo inicial
      console.log("Error de red en HomeScreen:", e.message);
    }
  };

  // --- EFECTOS ---

  // Aplicamos el foco para que se dispare loadUserData
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [API_URL]) // Se re-ejecuta cuando API_URL esté listo
  );

  // Efecto para detectar exito del pago en Web (Stripe redirect)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        const syncPremium = async () => {
          try {
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`${API_URL}/confirm-premium`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId
              },
            });

            if (response.ok) {
              await AsyncStorage.setItem('userRole', 'PREMIUM');
              setRole('PREMIUM');
              Alert.alert("¡Éxito!", "Tu suscripción se ha activado correctamente. ¡Ya eres PREMIUM!");
            }
          } catch (error) {
            console.error("Error sincronizando premium:", error);
          }
        };
        syncPremium();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const isPremium = role === 'PREMIUM';
  const isTrainer = role === 'TRAINER';

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>

        {/* __ CABECERA __ */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola de nuevo,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.appName}>{userName || 'FitHub Connect'}</Text>
              {isPremium && (
                <MaterialCommunityIcons name="check-decagram" size={20} color="#4CAF50" style={{ marginLeft: 6 }} />
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.avatarWrapper} onPress={() => setMenuVisible(true)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            {isPremium && (
              <View style={styles.smallVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* __ MENÚ DESPLEGABLE __ */}
        <ProfileMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          userName={userName}
          userEmail={userEmail}
          isPremium={isPremium}
          isTrainer={isTrainer}
          navigation={navigation}
          onLogout={handleLogout}
          insets={insets}
        />

        {/* __ BANNER HAZTE PREMIUM (solo para FREE) __ */}
        {!isPremium && !isTrainer && (
          <TouchableOpacity
            style={styles.premiumBanner}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SubscriptionBenefits')}
          >
            <LinearGradient
              colors={['#FFD700', '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumLabel}>OFERTA LIMITADA</Text>
                <Text style={styles.premiumTitle}>Hazte PREMIUM ahora</Text>
                <Text style={styles.premiumSub}>Ver ventajas y planes</Text>
              </View>
              <View style={styles.premiumBtn}>
                <Text style={styles.premiumBtnText}>Ver más</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* __ BANNER DE PUBLICIDAD __*/}
        {!isTrainer && (
          <LinearGradient
            colors={['#1b5e20', '#2E7D32', '#4CAF50']}
            style={styles.banner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.bannerLabel}>Destacado</Text>
            <Text style={styles.bannerTitle}>Encuentra tu monitor ideal</Text>
            <Text style={styles.bannerSub}>Más de 20 entrenadores certificados</Text>
            <TouchableOpacity
              style={styles.bannerBtn}
              onPress={() => navigation.navigate('MonitorList')}
            >
              <Text style={styles.bannerBtnText}>Ver monitores</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}

        <Text style={styles.sectionTitle}>¿Qué quieres hacer?</Text>

        <View style={styles.cardGrid}>
          <ActionCard
            title={isTrainer ? 'Comunidad' : 'Monitores'}
            desc={isTrainer ? 'Posts y seguidores' : 'Busca y contrata entrenadores'}
            icon={<MaterialCommunityIcons name={isTrainer ? "account-group" : "dumbbell"} size={28} color="#4CAF50" />}
            onPress={() => isTrainer ? navigation.navigate('Social') : navigation.navigate('MonitorList')}
          />
          <ActionCard
            title={isTrainer ? 'Mis rutinas' : 'Mis rutinas'}
            desc={isTrainer ? 'Diseña y comparte planes' : 'Tus entrenamientos'}
            icon={<MaterialCommunityIcons name="clipboard-text" size={28} color="#4CAF50" />}
            onPress={() => navigation.navigate('Routines')}
          />
          <ActionCard
            title={isTrainer ? 'Disponibilidad' : 'Comunidad'}
            desc={isTrainer ? 'Publica tus horarios' : 'Posts y seguidores'}
            icon={<MaterialCommunityIcons name={isTrainer ? "clock-outline" : "account-group"} size={28} color="#4CAF50" />}
            onPress={() => isTrainer ? navigation.navigate('TrainerAvailability') : navigation.navigate('Social')}
          />
          <ActionCard
            title="Videos"
            desc={isTrainer ? 'Publica tu contenido' : 'Entrena con los mejores'}
            icon={<MaterialCommunityIcons name="play-box-multiple" size={28} color="#4CAF50" />}
            onPress={() => navigation.navigate('Videos')}
          />
        </View>

      </ScrollView>
    </LinearGradient >
  );
}

function ActionCard({ title, desc, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={{ marginBottom: 10 }}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

function ProfileMenu({ visible, onClose, userName, userEmail, isPremium, isTrainer, navigation, onLogout, insets }) {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.dropdownMenu, { top: insets.top + 70 }]}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuEmail}>{userEmail || 'usuario@fithub.com'}</Text>
          {isPremium && (
            <View style={styles.premiumTag}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#4CAF50" />
              <Text style={styles.premiumTagText}>PREMIUM</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            onClose();
            navigation.navigate('Account');
          }}
        >
          <Ionicons name="person-outline" size={20} color="#fff" />
          <Text style={styles.menuItemText}>Mi Cuenta</Text>
        </TouchableOpacity>

        {!isPremium && !isTrainer && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              navigation.navigate('SubscriptionBenefits');
            }}
          >
            <Ionicons name="star-outline" size={20} color="#FFD700" />
            <Text style={[styles.menuItemText, { color: '#FFD700' }]}>Hazte Premium</Text>
          </TouchableOpacity>
        )}

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={[styles.menuItem, { marginBottom: 0 }]}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF5252" />
          <Text style={[styles.menuItemText, { color: '#FF5252' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  smallVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  premiumBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  premiumTextContainer: { flex: 1 },
  premiumLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  premiumSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  premiumBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  premiumBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  banner: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
  },
  bannerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  bannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: (width - 40 - 12) / 2,
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#777',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    width: 220,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  menuHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 8,
  },
  menuEmail: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumTagText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    marginBottom: 4,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
});