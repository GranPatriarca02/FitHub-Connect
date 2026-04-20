import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Platform, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('FREE');
  const [cargando, setCargando] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        const name = await AsyncStorage.getItem('userName');
        const email = await AsyncStorage.getItem('userEmail');
        const savedRole = await AsyncStorage.getItem('userRole');
        
        if (name) setUserName(name);
        if (email) setUserEmail(email);
        if (savedRole) setRole(savedRole);
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setCargando(false);
      }
    }
    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, salir", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const handleSubscribeUnlimited = async () => {
    if (procesandoPago) return;
    setProcesandoPago(true);
    try {
      const response = await fetch(`${API_URL}/create-subscription-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          Linking.openURL(data.url);
        }
      } else {
        Alert.alert("Error", data.error || "No se pudo iniciar el pago");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error de conexión con el servidor");
    } finally {
      setProcesandoPago(false);
    }
  };

  const isPremium = role === 'CLIENT_PREMIUM';

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.modalOverlay}>
      <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.modalContent}>
        
        {/* Barra superior con botón de cerrar */}
        <View style={styles.topBar}>
          <Text style={styles.modalTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Info del Usuario */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{userName.charAt(0) || 'U'}</Text>
              </View>
              {isPremium && (
                <View style={styles.verifiedBadgeLarge}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userNameText}>{userName}</Text>
              <Text style={styles.userEmailText}>{userEmail}</Text>
              <View style={[styles.roleBadge, isPremium && styles.roleBadgePremium]}>
                <Text style={[styles.roleText, isPremium && styles.roleTextPremium]}>
                  {isPremium ? 'MEMBER' : 'FREE USER'}
                </Text>
              </View>
            </View>
          </View>

          {/* Opciones de Menú */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.menuItemIcon}>
                <Ionicons name="person-circle-outline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.menuItemText}>Mi Cuenta</Text>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(255, 82, 82, 0.1)' }]}>
                <Ionicons name="log-out-outline" size={24} color="#FF5252" />
              </View>
              <Text style={[styles.menuItemText, { color: '#FF5252' }]}>Cerrar Sesión</Text>
              <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Planes Disponibles</Text>

          {/* Card: Suscripción Ilimitada */}
          <TouchableOpacity 
            style={styles.planCard} 
            activeOpacity={0.9} 
            onPress={handleSubscribeUnlimited}
            disabled={procesandoPago}
          >
            <LinearGradient
              colors={['#FFD700', '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>Pase Ilimitado</Text>
                  <Text style={styles.planDesc}>Acceso total sin límites a todo el contenido.</Text>
                </View>
                <Text style={styles.planPrice}>29.99€</Text>
              </View>
              <View style={styles.subscribeBtn}>
                {procesandoPago ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.subscribeBtnText}>Suscribirse ahora</Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: '#000' },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 30,
    paddingBottom: 50,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  verifiedBadgeLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmailText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roleBadgePremium: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  roleText: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleTextPremium: {
    color: '#4CAF50',
  },
  menuSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 10,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  planDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subscribeBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

