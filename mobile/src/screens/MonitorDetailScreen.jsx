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
import AppLayout, { theme } from './AppLayout';

const DIES_SEMANA_EN = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const NOMBRES_DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getNext14Days = () => {
  const days = [];
  const start = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      dateString: d.toISOString().split('T')[0],
      dayOfWeekEn: DIES_SEMANA_EN[d.getDay()],
      shortDayEs: NOMBRES_DIAS_ES[d.getDay()],
      dayNum: d.getDate()
    });
  }
  return days;
};

export default function MonitorDetailScreen({ route, navigation }) {
  const { monitor: initialMonitor } = route.params;
  const safeInitial = { name: '', specialty: '', hourlyRate: 0, ...initialMonitor };
  const [monitorDetail, setMonitorDetail] = useState(safeInitial);
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
          console.error("Error check subscription", e);
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
        console.error("Error fetching detail", e);
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchDetail();
  }, [initialMonitor.id]);

  useEffect(() => {
    setSlotSeleccionado(null);
  }, [fechaSeleccionada]);

  const slotsDelDia = disponibilidad.filter(
    s => s.dayOfWeek === fechaSeleccionada.dayOfWeekEn && s.isAvailable
  );

  const { initPaymentSheet, presentPaymentSheet, isWeb } = useStripePlatform();

  const handleContratar = async () => {
    if (!slotSeleccionado) {
        Alert.alert('Selecciona un horario', 'Elige una franja horaria antes de continuar.');
        return;
    }
    setCargandoPago(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (isWeb) {
        const response = await fetch(`${API_URL}/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({
            monitorId: monitorDetail.id,
            monitorName: monitorDetail.name,
            price: monitorDetail.hourlyRate,
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime.substring(0,5),
            endTime: slotSeleccionado.endTime.substring(0,5),
            webReturnUrl: window.location.origin,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear sesión de pago');
        if (data.url) {
          window.location.href = data.url;
        } else {
          setOccupiedSlots(prev => [...prev, { date: fechaSeleccionada.dateString, startTime: slotSeleccionado.startTime }]);
          setShowSuccess(true);
        }
      } else {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({
            monitorId: monitorDetail.id,
            date: fechaSeleccionada.dateString,
            startTime: slotSeleccionado.startTime.substring(0,5),
            endTime: slotSeleccionado.endTime.substring(0,5),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear la reserva');
        if (!data.clientSecret || isSubscribed) {
          setPrecioPagado(0);
          setOccupiedSlots(prev => [...prev, { date: fechaSeleccionada.dateString, startTime: slotSeleccionado.startTime }]);
          setShowSuccess(true);
          return;
        }
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: 'FitHub Connect',
          appearance: {
            colors: { primary: theme.brand, background: theme.bgPrimary, componentBackground: theme.bgSecondarySoft, text: '#ffffff' },
            shapes: { borderRadius: 12 }
          }
        });
        if (initError) throw new Error(initError.message);
        const { error: paymentError } = await presentPaymentSheet();
        if (paymentError) {
          if (paymentError.code !== 'Canceled') Alert.alert('Error en el pago', paymentError.message);
        } else {
          setPrecioPagado(monitorDetail.hourlyRate);
          setOccupiedSlots(prev => [...prev, { date: fechaSeleccionada.dateString, startTime: slotSeleccionado.startTime }]);
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
      <AppLayout title="Detalle Monitor" navigation={navigation} showBackButton={true}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Card Principal Monitor */}
          <View style={styles.profileCard}>
            <LinearGradient colors={[theme.brand, '#15803d']} style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{(monitorDetail.name || 'M').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
            <Text style={styles.name}>{monitorDetail.name}</Text>
            <View style={styles.specialtyBadge}>
               <Text style={styles.specialtyText}>{monitorDetail.specialty}</Text>
            </View>
            {monitorDetail.bio && <Text style={styles.bioText} numberOfLines={3}>{monitorDetail.bio}</Text>}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.statValue}>{monitorDetail.rating || '4.9'}</Text>
                <Text style={styles.statLabel}>Valoración</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={theme.brand} />
                <Text style={styles.statValue}>{monitorDetail.sessions || 120}+</Text>
                <Text style={styles.statLabel}>Sesiones</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="currency-eur" size={16} color={theme.brand} />
                <Text style={styles.statValue}>{monitorDetail.hourlyRate}€</Text>
                <Text style={styles.statLabel}>Por hora</Text>
              </View>
            </View>
          </View>

          {/* Disponibilidad */}
          <Text style={styles.sectionTitle}>Reserva tu Sesión</Text>
          <Text style={styles.sectionHint}>Selecciona un día y una franja horaria disponible</Text>

          {cargandoDatos ? (
            <ActivityIndicator color={theme.brand} style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Calendario horizontal */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
                {fechas.map((fecha) => (
                  <TouchableOpacity
                    key={fecha.dateString}
                    style={[
                      styles.dateBox,
                      fechaSeleccionada.dateString === fecha.dateString && styles.dateBoxSelected
                    ]}
                    onPress={() => setFechaSeleccionada(fecha)}
                  >
                    <Text style={[styles.dateDayName, fechaSeleccionada.dateString === fecha.dateString && {color: '#fff'}]}>
                      {fecha.shortDayEs}
                    </Text>
                    <Text style={[styles.dateDayNum, fechaSeleccionada.dateString === fecha.dateString && {color: '#fff'}]}>
                      {fecha.dayNum}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Franjas Horarias */}
              <View style={styles.slotsContainer}>
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
                          isSelected && styles.slotCardSelected,
                          isOccupied && styles.slotCardOccupied
                        ]}
                        onPress={() => !isOccupied && setSlotSeleccionado(slot)}
                        disabled={isOccupied}
                      >
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                          <View style={[styles.slotIconWrap, isSelected && {backgroundColor: theme.brand}]}>
                            <MaterialCommunityIcons name="clock-outline" size={18} color={isSelected ? '#fff' : (isOccupied ? '#444' : theme.brand)} />
                          </View>
                          <Text style={[styles.slotTimeText, isOccupied && {color: '#444'}]}>
                            {slot.startTime.substring(0,5)} – {slot.endTime.substring(0,5)}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, isOccupied && styles.statusBadgeOccupied, isSelected && {backgroundColor: '#fff'}]}>
                           <Text style={[styles.statusBadgeText, isOccupied && {color: '#666'}, isSelected && {color: theme.brand, fontWeight: '800'}]}>
                             {isOccupied ? 'Ocupado' : (isSelected ? 'Elegido' : 'Libre')}
                           </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptySlots}>
                    <MaterialCommunityIcons name="calendar-remove" size={40} color={theme.borderDefault} />
                    <Text style={styles.emptySlotsText}>No hay horarios para este día</Text>
                  </View>
                )}
              </View>

              {/* Botones Acción */}
              <View style={styles.footerActions}>
                {!isSubscribed && !cargandoSuscripcion && (
                  <TouchableOpacity
                    style={styles.subscribeBtn}
                    onPress={() => navigation.navigate('SubscriptionBenefits', {
                      monitorId: monitorDetail.id,
                      monitorName: monitorDetail.name,
                    })}
                  >
                    <LinearGradient colors={['#FFD700', '#B8860B']} style={styles.subscribeGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                      <MaterialCommunityIcons name="crown" size={18} color="#000" style={{marginRight: 8}} />
                      <Text style={styles.subscribeText}>Suscripción Premium {monitorDetail.name}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.mainCta, (cargandoPago || !slotSeleccionado) && {opacity: 0.6}]}
                  onPress={handleContratar}
                  disabled={cargandoPago || !slotSeleccionado}
                >
                  <LinearGradient
                    colors={[theme.brand, '#15803d']}
                    style={styles.mainCtaGradient}
                    start={{x:0, y:0}} end={{x:1, y:0}}
                  >
                    {cargandoPago ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.mainCtaText}>
                        {slotSeleccionado
                          ? (isSubscribed ? 'Confirmar Reserva (Incluida)' : `Pagar Reserva – ${monitorDetail.hourlyRate}€`)
                          : 'Selecciona un horario'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          <SuccessModal 
            visible={showSuccess} 
            onClose={() => { setShowSuccess(false); navigation.navigate('Home'); }}
            monitorName={monitorDetail.name}
            time={`${slotSeleccionado?.startTime.substring(0,5)} – ${slotSeleccionado?.endTime.substring(0,5)}`}
            date={fechaSeleccionada.dateString}
            precio={precioPagado}
          />
        </ScrollView>
      </AppLayout>
    </StripeWrapper>
  );
}

function SuccessModal({ visible, onClose, monitorName, time, date, precio }) {
  const esGratis = precio === 0;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.successCard}>
          <View style={styles.checkCircle}>
            <MaterialCommunityIcons name="check" size={50} color="#fff" />
          </View>
          <Text style={styles.successTitle}>¡Reserva Confirmada!</Text>
          <Text style={styles.successSub}>Tu sesión ha sido agendada correctamente.</Text>
          <View style={styles.detailsBox}>
            <View style={styles.detailItem}><Ionicons name="person-outline" size={18} color={theme.brand} /><Text style={styles.detailValue}>{monitorName}</Text></View>
            <View style={styles.detailItem}><Ionicons name="calendar-outline" size={18} color={theme.brand} /><Text style={styles.detailValue}>{date}</Text></View>
            <View style={styles.detailItem}><Ionicons name="time-outline" size={18} color={theme.brand} /><Text style={styles.detailValue}>{time}</Text></View>
            <View style={styles.detailItem}><Ionicons name="card-outline" size={18} color={theme.brand} /><Text style={styles.detailValue}>{esGratis ? 'Incluido en suscripción' : `${precio}€`}</Text></View>
          </View>
          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
            <LinearGradient colors={[theme.brand, '#15803d']} style={styles.closeModalGradient}>
              <Text style={styles.closeModalText}>Volver al Inicio</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 28,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  avatarLarge: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  specialtyBadge: { backgroundColor: theme.brandSofter, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  specialtyText: { color: theme.brand, fontSize: 13, fontWeight: '700' },
  bioText: { color: theme.textBody, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: theme.borderDefault, paddingTop: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: theme.textBody, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  statDivider: { width: 1, height: 30, backgroundColor: theme.borderDefault },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  sectionHint: { fontSize: 13, color: theme.textBody, marginBottom: 20 },

  datesRow: { flexDirection: 'row', marginBottom: 24 },
  dateBox: {
    width: 65, height: 80,
    backgroundColor: theme.bgSecondarySoft, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, borderWidth: 1, borderColor: theme.borderDefault,
  },
  dateBoxSelected: { backgroundColor: theme.brand, borderColor: theme.brand },
  dateDayName: { fontSize: 12, color: theme.textBody, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  dateDayNum: { fontSize: 20, fontWeight: '800', color: '#fff' },

  slotsContainer: { gap: 12, marginBottom: 24 },
  slotCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: theme.borderDefault,
  },
  slotCardSelected: { borderColor: theme.brand, backgroundColor: theme.brandSofter },
  slotCardOccupied: { opacity: 0.5, backgroundColor: theme.bgPrimary },
  slotIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  slotTimeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeOccupied: { backgroundColor: 'rgba(255,0,0,0.1)' },
  statusBadgeText: { color: theme.textBody, fontSize: 12, fontWeight: '700' },

  footerActions: { gap: 12 },
  subscribeBtn: { borderRadius: 16, overflow: 'hidden' },
  subscribeGradient: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  subscribeText: { color: '#000', fontSize: 14, fontWeight: '800' },
  mainCta: { borderRadius: 16, overflow: 'hidden', elevation: 4 },
  mainCtaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  mainCtaText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  emptySlots: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptySlotsText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successCard: { width: '100%', maxWidth: 400, backgroundColor: theme.bgSecondarySoft, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.borderDefault },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.brand, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  successSub: { fontSize: 14, color: theme.textBody, textAlign: 'center', marginBottom: 24 },
  detailsBox: { width: '100%', backgroundColor: theme.bgPrimary, borderRadius: 20, padding: 20, marginBottom: 24, gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeModalBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  closeModalGradient: { paddingVertical: 16, alignItems: 'center' },
  closeModalText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});