import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Animated, Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [modo, setModo] = useState('login'); // 'login' o 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Usuario');
  const [cargando, setCargando] = useState(false);

  // NOTIFICACIONES
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'error' });
  const translateY = useRef(new Animated.Value(-100)).current;

  const mostrarPopUp = (mensaje, tipo) => {
    setNotificacion({ visible: true, mensaje, tipo });

    // Animación de entrada
    Animated.spring(translateY, {
      toValue: 50, // Posición en pantalla
      useNativeDriver: true,
      friction: 7,
      tension: 40
    }).start();

    // Animación de salida después de 2.5 segundos
    setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.in(Easing.exp)
      }).start(() => {
        setNotificacion({ ...notificacion, visible: false });
        if (tipo === 'success') navigation.replace('Home');
      });
    }, 2200);
  };

  const handleEntrar = async () => {
    // NOTA: Mantenemos la validación
    if (!email || !password || (modo === 'registro' && !nombre)) {
      mostrarPopUp("Debes rellenar todos los campos", "error");
      return;
    }

    setCargando(true);

    try {
      // Determinar la ruta: login o registro
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';

      // Cuerpo de la petición
      const body = modo === 'login'
        ? { email, password }
        : { name: nombre, email, password, role: tipoCuenta === 'Usuario' ? 'FREE' : 'TRAINER' };

      // VOLVEMOS A LOCALHOST (Para desarrollo en PC)
      const API_URL = 'http://localhost:8080';

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        // VERIFICACIÓN
        if (modo === 'registro') {
          // Al registrar la cuenta no hay un token todavía.
          mostrarPopUp(data.message || "Cuenta creada, revisa tu email", "success");
          setTimeout(() => setModo('login'), 2200);
        } else {
          // MODO LOGIN
          if (data.userId) {
            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('userRole', data.role);
            await AsyncStorage.setItem('userId', data.userId.toString());
            await AsyncStorage.setItem('userName', data.name);
            await AsyncStorage.setItem('userEmail', data.email);

            mostrarPopUp(`Has logueado correctamente, Bienvenido, ${data.name}!`, "success");
          }
        }
      } else {
        mostrarPopUp(data.error || "Ocurrió un error inesperado.", "error");
      }
    } catch (error) {
      console.error(error);
      mostrarPopUp("No se pudo conectar con el servidor", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      {notificacion.visible && (
        <Animated.View style={[
          styles.popUpCard,
          { transform: [{ translateY }] },
          notificacion.tipo === 'error' ? styles.popUpError : styles.popUpSuccess
        ]}>
          <View style={styles.popUpContent}>
            <View style={[
              styles.iconCircle,
              { backgroundColor: notificacion.tipo === 'error' ? '#FF5252' : '#4CAF50' }
            ]}>
              <Ionicons
                name={notificacion.tipo === 'error' ? 'close' : 'checkmark'}
                size={16}
                color="#fff"
              />
            </View>
            <Text style={styles.popUpText}>{notificacion.mensaje}</Text>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">

          {/* Cabecera con logo de texto */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoLetter}>F</Text>
            </LinearGradient>
            <Text style={styles.appName}>FitHub Connect</Text>
            <Text style={styles.subtitle}>
              {modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </Text>
          </View>

          {/* Selector Login / Registro */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, modo === 'login' && styles.tabActive]}
              onPress={() => setModo('login')}
            >
              <Text style={[styles.tabText, modo === 'login' && styles.tabTextActive]}>
                Iniciar sesion
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, modo === 'registro' && styles.tabActive]}
              onPress={() => setModo('registro')}
            >
              <Text style={[styles.tabText, modo === 'registro' && styles.tabTextActive]}>
                Registrarse
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {modo === 'registro' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor="#555"
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Contrasena</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#555"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {modo === 'registro' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Tipo de cuenta</Text>
                <View style={styles.roleRow}>
                  {['Usuario', 'Monitor'].map((rol) => (
                    <TouchableOpacity
                      key={rol}
                      style={[styles.roleChip, tipoCuenta === rol && styles.roleChipActive]}
                      onPress={() => setTipoCuenta(rol)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.roleChipText, tipoCuenta === rol && styles.roleChipTextActive]}>{rol}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={handleEntrar}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {cargando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#2a2a2a',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  form: {
    gap: 4,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  roleChipText: {
    color: '#aaa',
    fontWeight: '500',
    fontSize: 14,
  },
  roleChipActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  roleChipTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  popUpCard: {
    position: 'absolute',
    top: 0,
    left: '5%',
    right: '5%',
    maxWidth: Platform.OS === 'web' ? 400 : '90%', // En web no ocupa toda la pantalla
    alignSelf: 'center',
    zIndex: 9999,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    // Sombra para móvil
    elevation: 10,
    // Sombra para Web
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  popUpError: {
    backgroundColor: '#1a0a0a',
    borderColor: '#FF5252',
  },
  popUpSuccess: {
    backgroundColor: '#0a1a0a',
    borderColor: '#4CAF50',
  },
  popUpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  popUpIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  popUpText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
