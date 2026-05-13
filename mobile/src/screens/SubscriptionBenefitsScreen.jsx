import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api';
import { useStripePlatform, StripeWrapper } from './StripeHelper';

// ─── Componente interno (necesita estar dentro del StripeWrapper) ───────────
function SubscriptionBenefitsContent({ navigation, monitorId, monitorName }) {
  const insets = useSafeAreaInsets();
  const [procesando, setProcesando] = useState(false);
  const [yaSuscrito, setYaSuscrito] = useState(false);
  const { initPaymentSheet, presentPaymentSheet, isWeb } = useStripePlatform();

  const confirmSubscription = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      await fetch(`${API_URL}/subscriptions/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({ monitorId }),
      });
      
      // Actualizar el rol localmente para que la app lo reconozca como PREMIUM
      await AsyncStorage.setItem('userRole', 'PREMIUM');
      setYaSuscrito(true);
    } catch (error) {
      console.error("Error al confirmar suscripción:", error);
    }
  };

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId || !monitorId) return;

        // VERIFICAR RETORNO DE STRIPE (WEB)
        if (isWeb && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const payStatus = params.get('payment');
          const mIdParam = params.get('monitorId');
          
          if (payStatus === 'success') {
            if (mIdParam && mIdParam === monitorId?.toString()) {
              console.log("Detectado pago exitoso de monitor en Web. Confirmando...");
              await confirmSubscription();
              Alert.alert(
                `Suscripcion activa con ${trainerName}`,
                `Ahora tienes clases ilimitadas con ${trainerName} durante 1 mes.`,
                [{ text: 'Genial', onPress: () => navigation.goBack() }]
              );
            }
            
            // Limpiar la URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const res = await fetch(`${API_URL}/subscriptions/check?userId=${userId}&monitorId=${monitorId}`);
        if (res.ok) {
          const data = await res.json();
          setYaSuscrito(data.isSubscribed);
        }
      } catch (e) {
        console.error("Error al comprobar suscripción:", e);
      }
    };
    checkStatus();
  }, [monitorId, isWeb]);

  const trainerName = monitorName || 'este entrenador';

  const handleSubscribe = async () => {
    setProcesando(true);
    try {
      const userId = await AsyncStorage.getItem('userId');

      if (isWeb) {
        const response = await fetch(`${API_URL}/create-subscription-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || '',
          },
          body: JSON.stringify({ 
            monitorId, 
            monitorName,
            webReturnUrl: window.location.origin
          }),
        });
        const data = await response.json();

        if (response.ok && data.url) {
          window.location.href = data.url;
        } else if (response.status === 409) {
          setYaSuscrito(true);
          Alert.alert('Aviso', 'Ya tienes una suscripción activa con este entrenador.');
        } else {
          Alert.alert('Error', data.error || 'No se pudo iniciar el proceso de pago');
        }

      } else {
        const response = await fetch(`${API_URL}/subscriptions/intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || '',
          },
          body: JSON.stringify({ monitorId }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el proceso de pago');

        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: 'FitHub Connect',
          appearance: {
            colors: {
              primary: '#FFD700',
              background: '#121212',
              componentBackground: '#1e1e1e',
              text: '#ffffff',
            },
            shapes: { borderRadius: 12 }
          }
        });

        if (initError) throw new Error(initError.message);

        const { error: paymentError } = await presentPaymentSheet();
        if (!paymentError) {
          await confirmSubscription();
          Alert.alert(
            `Suscripción activa con ${trainerName}`,
            `Ahora tienes acceso total a ${trainerName} durante 1 mes.`,
            [{ text: 'Genial', onPress: () => navigation.goBack() }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Error en la suscripción');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['#0a0500', '#0a0a0a']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {!monitorId ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <LinearGradient colors={['#FFD700', '#B8860B']} style={styles.iconCircle}>
                <MaterialCommunityIcons name="account-search" size={40} color="#000" />
              </LinearGradient>
              <Text style={styles.title}>Busca a tu Entrenador</Text>
              <Text style={styles.subtitle}>
                Para disfrutar de ventajas premium, suscríbete directamente al perfil de tu entrenador favorito.
              </Text>
              
              <TouchableOpacity 
                onPress={() => navigation.replace('MonitorList')}
                style={styles.browseTrainersBtn}
              >
                <Text style={styles.browseTrainersText}>Explorar Entrenadores</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // --- PANTALLA DE PAGO PARA UN ENTRENADOR ESPECÍFICO ---
            <>
              {/* Cabecera */}
              <View style={styles.header}>
                <LinearGradient colors={['#FFD700', '#B8860B']} style={styles.iconCircle}>
                  <MaterialCommunityIcons name="crown" size={40} color="#000" />
                </LinearGradient>
                <Text style={styles.title}>Suscripción a {trainerName}</Text>
                <Text style={styles.subtitle}>
                  Acceso ilimitado a todas las clases y contenido exclusivo de {trainerName}
                </Text>
              </View>

              {/* Beneficios */}
          <View style={styles.benefitsList}>
            <BenefitItem
              icon="infinity"
              title="Clases Ilimitadas"
              desc={`Reserva todas las sesiones con ${trainerName} sin costes adicionales durante 1 mes.`}
            />
            <BenefitItem
              icon="video"
              title="Vídeos Exclusivos"
              desc={`Acceso a todo el contenido premium subido por ${trainerName}.`}
            />
            <BenefitItem
              icon="dumbbell"
              title="Rutinas Premium"
              desc={`Desbloquea las rutinas personalizadas creadas por ${trainerName}.`}
            />
            <BenefitItem
              icon="cash-off"
              title="Sin coste por sesión"
              desc="Olvídate de pagar por cada clase. Tu suscripción lo cubre todo."
            />
          </View>

          {/* Precio y botón */}
          <View style={styles.footer}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>29.99€</Text>
              <Text style={styles.pricePeriod}>/mes</Text>
            </View>

            <Text style={styles.priceNote}>
              Suscripción mensual — se renueva automáticamente
            </Text>

            <TouchableOpacity
              style={[styles.subscribeBtn, (procesando || yaSuscrito) && { opacity: 0.6 }]}
              onPress={handleSubscribe}
              disabled={procesando || yaSuscrito}
            >
              <LinearGradient
                colors={yaSuscrito ? ['#4CAF50', '#2E7D32'] : ['#FFD700', '#B8860B']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {procesando ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <MaterialCommunityIcons name={yaSuscrito ? "check-circle" : "crown"} size={20} color={yaSuscrito ? "#fff" : "#000"} style={{ marginRight: 8 }} />
                    <Text style={[styles.subscribeText, yaSuscrito && { color: '#fff' }]}>
                      {yaSuscrito ? 'Suscripción Activa' : 'Suscribirme ahora'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.cancelText}>Cancela en cualquier momento desde tu perfil.</Text>
          </View>
          </>
        )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// ─── Wrapper público ─────────────────────────────────────────────────────────
export default function SubscriptionBenefitsScreen({ navigation, route }) {
  const monitorId   = route?.params?.monitorId   ?? null;
  const monitorName = route?.params?.monitorName ?? null;

  return (
    <StripeWrapper>
      <SubscriptionBenefitsContent
        navigation={navigation}
        monitorId={monitorId}
        monitorName={monitorName}
      />
    </StripeWrapper>
  );
}

// ─── Sub-componente beneficio ─────────────────────────────────────────────────
function BenefitItem({ icon, title, desc }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIconBox}>
        <MaterialCommunityIcons name={icon} size={22} color="#FFD700" />
      </View>
      <View style={styles.benefitText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },

  closeBtn: { alignSelf: 'flex-end', marginBottom: 20 },

  header: { alignItems: 'center', marginBottom: 36 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },

  benefitsList: { marginBottom: 36 },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,215,0,0.04)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.08)',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#777',
    lineHeight: 18,
  },

  footer: { alignItems: 'center' },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  priceValue: { fontSize: 40, fontWeight: 'bold', color: '#FFD700' },
  pricePeriod: { fontSize: 16, color: '#888', marginLeft: 4 },
  priceNote: {
    fontSize: 11,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  subscribeBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  btnGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeText: {
    color: '#000',
    fontSize: 17,
    fontWeight: 'bold',
  },
  cancelText: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
  },
  browseTrainersBtn: {
    marginTop: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  browseTrainersText: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 15,
  },
});
