import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

export default function AccountScreen({ navigation }) {
  const [userData, setUserData] = useState({ name: '', email: '', role: 'FREE', points: 0 });
  const [cargando, setCargando] = useState(true);
  const [loginHistory, setLoginHistory] = useState([]);

  const pointsToPremium = 10000;
  const progress = Math.min((userData.points || 0) / pointsToPremium, 1);

  useFocusEffect(
    React.useCallback(() => {
      const loadAllData = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) return;

          const [profileRes, loginsRes] = await Promise.all([
            fetch(`${API_URL}/auth/user/${userId}`),
            fetch(`${API_URL}/auth/login-history/${userId}`)
          ]);

          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUserData(profileData);
          }

          if (loginsRes.ok) {
            const loginsData = await loginsRes.json();
            setLoginHistory(Array.isArray(loginsData) ? loginsData : []);
          }
        } catch (e) {
          console.error("DEBUG: Error en la carga:", e);
        } finally {
          setCargando(false);
        }
      };
      loadAllData();
    }, [])
  );

  // Función para extraer hora y fecha formateada
  const formatDateTime = (dateString) => {
    if (!dateString) return { date: '--/--/--', time: '--:--' };
    const dateObj = new Date(dateString);
    return {
      date: dateObj.toLocaleDateString(),
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary }}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <AppLayout title="Mi Cuenta" navigation={navigation} showBackButton={true}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* 1. ESTADÍSTICAS RÁPIDAS */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <StatCard
            icon="shield-key-outline"
            label="Accesos"
            value={loginHistory.length}
            trend="+2"
          />
          <StatCard
            icon="trophy-outline"
            label="Puntos"
            value={userData.points || 0}
            trend={`${Math.floor(progress * 100)}%`}
          />
        </View>

        {/* 2. PANEL PREMIUM */}
        <View style={{
          backgroundColor: theme.bgSecondarySoft,
          borderRadius: 15,
          padding: 20,
          marginBottom: 25,
          borderWidth: 1,
          borderColor: theme.borderDefault
        }}>
          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="rocket-launch" size={32} color={theme.brand} />
            </View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 }}>¡Hola, {userData.name}!</Text>
            <Text style={{ color: theme.textBody, textAlign: 'center', fontSize: 13, marginTop: 5 }}>
              {userData.role === 'PREMIUM'
                ? 'Suscripción Premium activa.'
                : `Te faltan ${pointsToPremium - (userData.points || 0)} puntos para el nivel Premium.`}
            </Text>
          </View>

          {userData.role !== 'PREMIUM' && (
            <View style={{ marginTop: 5 }}>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: theme.brand }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.textBody, fontSize: 11 }}>Nivel: {userData.role}</Text>
                <Text style={{ color: theme.brand, fontSize: 11, fontWeight: '700' }}>{userData.points || 0} / {pointsToPremium}</Text>
              </View>
            </View>
          )}
        </View>

        {/* 3. DETALLES DE PERFIL */}
        <Text style={{ color: theme.brand, fontSize: 12, fontWeight: '800', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 }}>Detalles de Perfil</Text>
        <View style={{ backgroundColor: theme.bgSecondarySoft, borderRadius: 15, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.borderDefault, marginBottom: 25 }}>
          <DetailRow label="Nombre" value={userData.name} />
          <DetailRow label="Email" value={userData.email} />
          <DetailRow label="Suscripción" value={userData.role} isBrand />
          <DetailRow label="ID" value={`#${userData.id || '---'}`} last />
        </View>

        {/* 4. NOTIFICACIONES CON FECHA Y HORA */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ color: theme.brand, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Historial de Conexión</Text>
        </View>

        <View style={{ backgroundColor: theme.bgSecondarySoft, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderDefault }}>
          {loginHistory.length > 0 ? (
            loginHistory.map((log, idx) => {
              const { date, time } = formatDateTime(log.created_at);
              return (
                <View key={idx} style={{
                  flexDirection: 'row',
                  padding: 16,
                  borderBottomWidth: idx === loginHistory.length - 1 ? 0 : 1,
                  borderColor: theme.borderDefault,
                  alignItems: 'center'
                }}>
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.brand} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Acceso Autorizado</Text>
                    <Text style={{ color: theme.textBody, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{log.device || 'Navegador Web'}</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                      <Ionicons name="location-outline" size={12} color={theme.brand} />
                      <Text style={{ color: theme.textBody, fontSize: 10, marginLeft: 3 }}>IP: {log.ip_address}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.2)', marginHorizontal: 6 }}>|</Text>
                      <Ionicons name="map-outline" size={12} color={theme.brand} />
                      <Text style={{ color: theme.textBody, fontSize: 10, marginLeft: 3 }}>{log.location || 'España'}</Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{time}</Text>
                    <Text style={{ color: theme.textBody, fontSize: 10, marginTop: 2 }}>{date}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.textBody, fontSize: 12 }}>Sin registros de actividad.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const StatCard = ({ icon, label, value, trend }) => (
  <View style={{ width: '48%', backgroundColor: theme.bgSecondarySoft, padding: 16, borderRadius: 15, borderWidth: 1, borderColor: theme.borderDefault }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <MaterialCommunityIcons name={icon} size={22} color={theme.brand} />
      <Text style={{ color: theme.brand, fontSize: 11, fontWeight: 'bold' }}>{trend}</Text>
    </View>
    <Text style={{ color: theme.textBody, fontSize: 12, marginTop: 10 }}>{label}</Text>
    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{value}</Text>
  </View>
);

const DetailRow = ({ label, value, isBrand, last }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: last ? 0 : 1, borderColor: theme.borderDefault }}>
    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{label}</Text>
    <Text style={{ color: isBrand ? theme.textBrand : theme.textBody, fontSize: 14 }}>{value || '---'}</Text>
  </View>
);