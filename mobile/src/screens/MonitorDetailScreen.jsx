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

// Duraciones permitidas para una reserva (en minutos), en bloques de 30 min.
const DURACIONES = [
  { min: 60,  label: '1h',     mult: 1.0 },
  { min: 90,  label: '1h 30m', mult: 1.5 },
  { min: 120, label: '2h',     mult: 2.0 },
  { min: 150, label: '2h 30m', mult: 2.5 },
  { min: 180, label: '3h',     mult: 3.0 },
];

const aMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const deMin = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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
  // Franja completa del entrenador que el usuario está mirando
  const [franjaSeleccionada, setFranjaSeleccionada] = useState(null);
  // Configuración de la reserva DENTRO de la franja
  const [reserveStart, setReserveStart] = useState(null);   // "HH:MM"
  const [reserveMinutes, setReserveMinutes] = useState(60); // 60..180 en saltos de 30
  const [configVisible, setConfigVisible] = useState(false);

  const [cargandoPago, setCargandoPago] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [cargandoSuscripcion, setCargandoSuscripcion] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [precioPagado, setPrecioPagado] = useState(0);
  const [userRole, setUserRole] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      const checkSubscription = async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) return;
          const res = await fetch(
            `${API_URL}/subscriptions/check?userId=${userId}&monitorId=${initialMonitor.id}`
          );
          if (res.ok) {
            const data = await res.json();
            setIsSubscribed(data.isSubscribed === true);
            if (data.userRole) setUserRole(data.userRole);
          }
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
    setFranjaSeleccionada(null);
    setReserveStart(null);
    setReserveMinutes(60);
  }, [fechaSeleccionada]);

  const slotsDelDia = disponibilidad.filter(
    s => s.dayOfWeek === fechaSeleccionada.dayOfWeekEn && s.isAvailable
  );

  // Reservas ya activas del día seleccionado (intervalo completo)
  const reservasDelDia = occupiedSlots
    .filter(os => os.date === fechaSeleccionada.dateString)
    .map(os => ({
      start: aMin(os.startTime.substring(0, 5)),
      end: aMin((os.endTime || os.startTime).substring(0, 5)),
    }));

  const overlapConReserva = (startMin, endMin) =>
    reservasDelDia.some(r => startMin < r.end && endMin > r.start);

  // Duraciones que caben en la franja seleccionada (sin solapar reservas existentes)
  const duracionesValidas = (() => {
    if (!franjaSeleccionada) return [];
    const fStart = aMin(franjaSeleccionada.startTime.substring(0, 5));
    const fEnd   = aMin(franjaSeleccionada.endTime.substring(0, 5));
    return DURACIONES.filter(d => fEnd - fStart >= d.min);
  })();

  // Horas de inicio posibles dentro de la franja para la duración elegida
  const inicioOpciones = (() => {
    if (!franjaSeleccionada) return [];
    const fStart = aMin(franjaSeleccionada.startTime.substring(0, 5));
    const fEnd   = aMin(franjaSeleccionada.endTime.substring(0, 5));
    const out = [];
    for (let t = fStart; t + reserveMinutes <= fEnd; t += 30) {
      const libre = !overlapConReserva(t, t + reserveMinutes);
      out.push({ minutes: t, label: deMin(t), libre });
    }
    return out;
  })();

  const reserveEnd = reserveStart ? deMin(aMin(reserveStart) + reserveMinutes) : null;
  const horasReserva = reserveMinutes / 60;
  const precioReserva = (monitorDetail.hourlyRate || 0) * horasReserva;

  // Abrir el modal con valores por defecto que encajen
  const abrirConfiguracion = (franja) => {
    setFranjaSeleccionada(franja);
    const fStart = aMin(franja.startTime.substring(0, 5));
    const fEnd   = aMin(franja.endTime.substring(0, 5));
    const ancho = fEnd - fStart;
    const minDur = Math.min(60, Math.floor(ancho / 30) * 30);
    setReserveMinutes(minDur >= 60 ? 60 : 60); // siempre 60 mínimo; si no cabe el modal mostrará aviso
    // Primer hueco libre
    let chosen = null;
    for (let t = fStart; t + 60 <= fEnd; t += 30) {
      if (!overlapConReserva(t, t + 60)) { chosen = t; break; }
    }
    setReserveStart(chosen != null ? deMin(chosen) : deMin(fStart));
    setConfigVisible(true);
  };

  const { initPaymentSheet, presentPaymentSheet, isWeb } = useStripePlatform();

  const handleContratar = async () => {
    if (!franjaSeleccionada || !reserveStart) {
      Alert.alert('Selecciona un horario', 'Configura una franja horaria antes de continuar.');
      return;
    }
    // Validaciones cliente (el backend revalida)
    if (reserveMinutes < 60 || reserveMinutes > 180) {
      Alert.alert('Duración inválida', 'La reserva debe ser de entre 1 y 3 horas.');
      return;
    }
    const startMin = aMin(reserveStart);
    const endMin = startMin + reserveMinutes;
    if (overlapConReserva(startMin, endMin)) {
      Alert.alert('Horario ocupado', 'Este tramo se solapa con otra reserva. Elige otra hora.');
      return;
    }

    const startTime = reserveStart;
    const endTime = deMin(endMin);

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
            date: fechaSeleccionada.dateString,
            startTime,
            endTime,
            webReturnUrl: window.location.origin,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear sesión de pago');
        if (data.url) {
          window.location.href = data.url;
        } else {
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: `${startTime}:00`,
            endTime: `${endTime}:00`,
          }]);
          setConfigVisible(false);
          setTimeout(() => {
            setShowSuccess(true);
          }, 400);
        }
      } else {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
          body: JSON.stringify({
            monitorId: monitorDetail.id,
            date: fechaSeleccionada.dateString,
            startTime,
            endTime,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear la reserva');
        
        const esPremium = isSubscribed;

        if (!data.clientSecret || esPremium) {
          setPrecioPagado(0);
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: `${startTime}:00`,
            endTime: `${endTime}:00`,
          }]);
          
          // Cerramos el modal de configuración primero
          setConfigVisible(false);
          // Pequeño delay para que no choquen los dos modales en el renderizado
          setTimeout(() => {
            setShowSuccess(true);
          }, 400);
          return;
        }

        // Si llegamos aquí, hay que pagar. Guardamos el bookingId para poder borrarlo si cancela.
        const pendingBookingId = data.bookingId;

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
          if (paymentError.code !== 'Canceled') {
            Alert.alert('Error en el pago', paymentError.message);
          } else {
             // CANCELACIÓN: Borramos la reserva pendiente en el backend
             try {
               await fetch(`${API_URL}/bookings/${pendingBookingId}`, {
                 method: 'DELETE',
                 headers: { 'X-User-Id': userId }
               });
             } catch (e) {
               console.error("Error cleaning up cancelled booking", e);
             }
          }
        } else {
          setPrecioPagado(precioReserva);
          setOccupiedSlots(prev => [...prev, {
            date: fechaSeleccionada.dateString,
            startTime: `${startTime}:00`,
            endTime: `${endTime}:00`,
          }]);
          
          setConfigVisible(false);
          setTimeout(() => {
            setShowSuccess(true);
          }, 400);
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
                    const fStart = aMin(slot.startTime.substring(0,5));
                    const fEnd   = aMin(slot.endTime.substring(0,5));
                    // Si ya no cabe ni 1h libre, marcamos como ocupada
                    let tieneHueco = false;
                    for (let t = fStart; t + 60 <= fEnd; t += 30) {
                      if (!overlapConReserva(t, t + 60)) { tieneHueco = true; break; }
                    }
                    const noCabe = fEnd - fStart < 60;
                    const isOccupied = !tieneHueco || noCabe;

                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.slotCard,
                          isOccupied && styles.slotCardOccupied
                        ]}
                        onPress={() => !isOccupied && abrirConfiguracion(slot)}
                        disabled={isOccupied}
                      >
                        <View style={styles.slotCardTop}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                            <View style={styles.slotIconWrap}>
                              <MaterialCommunityIcons name="clock-outline" size={18} color={isOccupied ? '#444' : theme.brand} />
                            </View>
                            <Text style={[styles.slotTimeText, isOccupied && {color: '#444'}]}>
                              {slot.startTime.substring(0,5)} – {slot.endTime.substring(0,5)}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, isOccupied && styles.statusBadgeOccupied]}>
                             <Text style={[styles.statusBadgeText, isOccupied && {color: '#666'}]}>
                               {isOccupied ? 'Sin hueco' : 'Disponible'}
                             </Text>
                          </View>
                        </View>
                        
                        {/* Timeline de ocupación visual */}
                        <View style={styles.occupancyTimeline}>
                          {(() => {
                            const segments = [];
                            for (let t = fStart; t < fEnd; t += 30) {
                              const busy = overlapConReserva(t, t + 30);
                              segments.push(
                                <View 
                                  key={t} 
                                  style={[
                                    styles.timelineSegment, 
                                    busy ? styles.segmentBusy : styles.segmentFree,
                                  ]} 
                                />
                              );
                            }
                            return segments;
                          })()}
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

                <Text style={styles.helperInfo}>
                  Toca una franja para configurar tu reserva (1h – 3h en bloques de 30 min).
                </Text>
              </View>

              {/* Modal de configuración de la reserva */}
              <ReserveConfigModal
                visible={configVisible}
                onClose={() => setConfigVisible(false)}
                franja={franjaSeleccionada}
                duracionesValidas={duracionesValidas}
                reserveMinutes={reserveMinutes}
                setReserveMinutes={(min) => {
                  setReserveMinutes(min);
                  // Si la hora actual ya no es válida para esa duración, elegir primera libre.
                  if (franjaSeleccionada && reserveStart) {
                    const fStart = aMin(franjaSeleccionada.startTime.substring(0,5));
                    const fEnd   = aMin(franjaSeleccionada.endTime.substring(0,5));
                    const startMin = aMin(reserveStart);
                    if (startMin + min > fEnd || overlapConReserva(startMin, startMin + min)) {
                      for (let t = fStart; t + min <= fEnd; t += 30) {
                        if (!overlapConReserva(t, t + min)) { setReserveStart(deMin(t)); break; }
                      }
                    }
                  }
                }}
                reserveStart={reserveStart}
                setReserveStart={setReserveStart}
                inicioOpciones={inicioOpciones}
                reserveEnd={reserveEnd}
                hourlyRate={monitorDetail.hourlyRate || 0}
                precio={precioReserva}
                isSubscribed={isSubscribed}
                cargandoPago={cargandoPago}
                overlapConReserva={overlapConReserva}
                onConfirmar={handleContratar}
              />
            </>
          )}

          <SuccessModal
            visible={showSuccess}
            onClose={() => { setShowSuccess(false); navigation.navigate('Home'); }}
            monitorName={monitorDetail.name}
            time={reserveStart && reserveEnd ? `${reserveStart} – ${reserveEnd}` : ''}
            date={fechaSeleccionada.dateString}
            precio={precioPagado}
          />
        </ScrollView>
      </AppLayout>
    </StripeWrapper>
  );
}

function ReserveConfigModal({
  visible, onClose, franja, duracionesValidas,
  reserveMinutes, setReserveMinutes,
  reserveStart, setReserveStart, inicioOpciones, reserveEnd,
  hourlyRate, precio, isSubscribed, cargandoPago,
  overlapConReserva, onConfirmar,
}) {
  if (!franja) return null;
  const ancho = aMin(franja.endTime.substring(0,5)) - aMin(franja.startTime.substring(0,5));
  const cabeAlgo = ancho >= 60;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.configCard}>
          <View style={styles.configHeader}>
            <Text style={styles.configTitle}>Configura tu reserva</Text>
            <TouchableOpacity onPress={onClose} disabled={cargandoPago}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>
          <Text style={styles.configSub}>
            Franja del entrenador: {franja.startTime.substring(0,5)} – {franja.endTime.substring(0,5)}
          </Text>

          {!cabeAlgo ? (
            <Text style={styles.warnText}>La franja es menor de 1h, no se puede reservar.</Text>
          ) : (
            <>
              {/* Duración */}
              <Text style={styles.configLabel}>Duración</Text>
              <View style={styles.chipRow}>
                {duracionesValidas.map(d => {
                  const active = reserveMinutes === d.min;
                  return (
                    <TouchableOpacity
                      key={d.min}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setReserveMinutes(d.min)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Timeline de selección visual dentro del modal */}
              <View style={[styles.occupancyTimeline, { height: 12, marginVertical: 10, borderRadius: 6 }]}>
                {(() => {
                  const segments = [];
                  const fStart = aMin(franja.startTime.substring(0,5));
                  const fEnd   = aMin(franja.endTime.substring(0,5));
                  const startSel = reserveStart ? aMin(reserveStart) : -1;
                  const endSel   = startSel + reserveMinutes;

                  for (let t = fStart; t < fEnd; t += 30) {
                    const isBusy = overlapConReserva(t, t + 30);
                    const isSelected = startSel !== -1 && t >= startSel && t < endSel;
                    segments.push(
                      <View 
                        key={t} 
                        style={[
                          styles.timelineSegment, 
                          isBusy ? styles.segmentBusy : (isSelected ? { backgroundColor: theme.brand } : { backgroundColor: 'rgba(255,255,255,0.1)' }),
                          isSelected && { borderTopWidth: 0, borderBottomWidth: 0 }
                        ]} 
                      />
                    );
                  }
                  return segments;
                })()}
              </View>

              <Text style={styles.stepperHint}>
                El bloque verde indica tu selección actual dentro de la franja.
              </Text>

              {/* Hora de inicio - stepper en bloques de 30 min,
                  saltando las horas ya reservadas */}
              <Text style={styles.configLabel}>Hora de inicio</Text>
              {(() => {
                const libres = inicioOpciones.filter(o => o.libre).map(o => o.minutes);
                if (libres.length === 0) {
                  return <Text style={styles.warnText}>No hay huecos libres para esta duración.</Text>;
                }
                const currentMin = reserveStart ? aMin(reserveStart) : libres[0];
                const idx = libres.indexOf(currentMin);
                const canPrev = idx > 0;
                const canNext = idx >= 0 && idx < libres.length - 1;
                return (
                  <View style={styles.startStepperRow}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, !canPrev && styles.stepperBtnDisabled]}
                      onPress={() => canPrev && setReserveStart(deMin(libres[idx - 1]))}
                      disabled={!canPrev}
                    >
                      <Ionicons name="remove" size={20} color={canPrev ? '#fff' : '#555'} />
                    </TouchableOpacity>
                    <View style={styles.startDisplay}>
                      <Text style={styles.startDisplayText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {reserveStart || deMin(libres[0])}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepperBtn, !canNext && styles.stepperBtnDisabled]}
                      onPress={() => canNext && setReserveStart(deMin(libres[idx + 1]))}
                      disabled={!canNext}
                    >
                      <Ionicons name="add" size={20} color={canNext ? '#fff' : '#555'} />
                    </TouchableOpacity>
                  </View>
                );
              })()}
              <Text style={styles.stepperHint}>
                Ajusta la hora de inicio en saltos de 30 min.
              </Text>

              {/* Resumen */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Horario</Text>
                  <Text style={styles.summaryValue}>
                    {reserveStart || '--:--'} – {reserveEnd || '--:--'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tarifa</Text>
                  <Text style={styles.summaryValue}>{hourlyRate}€/h × {(reserveMinutes / 60).toFixed(reserveMinutes % 60 === 0 ? 0 : 1)}h</Text>
                </View>
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>
                    {isSubscribed ? 'Incluido (Premium)' : `${precio.toFixed(2)}€`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.mainCta, (cargandoPago || !reserveStart) && { opacity: 0.6 }]}
                onPress={onConfirmar}
                disabled={cargandoPago || !reserveStart}
              >
                <LinearGradient
                  colors={[theme.brand, '#15803d']}
                  style={styles.mainCtaGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {cargandoPago ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.mainCtaText}>
                      {isSubscribed ? 'Confirmar reserva' : `Pagar ${precio.toFixed(2)}€`}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
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
    backgroundColor: theme.bgSecondarySoft, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: theme.borderDefault,
    gap: 12,
  },
  slotCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotCardSelected: { borderColor: theme.brand, backgroundColor: theme.brandSofter },
  slotCardOccupied: { opacity: 0.5, backgroundColor: theme.bgPrimary },
  slotIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  slotTimeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeOccupied: { backgroundColor: 'rgba(255,0,0,0.1)' },
  statusBadgeText: { color: theme.textBody, fontSize: 12, fontWeight: '700' },
  occupancyTimeline: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', gap: 1 },
  timelineSegment: { flex: 1, height: '100%' },
  segmentFree: { backgroundColor: theme.brand },
  segmentBusy: { backgroundColor: '#333' },

  footerActions: { gap: 12 },
  subscribeBtn: { borderRadius: 16, overflow: 'hidden' },
  subscribeGradient: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  subscribeText: { color: '#000', fontSize: 14, fontWeight: '800' },
  mainCta: { borderRadius: 16, overflow: 'hidden', elevation: 4 },
  mainCtaGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  mainCtaText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  emptySlots: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptySlotsText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },
  helperInfo: {
    color: theme.textBody, fontSize: 12, textAlign: 'center',
    backgroundColor: theme.bgSecondarySoft,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: theme.borderDefault,
  },

  // Modal de configuración de reserva
  configCard: {
    width: '100%', maxWidth: 460,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  configTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  configSub: { color: theme.textBody, fontSize: 13, marginBottom: 18 },
  configLabel: { color: theme.textBrand, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: theme.bgPrimary,
    borderRadius: 20, borderWidth: 1, borderColor: theme.borderDefault,
  },
  chipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  chipText: { color: theme.textBody, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  startRow: { flexDirection: 'row', marginBottom: 8 },
  startChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: theme.bgPrimary,
    borderRadius: 12, marginRight: 8,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  startChipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  startChipBusy: { opacity: 0.4 },
  startChipText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Stepper de hora de inicio en el modal de reserva
  startStepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4, marginBottom: 8,
  },
  stepperBtn: {
    width: 44, height: 50, borderRadius: 12,
    backgroundColor: theme.bgPrimary,
    borderWidth: 1, borderColor: theme.borderDefault,
    justifyContent: 'center', alignItems: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  startDisplay: {
    flex: 1, minWidth: 80,
    height: 50, borderRadius: 12,
    backgroundColor: theme.bgPrimary,
    borderWidth: 1, borderColor: theme.borderDefault,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 8,
  },
  startDisplayText: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  stepperHint: { color: '#555', fontSize: 11, marginBottom: 4 },
  summaryBox: {
    marginTop: 14, marginBottom: 18,
    backgroundColor: theme.bgPrimary, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: theme.borderDefault,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  summaryLabel: { color: theme.textBody, fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  summaryTotalLabel: { color: theme.textBrand, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  summaryTotalValue: { color: theme.brand, fontSize: 18, fontWeight: '800' },
  warnText: { color: '#FFC107', fontSize: 13, marginVertical: 12 },

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