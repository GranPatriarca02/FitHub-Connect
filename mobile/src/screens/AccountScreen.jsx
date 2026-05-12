import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState({ name: '', email: '', role: 'FREE' });
  const [cargando, setCargando] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cargandoSubs, setCargandoSubs] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) return;

          const profileRes = await fetch(`${API_URL}/auth/user/${userId}`);
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            await AsyncStorage.setItem('userRole', profileData.role);
            await AsyncStorage.setItem('userName', profileData.name);
            setUserData({ name: profileData.name, email: profileData.email, role: profileData.role });
            if (profileData.role === 'PREMIUM') fetchSubscriptions(userId);
          } else {
            const name = await AsyncStorage.getItem('userName');
            const email = await AsyncStorage.getItem('userEmail');
            const role = await AsyncStorage.getItem('userRole');
            setUserData({ name: name || '', email: email || '', role: role || 'FREE' });
            if (role === 'PREMIUM') fetchSubscriptions(userId);
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
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <AppLayout title="Mi Cuenta" navigation={navigation} showBackButton={true}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Avatar + Nombre */}
        <View style={styles.profileHeader}>
          <LinearGradient colors={[theme.brand, '#15803d']} style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{userData.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          {isPremium && (
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={theme.brand} />
              <Text style={[styles.roleBadgeText, { color: theme.brand }]}>Premium</Text>
            </View>
          )}
          {isTrainer && (
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="dumbbell" size={14} color="#4FC3F7" />
              <Text style={[styles.roleBadgeText, { color: '#4FC3F7' }]}>Entrenador</Text>
            </View>
          )}
          <Text style={styles.nameText}>{userData.name}</Text>
          <Text style={styles.roleText}>
            {isPremium ? 'Miembro Premium' : isTrainer ? 'Entrenador / Monitor' : 'Usuario Free'}
          </Text>
        </View>

        {/* Suscripciones activas (solo premium) */}
        {isPremium && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Suscripciones Activas</Text>
            {cargandoSubs ? (
              <ActivityIndicator color={theme.brand} />
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
                    <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No tienes suscripciones activas.</Text>
            )}
          </View>
        )}

        {/* Información personal */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="mail-outline" size={20} color={theme.brand} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo Electrónico</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.brand} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Estado de Cuenta</Text>
              <Text style={[styles.infoValue,
                isPremium && { color: theme.brand },
                isTrainer && { color: '#4FC3F7' }
              ]}>
                {isPremium ? 'Verificado / Premium' : isTrainer ? 'Entrenador Verificado' : 'Pendiente de suscripción'}
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones de entrenador */}
        {isTrainer && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Panel del Entrenador</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate('TrainerProfile')}
            >
              <View style={[styles.actionIcon, { backgroundColor: theme.brandSofter }]}>
                <MaterialCommunityIcons name="id-card" size={20} color={theme.brand} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoValue}>Perfil Profesional</Text>
                <Text style={styles.infoLabel}>Edita tu perfil público de entrenador</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
            </TouchableOpacity>
          </View>
        )}

        {/* CTA Premium (solo FREE) */}
        {!isPremium && !isTrainer && (
          <TouchableOpacity
            style={styles.premiumCta}
            onPress={() => navigation.navigate('SubscriptionBenefits')}
          >
            <LinearGradient
              colors={[theme.brand, '#15803d']}
              style={styles.premiumCtaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="crown" size={20} color="#FFD700" style={{ marginRight: 10 }} />
              <Text style={styles.premiumCtaText}>Hazte Premium — Ver planes</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.brandSofter,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: theme.textBody,
  },
  infoSection: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textBrand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.textBody,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: theme.textBody,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  subIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  subInfo: { flex: 1 },
  subName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  subExpiry: { color: theme.textBody, fontSize: 12, marginTop: 2 },
  subAction: { padding: 5 },
  premiumCta: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  premiumCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  premiumCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
