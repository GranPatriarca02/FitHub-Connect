import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RegisterScreen({ navigation }) {
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Usuario');
  const [cargando, setCargando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  const translateY = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(width * 0.25)).current;

  const mostrarPopUp = (msg, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje: msg, tipo });
    Animated.spring(translateY, { toValue: 60, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 500, useNativeDriver: true }).start(() => {
        setNotificacion(prev => ({ ...prev, visible: false }));
      });
    }, 3000);
  };


  const manejarNavegacion = async (direccion) => {
    if (direccion === 'atras') {
      if (paso === 1) return navigation.goBack();
      const anterior = paso - 1;
      setPaso(anterior);
      actualizarProgreso(anterior);
      return;
    }

    // LÓGICA DE "SIGUIENTE"
    if (paso === 1) {
      if (!nombre.trim()) return mostrarPopUp("Dinos tu nombre", "error");
    }

    if (paso === 2) {
      if (!email.includes('@')) return mostrarPopUp("Email no válido", "error");

      setCargando(true);
      try {
        const response = await fetch(`${API_URL}/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          // IMPORTANTE: Detenemos aquí si el email ya existe
          setCargando(false);
          return mostrarPopUp(data.message || "Este email ya está registrado", "error");
        }
      } catch (error) {
        // Si el servidor falla o no existe el endpoint, dejamos pasar o avisamos
        console.error("Error validando email:", error);
      } finally {
        setCargando(false);
      }
    }

    if (paso === 3) {
      if (password.length < 6) return mostrarPopUp("Contraseña mínima 6 caracteres", "error");
    }

    // Si todo está bien, avanzamos
    const siguiente = paso + 1;
    setPaso(siguiente);
    actualizarProgreso(siguiente);
  };

  // Función auxiliar para la animación de la barra
  const actualizarProgreso = (pasoActual) => {
    Animated.timing(progressAnim, {
      toValue: (width * (pasoActual / 4)),
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // REGISTRO
  const handleRegistro = async () => {
    setCargando(true);
    try {
      const roleMapped = tipoCuenta === 'Monitor' ? 'TRAINER' : 'FREE';
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombre, email, password, role: roleMapped }),
      });

      const data = await response.json();

      if (response.ok) {
        mostrarPopUp("¡Cuenta creada!", "success");
        setTimeout(() => navigation.navigate('Login'), 1500);
      } else {

        const errorMsg = data.message || data.error || "Error en el registro";
        mostrarPopUp(errorMsg, "error");
      }
    } catch (error) {
      mostrarPopUp("Error de conexión con el servidor", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/background.jpg')} style={{ flex: 1, width: '100%', height: '100%' }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>

        {/* BARRA DE PROGRESO */}
        <View style={{ height: 4, backgroundColor: '#1f2937', width: '100%', marginTop: Platform.OS === 'ios' ? 45 : 0 }}>
          <Animated.View style={{ height: '100%', backgroundColor: '#4A8763', width: progressAnim }} />
        </View>

        <SafeAreaView style={{ flex: 1 }}>
          {notificacion.visible && (
            <Animated.View style={{ transform: [{ translateY }], zIndex: 9999, position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
              <View style={{ width: '90%', maxWidth: 400, padding: 16, borderRadius: 12, backgroundColor: notificacion.tipo === 'error' ? '#450a0a' : '#064e3b', borderWidth: 1, borderColor: notificacion.tipo === 'error' ? '#ef4444' : '#10b981' }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{notificacion.mensaje}</Text>
              </View>
            </Animated.View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>

                <View style={{ width: '100%', maxWidth: 420 }}>
                  <View style={{ marginBottom: 30 }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: '#ffffff' }}>
                      {paso === 1 ? 'Tu Identidad' : paso === 2 ? 'Tu Email' : paso === 3 ? 'Seguridad' : 'Confirmar'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#4A8763', fontWeight: '600', letterSpacing: 1 }}>PASO {paso} DE 4</Text>
                  </View>

                  {/* PASOS*/}
                  {paso === 1 && (
                    <View style={{ gap: 20 }}>
                      <TextInput style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, padding: 16, color: 'white' }} placeholder="¿Cómo te llamas?" placeholderTextColor="#4b5563" value={nombre} onChangeText={setNombre} />
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {[{ id: 'Usuario', icon: 'person', label: 'Miembro' }, { id: 'Monitor', icon: 'fitness', label: 'Monitor' }].map((item) => (
                          <TouchableOpacity key={item.id} onPress={() => setTipoCuenta(item.id)} style={{ flex: 1, paddingVertical: 20, alignItems: 'center', borderRadius: 16, backgroundColor: tipoCuenta === item.id ? '#47765b85' : 'rgba(3, 7, 18, 0.4)', borderWidth: 2, borderColor: tipoCuenta === item.id ? '#4A8763' : '#374151' }}>
                            <Ionicons name={item.icon} size={28} color={tipoCuenta === item.id ? '#000' : '#4A8763'} />
                            <Text style={{ color: tipoCuenta === item.id ? '#fff' : '#fff', fontWeight: '700', marginTop: 8 }}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {paso === 2 && (
                    <TextInput style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, padding: 16, color: 'white' }} placeholder="correo@ejemplo.com" placeholderTextColor="#4b5563" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoFocus />
                  )}

                  {paso === 3 && (
                    <View style={{ position: 'relative', justifyContent: 'center' }}>
                      <TextInput style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, padding: 16, color: 'white', paddingRight: 55 }} placeholder="Crea tu contraseña" placeholderTextColor="#4b5563" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoFocus />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16 }}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#4A8763" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {paso === 4 && (
                    <View style={{ padding: 25, backgroundColor: 'rgba(74, 135, 99, 0.1)', borderRadius: 20, borderWidth: 1, borderColor: '#4A8763', alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark" size={50} color="#4A8763" style={{ marginBottom: 15 }} />
                      <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>{nombre}, todo listo.{'\n'}Pulsa finalizar para entrar a FitHub Connect.</Text>
                    </View>
                  )}

                  {/* BOTONES NAVEGACIÓN */}
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 30 }}>

                    {/* Botón Atrás */}
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(55, 65, 81, 0.4)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#374151' }}
                      onPress={() => manejarNavegacion('atras')}
                    >
                      <Text style={{ color: '#f3f4f6', fontWeight: '600' }}>Atrás</Text>
                    </TouchableOpacity>

                    {/* Botón Siguiente / Finalizar */}
                    <TouchableOpacity
                      style={{
                        flex: 2,
                        backgroundColor: '#47765b85',
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#4A8763'
                      }}
                      onPress={() => paso < 4 ? manejarNavegacion('siguiente') : handleRegistro()}
                      disabled={cargando}
                    >
                      {cargando ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                          {paso === 4 ? 'Finalizar' : 'Siguiente'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                </View>
              </View>
            </ScrollView>

            {/* COPYRIGHT */}
            <View style={{
              marginTop: 'auto',
              paddingVertical: 20,
              alignItems: 'center'
            }}>
              {/* HR */}
              <View style={{
                width: '100%',
                height: 1,
                backgroundColor: 'rgba(55, 65, 81, 0.3)',
                marginBottom: 15
              }} />

              <Text style={{
                textAlign: 'center',
                color: '#b3b3b3ff',
                fontSize: 12,
                letterSpacing: 1.2,
              }}>
                © 2026 FitHub Connect • Todos los derechos reservados
              </Text>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}