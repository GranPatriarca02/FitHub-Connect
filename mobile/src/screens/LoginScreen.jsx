// __ IMPORTS __
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// API_URL: Usando estrictamente tu .env
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen({ navigation }) {
  // --- ESTADOS ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recuerdame, setRecuerdame] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- SISTEMA DE POPUPS (NOTIFICACIONES) ---
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  // ARREGLO: Se usa useRef para evitar problemas de re-renderizado en la animación
  const translateY = useRef(new Animated.Value(-100)).current;

  // --- EFECTO INICIAL: CARGAR DATOS GUARDADOS ---
  useEffect(() => {
    const inicializarDatos = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRecuerdame(true);
        }
      } catch (error) {
        console.log("Error al cargar datos iniciales:", error.message);
      }
    };
    inicializarDatos();
  }, []);

  // --- LÓGICA DE POPUP ---
  const mostrarPopUp = (msg, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje: msg, tipo });
    Animated.spring(translateY, { toValue: 60, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 500, useNativeDriver: true }).start(() => {
        setNotificacion(prev => ({ ...prev, visible: false }));
      });
    }, 3000);
  };

  // --- LÓGICA DE AUTENTICACIÓN (LOGIN) ---
  const handleEntrar = async () => {
    if (!email || !password) {
      mostrarPopUp("Por favor, rellena todos los campos", "error");
      return;
    }

    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userRole', data.role);
        await AsyncStorage.setItem('userId', data.userId.toString());
        await AsyncStorage.setItem('userName', data.name);

        if (recuerdame) {
          await AsyncStorage.setItem('savedEmail', email);
        } else {
          await AsyncStorage.removeItem('savedEmail');
        }

        mostrarPopUp(`¡Bienvenido, ${data.name}!`, "success");
        setTimeout(() => navigation.replace('Home'), 1000);
      } else {
        mostrarPopUp(data.error || "Error de credenciales", "error");
      }
    } catch (error) {
      mostrarPopUp("Error de conexión con el servidor", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <ImageBackground source={require('../../assets/background.jpg')} style={{ flex: 1, width: '100%', height: '100%', position: 'absolute' }} resizeMode="cover">
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          {notificacion.visible && (
            <Animated.View style={{ transform: [{ translateY }], zIndex: 9999, position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 40 }}>
              <View style={{ width: '90%', maxWidth: 400, padding: 16, borderRadius: 12, backgroundColor: notificacion.tipo === 'error' ? '#450a0a' : '#064e3b', borderWidth: 1, borderColor: notificacion.tipo === 'error' ? '#ef4444' : '#10b981' }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{notificacion.mensaje}</Text>
              </View>
            </Animated.View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              <View style={{ width: '100%', maxWidth: 420, padding: 28 }}>

                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 4 }}>Iniciar sesión</Text>
                  <Text style={{ fontSize: 14, color: '#9ca3af' }}>Introduce tus datos para acceder a tu cuenta.</Text>
                </View>

                {/* BOTONES SOCIALES */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                  <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(31, 41, 55, 0.5)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#374151' }}>
                    <Ionicons name="logo-google" size={18} color="#4285F4" />
                    <Text style={{ color: '#f3f4f6', fontWeight: '500' }}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(31, 41, 55, 0.5)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#374151' }}>
                    <Ionicons name="logo-twitter" size={18} color="white" />
                    <Text style={{ color: '#f3f4f6', fontWeight: '500' }}>Twitter</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(55, 65, 81, 0.5)' }} />
                  <Text style={{ marginHorizontal: 16, color: '#6b7280', fontSize: 12 }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(55, 65, 81, 0.5)' }} />
                </View>

                <View style={{ gap: 16 }}>
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#d1d5db' }}>Email<Text style={{ color: '#ef4444' }}>*</Text></Text>
                    <TextInput style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: 'white' }} placeholder="ejemplo@gmail.com" placeholderTextColor="#4b5563" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#d1d5db' }}>Contraseña<Text style={{ color: '#ef4444' }}>*</Text></Text>
                    <View style={{ position: 'relative', justifyContent: 'center' }}>
                      <TextInput style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: 'white', paddingRight: 50 }} placeholder="Tu contraseña" placeholderTextColor="#4b5563" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16 }}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setRecuerdame(!recuerdame)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#374151', marginRight: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: recuerdame ? '#4A8763' : 'transparent' }}>
                        {recuerdame && <Ionicons name="checkmark" size={14} color="black" />}
                      </View>
                      <Text style={{ color: '#9ca3af', fontSize: 13 }}>Mantener inicio de sesión</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={{ backgroundColor: '#47765b85', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#4A8763' }} onPress={handleEntrar} disabled={cargando}>
                    {cargando ? <ActivityIndicator color="black" /> : <Text style={{ color: '#f3f4f6', fontWeight: '500', fontSize: 16 }}>Iniciar sesión</Text>}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>¿Aún no tienes una cuenta? </Text>
                    {/* ARREGLO: Navega a 'Register' (Verifica que en tu App.js el name sea 'Register') */}
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                      <Text style={{ color: '#4A8763', fontWeight: '800', fontSize: 14 }}>Cuenta nueva</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}