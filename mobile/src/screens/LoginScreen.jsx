import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [modo, setModo] = useState('login'); // 'login' o 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Usuario');
  const [cargando, setCargando] = useState(false);

  const handleEntrar = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Debes rellenar todos los campos para continuar.");
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

      // Petición al servidor
      const response = await fetch(`http://192.168.1.129:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos Token y ROL en el almacenamiento persistente
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('userRole', data.role); // Esto guardará "FREE", "TRAINER" o "CLIENT_PREMIUM"
        await AsyncStorage.setItem('userId', data.userId.toString());
        await AsyncStorage.setItem('userName', data.name);

        navigation.replace('Home');
      } else {
        Alert.alert("Error", data.error || "Ocurrió un error inesperado.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
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
});
