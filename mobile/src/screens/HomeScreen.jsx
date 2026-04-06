import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [role, setRole] = useState('FREE');
  const [userName, setUserName] = useState('');

  // Carga los datos cada vez que la pantalla gana el foco (vuelve de otra pantalla)
  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const savedRole = await AsyncStorage.getItem('userRole');
          const savedName = await AsyncStorage.getItem('userName');
          if (savedRole) setRole(savedRole);
          if (savedName) setUserName(savedName);
        } catch (e) {
          console.error("Error cargando datos del usuario", e);
        }
      };
      loadUserData();
    }, [])
  );

  const isPremium = role === 'CLIENT_PREMIUM';

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Cabecera */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola de nuevo,</Text>
            <Text style={styles.appName}>{userName || 'FitHub Connect'}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* BADGE DE MEMBRESÍA */}
            <View style={[styles.premiumBadge, { borderColor: isPremium ? '#4CAF50' : '#333' }]}>
              <Text style={styles.badgeLabel}>PREMIUM</Text>
              <Text style={[styles.badgeStatus, { color: isPremium ? '#4CAF50' : '#FF5252' }]}>
                {isPremium ? 'SÍ' : 'No'}
              </Text>
            </View>

            <TouchableOpacity style={styles.avatar} onPress={() => { }}>
              <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : 'U'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner destacado */}
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

        {/* Secciones */}
        <Text style={styles.sectionTitle}>¿Qué quieres hacer?</Text>

        <View style={styles.cardGrid}>
          <ActionCard
            title="Monitores"
            desc="Busca y contrata entrenadores"
            icon="🏋️‍♂️"
            onPress={() => navigation.navigate('MonitorList')}
          />
          <ActionCard
            title="Mis rutinas"
            desc="Revisa tus entrenamientos"
            icon="📝"
            onPress={() => { }}
          />
          <ActionCard
            title="Disponibilidad"
            desc="Gestiona tus horarios"
            icon="⏰"
            onPress={() => { }}
          />
          <ActionCard
            title="Mi perfil"
            desc="Configuración y cuenta"
            icon="⚙️"
            onPress={() => { }}
          />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

function ActionCard({ title, desc, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  // ESTILOS DEL BADGE
  premiumBadge: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 7,
    color: '#aaa',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badgeStatus: {
    fontSize: 13,
    fontWeight: '900',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  banner: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    gap: 12,
  },
  card: {
    width: (width - 52) / 2,
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 10,
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
});