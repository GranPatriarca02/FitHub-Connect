// __ IMPORTS __
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants'; // Importado para leer el .env

// RESCATAMOS LA URL DESDE EL .ENV (Vía app.config.js)
const API_URL = Constants.expoConfig?.extra?.backendUrl;

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Usuario'); // Restaurado
  const [cargando, setCargando] = useState(false);
  const [recuerdame, setRecuerdame] = useState(false);

  // Sistema de Popups
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  const translateY = useState(new Animated.Value(-100))[0];

  // Cargar email guardado
  useEffect(() => {
    const inicializarDatos = async () => {
      // 1. SIEMPRE comprobar que API_URL existe antes de llamar al backend
      if (!API_URL) {
        console.log("Esperando configuración de red...");
        return;
      }

      try {
        await loadUserData();
      } catch (error) {

        console.log("Error de red:", error.message);
      }
    };

    inicializarDatos();
  }, [API_URL]);

  const mostrarPopUp = (msg, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje: msg, tipo });
    Animated.spring(translateY, { toValue: 60, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 500, useNativeDriver: true }).start(() => {
        setNotificacion(prev => ({ ...prev, visible: false }));
      });
    }, 3000);
  };

  const handleEntrar = async () => {
    // Validaciones básicas
    if (!email || !password || (modo === 'registro' && !nombre)) {
      mostrarPopUp("Por favor, rellena todos los campos", "error");
      return;
    }

    setCargando(true);
    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';

      // RESTAURADO: Mapeo de roles para tu API
      const roleMapped = tipoCuenta === 'Monitor' ? 'TRAINER' : 'FREE';

      // RESTAURADO: Cuerpo del mensaje exacto
      const body = modo === 'login'
        ? { email, password }
        : { name: nombre, email, password, role: roleMapped };

      console.log("Intentando conectar a:", `${API_URL}${endpoint}`);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (modo === 'registro') {
          mostrarPopUp("¡Cuenta creada! Ya puedes loguearte.", "success");
          setModo('login');
        } else {
          // RESTAURADO: Guardado de datos en AsyncStorage
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userRole', data.role);
          await AsyncStorage.setItem('userId', data.userId.toString());
          await AsyncStorage.setItem('userName', data.name);

          if (recuerdame) await AsyncStorage.setItem('savedEmail', email);
          else await AsyncStorage.removeItem('savedEmail');

          mostrarPopUp(`¡Bienvenido, ${data.name}!`, "success");
          setTimeout(() => navigation.replace('Home'), 1000);
        }
      } else {
        mostrarPopUp(data.error || "Error de credenciales", "error");
      }
    } catch (error) {
      console.error("Error de red detallado:", error);
      mostrarPopUp("Error de conexión con el servidor", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {/* POPUP */}
      {notificacion.visible && (
        <Animated.View style={[{ transform: [{ translateY }], zIndex: 9999, position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 40 }]}>
          <View style={{ width: '90%', padding: 16, borderRadius: 12, backgroundColor: notificacion.tipo === 'error' ? '#450a0a' : '#064e3b', borderWidth: 1, borderColor: notificacion.tipo === 'error' ? '#ef4444' : '#10b981' }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>{notificacion.mensaje}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>

          <View style={{ width: width * 0.9, maxWidth: 400 }}>

            {/* ICONO */}
            <View style={{ alignSelf: 'center', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: 20, borderRadius: 100, marginBottom: 20 }}>
              <MaterialCommunityIcons name="dumbbell" size={50} color="#2ecc71" />
            </View>

            {/* TITULO */}
            <Text style={{ color: 'white', fontSize: 42, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>
              FitHub <Text style={{ color: '#2ecc71' }}>Connect</Text>
            </Text>

            {/* INDICADOR DE URL (Solo para debug, puedes quitarlo luego) */}
            <Text style={{ color: '#444', textAlign: 'center', fontSize: 10, marginBottom: 20 }}>
              Host: {API_URL}
            </Text>

            {/* CAJA LOGIN (Blindada contra errores de capa) */}
            <View style={{ backgroundColor: '#111', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#222' }}>

              {modo === 'registro' && (
                <TextInput
                  style={{ backgroundColor: '#000', color: 'white', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' }}
                  placeholder="Nombre completo" placeholderTextColor="#555" value={nombre} onChangeText={setNombre}
                />
              )}

              <TextInput
                style={{ backgroundColor: '#000', color: 'white', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' }}
                placeholder="Email" placeholderTextColor="#555" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
              />

              <TextInput
                style={{ backgroundColor: '#000', color: 'white', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' }}
                placeholder="Contraseña" placeholderTextColor="#555" value={password} onChangeText={setPassword} secureTextEntry
              />

              {modo === 'login' && (
                <TouchableOpacity onPress={() => setRecuerdame(!recuerdame)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginLeft: 5 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#2ecc71', backgroundColor: recuerdame ? '#2ecc71' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {recuerdame && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text style={{ color: '#666', marginLeft: 10 }}>Recordar mi email</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleEntrar}
                disabled={cargando}
                style={{ backgroundColor: '#2ecc71', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 }}
              >
                {cargando ? <ActivityIndicator color="black" /> : (
                  <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>
                    {modo === 'login' ? 'INICIAR SESIÓN' : 'REGISTRARME'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 25, alignItems: 'center' }} onPress={() => setModo(modo === 'login' ? 'registro' : 'login')}>
                <Text style={{ color: '#555' }}>
                  {modo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>{modo === 'login' ? 'REGÍSTRATE' : 'LOGUÉATE'}</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}