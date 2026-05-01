import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripePlatform, StripeWrapper } from './StripeHelper';
import { getMonitorDetail, API_URL } from '../api';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const DIES_SEMANA_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const NOMBRES_DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getNext14Days = () => {
  const days = [];
  const start = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      dateString: d.toISOString().split('T')[0], // YYYY-MM-DD
      dayOfWeekEn: DIES_SEMANA_EN[d.getDay()],
      shortDayEs: NOMBRES_DIAS_ES[d.getDay()],
      dayNum: d.getDate()
    });
  }
  return days;
};

export default function MonitorDetailScreen({ route, navigation }) {
  const { monitor: initialMonitor } = route.params;
  const [monitorDetail, setMonitorDetail] = useState(initialMonitor);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [fechas] = useState(getNext14Days());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechas[0]);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);

  const [cargandoPago, setCargandoPago] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [precioPagado, setPrecioPagado] = useState(0);

  // Comprobamos si el usuario tiene suscripción activa con este entrenador
  useFocusEffect(
    React.useCallback(() => {
      const checkSubscription = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) return;
          const res = await fetch(
            `${API_URL}/subscriptions/check?userId=${userId}&monitorId=${initialMonitor.id}`
          );
          const data = await res.json();
          setIsSubscribed(data.isSubscribed === true);
        } catch (e) {
          // Si falla la comprobación, asumimos no suscrito
        } finally {
          setCargandoSuscripcion(false);
        }
      };
      checkSubscription();
    }, [initialMonitor.id])
  );

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const detail = await getMonitorDetail(initialMonitor.id);
        setMonitorDetail(detail);
        setDisponibilidad(detail.availability || []);
        setOccupiedSlots(detail.occupiedSlots || []);
      } catch (e) {
        // Error cargando detalle
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchDetail();
  }, [initialMonitor.id]);

  // Al cambiar la fecha, limpiamos el slot seleccionado
  useEffect(() => {
    setSlotSeleccionado(null);
  }, [fechaSeleccionada]);

  // Filtramos los slots disponibles para el día elegido
  const slotsDelDia = disponibilidad.filter(
    s => s.dayOfWeek === fechaSeleccionada.dayOfWeekEn && s.isAvailable
  );

  // --- USAMOS EL HELPER EN LUGAR DEL HOOK DIRECTO ---
  const { initPaymentSheet, presentPaymentSheet, isWeb } = useStripePlatform();

  const handleContratar = async () => {
    if (!slotSeleccionado) {
        Alert.alert('Selecciona un horario', 'Elige una franja horaria antes de continuar.');
        return;
    }

    setCargandoPago(true);

    try {
      const userId = await AsyncStorage.getItem('userId');
      const finalApiUrl = API_URL;

      if (isWeb) {
        // ___ LÓGICA WEB ___

        // 1. Llamada al backend para crear la sesión de Stripe Checkout
        const response = await fetch(`${finalApiUrl}/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            monitorId: monitorDetail.id,
            monitorName: monitorDetail.name,
            price: monitorDetail.hourlyRate,
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime.substring(0,5),
            endTime: slotSeleccionado.endTime.substring(0,5),
          }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error al crear sesión de pago');

        // 2. Redirigir a la URL de Stripe si existe, si no, éxito directo (Premium)
        if (data.url) {
          window.location.href = data.url;
        } else {
          // Éxito Premium en Web -> BLOQUEO INSTANTÁNEO
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime
          }]);
          setShowSuccess(true);
        }

      } else {
        // ___ LÓGICA TELEFONO ANDR - IOS ___

        // 2. Crear reserva y obtener clientSecret
        const response = await fetch(`${finalApiUrl}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            monitorId: monitorDetail.id,
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime.substring(0,5),
            endTime: slotSeleccionado.endTime.substring(0,5),
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear la reserva');

        // SI TIENE SUSCRIPCIÓN a este entrenador, reserva gratuita directa
        if (!data.clientSecret || isSubscribed) {
          setPrecioPagado(0);
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime
          }]);
          setShowSuccess(true);
          return;
        }

        // 3. Inicializar pasarela nativa
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: 'FitHub Connect',
          appearance: {
            colors: {
              primary: '#4CAF50',
              background: '#121212',
              componentBackground: '#1e1e1e',
              text: '#ffffff',
            },
            shapes: { borderRadius: 12 }
          }
        });

        if (initError) throw new Error(initError.message);

        // 4. Mostrar pasarela nativa
        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          if (paymentError.code !== 'Canceled') {
            Alert.alert('Error en el pago', paymentError.message);
          }
        } else {
          // ÉXITO TRAS PAGO -> BLOQUEAR SLOT EN LA UI
          // NOTA: El webhook de Stripe confirma la reserva en el backend automáticamente.
          // Pagar una clase NO cambia el rol del usuario a PREMIUM.
          setPrecioPagado(monitorDetail.hourlyRate);
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime
          }]);
          setShowSuccess(true);
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo conectar con el servidor.');
    } finally {
      setCargandoPago(false);
    }
  };

  return (
    <StripeWrapper>
      <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Perfil del monitor */}
        <View style={styles.profileCard}>
          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{monitorDetail.name.charAt(0)}</Text>
          </LinearGradient>
          <Text style={styles.name}>{monitorDetail.name}</Text>
          <Text style={styles.specialty}>{monitorDetail.specialty}</Text>
          {monitorDetail.bio && <Text style={styles.bioText}>{monitorDetail.bio}</Text>}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.statValue}>{monitorDetail.rating || 'N/A'}</Text>
              <Text style={styles.statLabel}>Valoración</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <MaterialCommunityIcons name="calendar-check" size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{monitorDetail.sessions || 0}</Text>
              <Text style={styles.statLabel}>Sesiones</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <MaterialCommunityIcons name="cash" size={18} color="#4CAF50" />
              <Text style={styles.statValue}>{monitorDetail.hourlyRate}€</Text>
              <Text style={styles.statLabel}>Por hora</Text>
            </View>
          </View>
        </View>

        {/* Banner de suscripción movido a la sección de reservas */}

        <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>
        <Text style={styles.sectionHint}>Selecciona el día y la franja horaria que prefieras</Text>

        {cargandoDatos ? (
          <ActivityIndicator color="#4CAF50" style={{ marginVertical: 30 }} />
        ) : (
          <>
            {/* Lista horizontal de Días (14 días próximos) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
              {fechas.map((fecha, i) => (
                <TouchableOpacity
                  key={fecha.dateString}
                  style={[
                    styles.dateBox,
                    fechaSeleccionada.dateString === fecha.dateString && styles.dateBoxSelected
                  ]}
                  onPress={() => setFechaSeleccionada(fecha)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dateDayName,
                    fechaSeleccionada.dateString === fecha.dateString && styles.dateDayNameSelected
                  ]}>
                    {fecha.shortDayEs}
                  </Text>
                  <Text style={[
                    styles.dateDayNum,
                    fechaSeleccionada.dateString === fecha.dateString && styles.dateDayNumSelected
                  ]}>
                    {fecha.dayNum}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tarjetas de horario para el día seleccionado */}
            {slotsDelDia.length > 0 ? (
              slotsDelDia.map((slot) => {
                const isOccupied = occupiedSlots.some(
                  os => os.date === fechaSeleccionada.dateString && 
                  os.startTime.substring(0,5) === slot.startTime.substring(0,5)
                );
                
                const isSelected = slotSeleccionado?.id === slot.id;

                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      slotSeleccionado?.id === slot.id && styles.slotCardSelected,
                      isOccupied && styles.slotCardOccupied
                    ]}
                    onPress={() => !isOccupied && setSlotSeleccionado(slot)}
                    activeOpacity={isOccupied ? 1 : 0.8}
                    disabled={isOccupied}
                  >
                    <View>
                      <Text style={[styles.slotDay, isOccupied && { color: '#666' }]}>
                        {fechaSeleccionada.shortDayEs} {fechaSeleccionada.dayNum}
                      </Text>
                      <Text style={styles.slotTime}>
                        {slot.startTime.substring(0,5)} – {slot.endTime.substring(0,5)}
                      </Text>
                    </View>
                    <View style={[
                      styles.slotBadge,
                      slotSeleccionado?.id === slot.id && styles.slotBadgeSelected,
                      isOccupied && styles.slotBadgeOccupied
                    ]}>
                      <Text style={[
                        styles.slotBadgeText,
                        slotSeleccionado?.id === slot.id && styles.slotBadgeTextSelected,
                        isOccupied && styles.slotBadgeTextOccupied
                      ]}>
                        {isOccupied ? 'Ocupado' : (slotSeleccionado?.id === slot.id ? 'Seleccionado' : 'Disponible')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noSlotsText}>No hay disponibilidad para este día.</Text>
            )}

            {(() => {
              const selectedOccupied = slotSeleccionado && occupiedSlots.some(
                os => os.date === fechaSeleccionada.dateString && 
                os.startTime.substring(0,5) === slotSeleccionado.startTime.substring(0,5)
              );
              const isDisabled = cargandoPago || !slotSeleccionado || selectedOccupied;

              return (
                <View>
                  {!isSubscribed && !cargandoSuscripcion && (
                    <TouchableOpacity
                      style={[styles.subscribeBtn, { marginBottom: 16 }]}
                      onPress={() => navigation.navigate('SubscriptionBenefits', {
                        monitorId: monitorDetail.id,
                        monitorName: monitorDetail.name,
                      })}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#FFD700', '#B8860B']}
                        style={styles.subscribeBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <MaterialCommunityIcons name="crown" size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.subscribeBtnText}>Suscribirme a {monitorDetail.name} — 29.99€/mes</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.ctaWrapper, isDisabled && { opacity: 0.5 }]}
                    onPress={handleContratar}
                    activeOpacity={0.85}
                    disabled={isDisabled}
                  >
                  <LinearGradient
                    colors={isDisabled ? ['#555', '#333'] : ['#4CAF50', '#2E7D32']}
                    style={styles.ctaButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {cargandoPago ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaText}>
                        {selectedOccupied
                          ? 'Horario Ocupado'
                          : slotSeleccionado
                            ? isSubscribed
                              ? 'Confirmar Reserva — Incluida en tu suscripción'
                              : `Pagar Reserva – ${monitorDetail.hourlyRate}€`
                            : 'Selecciona un horario'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                </View>
              );
            })()}
          </>
        )}

        {/* Modal de Éxito Reserva */}
        <SuccessModal 
          visible={showSuccess} 
          onClose={() => {
            setShowSuccess(false);
            navigation.navigate('Home');
          }}
          monitorName={monitorDetail.name}
          time={`${slotSeleccionado?.startTime.substring(0,5)} – ${slotSeleccionado?.endTime.substring(0,5)}`}
          date={fechaSeleccionada.dateString}
          precio={precioPagado}
        />

      </ScrollView>
      </LinearGradient>
    </StripeWrapper>
  );
}

function SuccessModal({ visible, onClose, monitorName, time, date, precio }) {
  const esPremium = precio === 0;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#1e1e1e', '#121212']}
          style={styles.successCard}
        >
          <View style={styles.checkCircle}>
            <MaterialCommunityIcons name="check" size={50} color="#fff" />
          </View>
          
          <Text style={styles.successTitle}>¡Reserva Confirmada!</Text>
          <Text style={styles.successSub}>Tu sesión ha sido agendada con éxito.</Text>

          <View style={styles.detailsBox}>
            <DetailItem icon="account" label="Monitor" value={monitorName} />
            <DetailItem icon="calendar" label="Fecha" value={date} />
            <DetailItem icon="clock-outline" label="Hora" value={time} />
            <DetailItem 
              icon="cash-check" 
              label="Precio" 
              value={esPremium ? '0.00€ (incluido en tu suscripción)' : `${precio}€`} 
              isFree={esPremium} 
            />
          </View>

          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              style={styles.closeModalGradient}
            >
              <Text style={styles.closeModalText}>Ir al Inicio</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function DetailItem({ icon, label, value, isFree }) {
  return (
    <View style={styles.detailItem}>
      <MaterialCommunityIcons name={icon} size={20} color="#4CAF50" />
      <View style={{ marginLeft: 12 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isFree && { color: '#4CAF50' }]}>{value}</Text>
      </View>
    </View>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  bioText: { fontSize: 13, color: '#aaa', marginTop: 10, textAlign: 'center', marginHorizontal: 20, marginBottom: 15 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#666' },
  divider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#666', marginBottom: 16 },

  // Suscripción por entrenador
  subscribedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#5a4500',
    gap: 10,
  },
  subscribedText: {
    flex: 1,
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  subscribeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  subscribeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subscribeBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  
  datesRow: { flexDirection: 'row', marginBottom: 20 },
  dateBox: {
    width: 60,
    height: 75,
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dateBoxSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  dateDayName: { fontSize: 13, color: '#888', marginBottom: 4 },
  dateDayNameSelected: { color: '#e0f2f1' },
  dateDayNum: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  dateDayNumSelected: { color: '#fff' },
  noSlotsText: { color: '#888', textAlign: 'center', marginVertical: 20 },

  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  slotCardSelected: { borderColor: '#4CAF50', backgroundColor: '#1a2a1a' },
  slotDay: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  slotTime: { fontSize: 13, color: '#888' },
  slotBadge: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#2a2a2a', borderRadius: 10 },
  slotBadgeSelected: { backgroundColor: '#4CAF50' },
  slotBadgeText: { fontSize: 12, color: '#888', fontWeight: '500' },
  slotBadgeTextSelected: { color: '#fff', fontWeight: '700' },
  ctaWrapper: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  ctaButton: { paddingVertical: 18, alignItems: 'center', minHeight: 60 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  slotCardOccupied: {
    borderColor: '#333',
    backgroundColor: '#161616',
    opacity: 0.6,
  },
  slotBadgeOccupied: {
    backgroundColor: '#333',
  },
  slotBadgeTextOccupied: {
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#222',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  closeModalBtn: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  closeModalGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});