// __ IMPORTS __
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import { API_URL } from '../api';

// __ EXPORTS __
export default function LoginScreen({ navigation }) {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('Usuario');
  const [cargando, setCargando] = useState(false);
  const [recuerdame, setRecuerdame] = useState(false);

  // Sistema de Popups
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'success' });
  const translateY = useState(new Animated.Value(-100))[0];

  // Lógica de Recuérdame
  useEffect(() => {
    const cargarEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRecuerdame(true);
      }
    };
    cargarEmail();
  }, []);

  const mostrarPopUp = (msg, tipo = 'success') => {
    setNotificacion({ visible: true, mensaje: msg, tipo });
    Animated.spring(translateY, { toValue: 60, useNativeDriver: true }).start();

    setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 500, useNativeDriver: true }).start(() => {
        setNotificacion({ ...notificacion, visible: false });
      });
    }, 3000);
  };

  const handleEntrar = async () => {
    if (!email || !password || (modo === 'registro' && !nombre)) {
      mostrarPopUp("Por favor, rellena todos los campos", "error");
      return;
    }

    setCargando(true);
    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';
      const roleMapped = tipoCuenta === 'Monitor' ? 'TRAINER' : 'FREE';

      const body = modo === 'login'
        ? { email, password }
        : { name: nombre, email, password, role: roleMapped };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (modo === 'registro') {
          mostrarPopUp("¡Cuenta creada! Revisa tu email.", "success");
          setModo('login');
        } else {
          // 1. Limpiamos datos de sesión previos
          const emailParaRecordar = email;

          // 2. Guardamos datos de sesión
          await AsyncStorage.setItem('userToken', data.token);
          await AsyncStorage.setItem('userRole', data.role);
          await AsyncStorage.setItem('userId', data.userId.toString());
          await AsyncStorage.setItem('userName', data.name);

          // 3. Check Recuérdame
          if (recuerdame) {
            await AsyncStorage.setItem('savedEmail', emailParaRecordar);
          } else {
            await AsyncStorage.removeItem('savedEmail');
          }

          mostrarPopUp(`¡Bienvenido, ${data.name}!`, "success");
          setTimeout(() => navigation.replace('Home'), 1000);
        }
      } else {
        mostrarPopUp(data.error || "Error de credenciales", "error");
      }
    } catch (error) {
      mostrarPopUp("Error de conexión", "error");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* NUEVO POPUP (TRADUCCIÓN EXACTA DEL TOAST HTML) */}
      {notificacion.visible && (
        <Animated.View
          style={[{ transform: [{ translateY }], zIndex: 9999 }]}
          className="absolute self-center w-[92%] max-w-sm p-4 bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 flex-row items-center"
        >
          {/* Contenedor del Icono (shrink-0 w-7 h-7) */}
          <View
            className={`items-center justify-center shrink-0 w-7 h-7 rounded ${notificacion.tipo === 'error' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}
          >
            <Ionicons
              name={notificacion.tipo === 'error' ? 'close' : 'checkmark-sharp'}
              size={18}
              color={notificacion.tipo === 'error' ? '#ef4444' : '#22c55e'}
            />
          </View>

          {/* Texto del Mensaje (ms-3 text-sm font-normal) */}
          <View className="ms-3 flex-1">
            <Text className="text-sm font-normal text-zinc-300 leading-5">
              {notificacion.mensaje}
            </Text>
          </View>

          {/* Botón Cerrar (ms-auto h-8 w-8) */}
          <TouchableOpacity
            onPress={() => {
              Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }).start(() => {
                setNotificacion(prev => ({ ...prev, visible: false }));
              });
            }}
            className="ms-auto flex items-center justify-center h-8 w-8 rounded-lg bg-transparent"
          >
            <Ionicons name="close-outline" size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070' }}
        className="flex-1"
      >
        <View className="flex-1 bg-black/80">
          <SafeAreaView className="flex-1">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }}>

                <MotiView
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  className="w-full"
                >
                  {/* CABECERA */}
                  <View className="items-center mb-10">
                    <View className="bg-[#3f6240] w-20 h-20 rounded-[28px] items-center justify-center shadow-2xl shadow-green-900/50 rotate-3">
                      <Text className="text-white font-black text-5xl -rotate-3">F</Text>
                    </View>
                    <Text className="text-white text-4xl font-black mt-4 tracking-tighter">FITHUB</Text>
                    <Text className="text-zinc-500 font-bold uppercase tracking-[4px] text-[10px]">Premium Experience</Text>
                  </View>

                  {/* FORMULARIO */}
                  <View className="bg-zinc-900/50 border border-white/10 rounded-[40px] p-8">
                    <View className="gap-y-4">
                      {modo === 'registro' && (
                        <TextInput
                          className="bg-black/40 text-white px-6 py-4 rounded-2xl border border-white/5 focus:border-[#3f6240]"
                          placeholder="Nombre Completo"
                          placeholderTextColor="#555"
                          value={nombre}
                          onChangeText={setNombre}
                        />
                      )}

                      <TextInput
                        className="bg-black/40 text-white px-6 py-4 rounded-2xl border border-white/5 focus:border-[#3f6240]"
                        placeholder="Email"
                        placeholderTextColor="#555"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                      />

                      <TextInput
                        className="bg-black/40 text-white px-6 py-4 rounded-2xl border border-white/5 focus:border-[#3f6240]"
                        placeholder="Contraseña"
                        placeholderTextColor="#555"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>

                    {/* RECUÉRDAME*/}
                    {modo === 'login' && (
                      <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-row items-center mt-5 ml-1"
                      >
                        <TouchableOpacity
                          onPress={() => setRecuerdame(!recuerdame)}
                          className="flex-row items-center"
                        >
                          <View className={`w-5 h-5 rounded-md border ${recuerdame ? 'bg-[#3f6240] border-[#3f6240]' : 'border-zinc-700'} items-center justify-center`}>
                            {recuerdame && <Ionicons name="checkmark" size={14} color="white" />}
                          </View>
                          <Text className="text-zinc-400 text-xs ml-2">Recordar mi email</Text>
                        </TouchableOpacity>
                      </MotiView>
                    )}

                    {/* BOTÓN PRINCIPAL */}
                    <TouchableOpacity
                      className="bg-[#3f6240] mt-8 py-5 rounded-2xl items-center shadow-xl shadow-green-900/20"
                      onPress={handleEntrar}
                      disabled={cargando}
                    >
                      {cargando ? <ActivityIndicator color="white" /> : (
                        <Text className="text-white font-black text-lg tracking-widest uppercase">
                          {modo === 'login' ? 'Entrar' : 'Unirme'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* DIVIDER SOCIAL */}
                    <View className="flex-row items-center my-8">
                      <View className="flex-1 h-[1px] bg-white/10" />
                      <Text className="text-zinc-600 px-4 text-[10px] font-bold uppercase tracking-widest">O conéctate con</Text>
                      <View className="flex-1 h-[1px] bg-white/10" />
                    </View>

                    {/* BOTONES SOCIALES */}
                    <View className="flex-row gap-x-4">
                      <TouchableOpacity className="flex-1 flex-row bg-white h-14 rounded-2xl items-center justify-center">
                        <FontAwesome5 name="google" size={20} color="#EA4335" />
                      </TouchableOpacity>
                      <TouchableOpacity className="flex-1 flex-row bg-[#1877F2] h-14 rounded-2xl items-center justify-center">
                        <FontAwesome5 name="facebook" size={22} color="white" />
                      </TouchableOpacity>
                    </View>

                    {/* SWITCH MODO */}
                    <TouchableOpacity
                      className="mt-8 items-center"
                      onPress={() => setModo(modo === 'login' ? 'registro' : 'login')}
                    >
                      <Text className="text-zinc-500 text-sm">
                        {modo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                        <Text className="text-white font-black decoration-green-500 underline">
                          {modo === 'login' ? 'REGÍSTRATE' : 'LOGUÉATE'}
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </MotiView>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </View>
  );
}