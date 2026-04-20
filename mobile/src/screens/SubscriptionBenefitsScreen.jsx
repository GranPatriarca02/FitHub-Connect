import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';

export default function SubscriptionBenefitsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [procesando, setProcesando] = useState(false);

  const handleSubscribe = async () => {
    setProcesando(true);
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
        Alert.alert("Error", data.error || "No se pudo iniciar el proceso de pago");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['#000', '#0a0a0a']} style={styles.gradient}>
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <LinearGradient
              colors={['#FFD700', '#B8860B']}
              style={styles.iconCircle}
            >
              <MaterialCommunityIcons name="crown" size={40} color="#000" />
            </LinearGradient>
            <Text style={styles.title}>Pase Ilimitado</Text>
            <Text style={styles.subtitle}>Desbloquea todo el potencial de FitHub Connect</Text>
          </View>

          <View style={styles.benefitsList}>
            <BenefitItem 
              icon="infinite" 
              title="Clases Ilimitadas" 
              desc="Reserva todas las sesiones que quieras sin costes adicionales." 
            />
            <BenefitItem 
              icon="star" 
              title="Contenido Exclusivo" 
              desc="Acceso a rutinas y videos premium de nuestros mejores monitores." 
            />
            <BenefitItem 
              icon="flash" 
              title="Soporte Prioritario" 
              desc="Atención al cliente en menos de 2 horas para cualquier duda." 
            />
            <BenefitItem 
              icon="person-add" 
              title="Monitor Personal" 
              desc="Descuentos del 50% en sesiones personalizadas 1 a 1." 
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>29.99€</Text>
              <Text style={styles.pricePeriod}>/mes</Text>
            </View>
            <TouchableOpacity 
              style={styles.subscribeBtn} 
              onPress={handleSubscribe}
              disabled={procesando}
            >
              <LinearGradient
                colors={['#FFD700', '#B8860B']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {procesando ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.subscribeText}>Suscribirse ahora</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.cancelText}>Cancela en cualquier momento desde tu perfil.</Text>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function BenefitItem({ icon, title, desc }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconBox}>
        <Ionicons name={icon} size={22} color="#FFD700" />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  benefitsList: {
    marginBottom: 40,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255, 0.03)',
    padding: 16,
    borderRadius: 16,
  },
  benefitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitText: { flex: 1 },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  pricePeriod: {
    fontSize: 16,
    color: '#888',
    marginLeft: 4,
  },
  subscribeBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  btnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  subscribeText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelText: {
    fontSize: 12,
    color: '#555',
  },
});
