import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';

export default function AccountScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState({ name: '', email: '', role: 'FREE' });
  const [cargando, setCargando] = useState(true);

  const [subscriptions, setSubscriptions] = useState([]);
  const [cargandoSubs, setCargandoSubs] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          const id = await AsyncStorage.getItem('userId');
          const name = await AsyncStorage.getItem('userName');
          const email = await AsyncStorage.getItem('userEmail');
          const role = await AsyncStorage.getItem('userRole');
          setUserData({ name: name || '', email: email || '', role: role || 'FREE' });

          if (role === 'PREMIUM' && id) {
            fetchSubscriptions(id);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setCargando(false);
        }
      };
      loadData();
    }, [])
  );

  const fetchSubscriptions = async (userId) => {
    setCargandoSubs(true);
    try {
      const res = await fetch(`${API_URL}/subscriptions/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoSubs(false);
    }
  };

  const isPremium = userData.role === 'PREMIUM';
  const isTrainer = userData.role === 'TRAINER';

  if (cargando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#121212']} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}>
        
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{userData.name.charAt(0)}</Text>
            {isPremium && (
              <View style={styles.badgeLarge}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
              </View>
            )}
            {isTrainer && (
              <View style={[styles.badgeLarge, { backgroundColor: '#1a1a2e' }]}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#4FC3F7" />
              </View>
            )}
          </View>
          <Text style={styles.nameText}>{userData.name}</Text>
          <Text style={styles.roleText}>
            {isPremium ? 'Miembro Premium' : isTrainer ? 'Entrenador / Monitor' : 'Usuario Free'}
          </Text>
        </View>
        
        {isPremium && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
            {cargandoSubs ? (
              <ActivityIndicator color="#4CAF50" />
            ) : subscriptions.length > 0 ? (
              subscriptions.map((sub, idx) => (
                <View key={idx} style={styles.subscriptionCard}>
                  <View style={styles.subIcon}>
                    <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
                  </View>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName}>{sub.monitorName}</Text>
                    <Text style={styles.subExpiry}>Expira el {new Date(sub.expiresAt).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.subAction}
                    onPress={() => navigation.navigate('MonitorDetail', { monitor: { id: parseInt(sub.monitorId), name: sub.monitorName } })}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No tienes suscripciones activas.</Text>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo Electrónico</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Estado de Cuenta</Text>
              <Text style={[styles.infoValue,
                isPremium && { color: '#4CAF50' },
                isTrainer && { color: '#4FC3F7' }
              ]}>
                {isPremium ? 'Verificado / Premium' : isTrainer ? 'Entrenador Verificado' : 'Pendiente de suscripción'}
              </Text>
            </View>
          </View>
        </View>

        {isTrainer && (
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: '#4CAF50', marginBottom: 15 }]} 
            onPress={() => navigation.navigate('TrainerProfile')}
          >
            <Text style={styles.backBtnText}>Configurar Perfil Público</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  container: { padding: 24, paddingBottom: 40 },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  badgeLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#121212',
    borderRadius: 15,
    padding: 2,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#888',
  },
  infoSection: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  backBtn: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  subExpiry: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  subAction: {
    padding: 5,
  },
});
