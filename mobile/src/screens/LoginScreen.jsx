// __ IMPORTS __
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Dimensions, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// API_URL: .env
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen({ navigation }) {
  // ___  ESTADOS ___ 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [recuerdame, setRecuerdame] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // REFERENCIAS
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // ___  SISTEMA DE POPUPS (NOTIFICACIONES) ___ 
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  // ARREGLO: Se usa useRef para evitar problemas de re-renderizado en la animación
  const translateY = useRef(new Animated.Value(-100)).current;

  // ___  CARGA DE DATOS ___ 
  useEffect(() => {
    const cargarDatosGuardados = async () => {
      try {
        // Recuperamos email, contraseña y el estado del checkbox desde el almacenamiento local.
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPass = await AsyncStorage.getItem('savedPass');
        const rememberMe = await AsyncStorage.getItem('rememberMe');

        // Si el usuario marcó recuerdame rellenamos los campos con los datos almacenados localmente.
        if (rememberMe === 'true') {
          if (savedEmail) setEmail(savedEmail);
          if (savedPass) setPassword(savedPass); // Rellenamos el campo de password.
          setRecuerdame(true);                   // Marcamos visualmente el checkbox.
        }
      } catch (error) {
        console.log("Error cargando persistencia en Login:", error);
      }
    };
    cargarDatosGuardados();

    // ACTIVACIÓN AUTOMÁTICA DEL TECLADO AL ENTRAR
    setTimeout(() => {
      emailRef.current?.focus();
    }, 500);
  }, []);

  // ___ LÓGICA DE POPUP ___ 
  const mostrarPopUp = (msg, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje: msg, tipo });
    Animated.spring(translateY, { toValue: 60, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 500, useNativeDriver: true }).start(() => {
        setNotificacion(prev => ({ ...prev, visible: false }));
      });
    }, 3000);
  };

  // ___ LÓGICA DE AUTENTICACIÓN (LOGIN) ___ 
  const handleEntrar = async () => {
    // Validación de campos vacíos
    if (!email || !password) {
      mostrarPopUp("Por favor, rellena todos los campos", "error");
      return;
    }

    setCargando(true);
    try {
      // Petición POST a la API para validar credenciales.
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      // GESTION DE LA SESIÓN 
      if (response.ok) {
        await AsyncStorage.setItem('userToken', data.token); // Acceso para las peticiones a la API.
        await AsyncStorage.setItem('loginTimestamp', Date.now().toString()); // Expiración de la sesión: App.jsx.
        await AsyncStorage.setItem('rememberMe', recuerdame ? 'true' : 'false'); // Mantener sesión.

        // Identifad del miembro.
        await AsyncStorage.setItem('userRole', data.role); // Permisos del usuario.
        await AsyncStorage.setItem('userId', data.userId.toString()); // Identificador único del usuario.
        await AsyncStorage.setItem('userName', data.name); // Nombnre del usuario.


        // LÓGICA DE RECUÉRDAME
        if (recuerdame) {
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('savedPass', password);
        } else {
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('savedPass');
        }
        // Mostramos PopUp de bienvenida
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
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

                {/* INPUT EMAIL */}
                <View style={{ gap: 16 }}>
                  {/* INPUT EMAIL */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#d1d5db' }}>
                      Email<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                      ref={emailRef}
                      autoFocus={true}
                      style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: 'white' }}
                      placeholder="ejemplo@gmail.com"
                      placeholderTextColor="#4b5563"
                      value={email}
                      onChangeText={(text) => setEmail(text)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {/* INPUT CONTRASEÑA */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#d1d5db' }}>
                      Contraseña<Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <View style={{ position: 'relative', justifyContent: 'center' }}>
                      <TextInput
                        ref={passwordRef}
                        style={{ backgroundColor: 'rgba(3, 7, 18, 0.6)', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: 'white', paddingRight: 50 }}
                        placeholder="Tu contraseña"
                        placeholderTextColor="#4b5563"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleEntrar}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 16 }}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* RECUÉRDAME */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      onPress={() => setRecuerdame(!recuerdame)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: recuerdame ? '#4A8763' : '#374151',
                        backgroundColor: recuerdame ? '#4A8763' : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {recuerdame && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                      <Text style={{ color: '#9ca3af', fontSize: 14 }}>Recuérdame</Text>
                    </TouchableOpacity>
                  </View>

                  {/* BOTON INICIAR SESIÓN */}
                  <TouchableOpacity style={{ backgroundColor: '#47765b85', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#4A8763' }} onPress={handleEntrar} disabled={cargando}>
                    {cargando ? <ActivityIndicator color="black" /> : <Text style={{ color: '#f3f4f6', fontWeight: '500', fontSize: 16 }}>Iniciar sesión</Text>}
                  </TouchableOpacity>

                  {/* REGISTRO */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>¿Aún no tienes una cuenta? </Text>
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