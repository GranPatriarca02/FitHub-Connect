// Navegación principal.
import "./global.css";
import { registerRootComponent } from 'expo';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { cssInterop } from "nativewind";

// Forzamos a que View y Text acepten clases de Tailwind
cssInterop(View, { className: "style" });
cssInterop(Text, { className: "style" });

import React, { useState, useEffect } from 'react'; // Añadidos useState y useEffect
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen_new from './src/screens/HomeScreen_new';
// import HomeScreen from './src/screens/HomeScreen';
import MonitorListScreen from './src/screens/MonitorListScreen';
import MonitorDetailScreen from './src/screens/MonitorDetailScreen';

import AccountScreen from './src/screens/AccountScreen.jsx';
import SubscriptionBenefitsScreen from './src/screens/SubscriptionBenefitsScreen.jsx';
import TrainerAvailabilityScreen from './src/screens/TrainerAvailabilityScreen.jsx';
import TrainerProfileScreen from './src/screens/TrainerProfileScreen.jsx';
import VideosScreen from './src/screens/VideosScreen.jsx';
import RoutinesScreen from './src/screens/RoutinesScreen.jsx';
import RoutineDetailScreen from './src/screens/RoutineDetailScreen.jsx';
import ExercisesScreen from './src/screens/ExercisesScreen.jsx';
import SocialScreen from './src/screens/SocialScreen.jsx';


const Stack = createNativeStackNavigator();

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // CONTROL DE SESIÓN Y SEGURIDAD: Definimos si mandamos al usuario al Login o a Home.
  useEffect(() => {
    // Esta función mira si hay una sesión guardada.
    const verificarSesion = async () => {
      try {
        // Recuperamos de la memoria local el token y el momento del login.
        const token = await AsyncStorage.getItem('userToken');
        const loginTimestamp = await AsyncStorage.getItem('loginTimestamp');
        const rememberMe = await AsyncStorage.getItem('rememberMe');

        if (token && loginTimestamp) {
          const ahora = Date.now();
          const cuatroHorasMs = 4 * 60 * 60 * 1000; // Limite de sesión, 4 horas.

          // Si han pasado más de 4 horas, limpiamos.
          if (ahora - parseInt(loginTimestamp) > cuatroHorasMs) {
            console.log("Sesión expirada");
            await limpiarSesion();
            return;
          }

          // Si no se marca recuerdame, al reiniciar el navegador o la aplicación la sesión se cierra.
          if (rememberMe !== 'true') {
            console.log("No se marcó recuérdame, cerrando sesión");
            await limpiarSesion();
            return;
          }
          // Si se cumplen las condiciones el Token es valido y lo cargamos.
          setUserToken(token);
        }
      } catch (e) {
        console.error("Error en la sesión", e);
      } finally {
        setCargando(false);
      }
    };

    const limpiarSesion = async () => {
      await AsyncStorage.removeItem('userToken'); // Borramos el acceso.
      await AsyncStorage.removeItem('loginTimestamp'); // Borramos el tiempo.
      setUserToken(null); // Forzamos la redirección al Login.
    };
    verificarSesion();
  }, []);

  // Mientras comprueba el token, mostramos una rueda de carga
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        // Si hay token, empezamos en Home, en caso contrario en el Login
        initialRouteName={userToken ? "Home" : "Login"}
        screenOptions={{
          headerStyle: { backgroundColor: '#1e1e1e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Crear Cuenta', headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen_new}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MonitorList"
          component={MonitorListScreen}
          options={{ title: 'Monitores' }}
        />
        <Stack.Screen
          name="MonitorDetail"
          component={MonitorDetailScreen}
          options={{ title: 'Detalle del Monitor' }}
        />
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: 'Mi Cuenta' }}
        />
        <Stack.Screen
          name="SubscriptionBenefits"
          component={SubscriptionBenefitsScreen}
          options={{
            title: 'Hazte Premium',
            headerShown: false,
            presentation: 'modal'
          }}
        />
        <Stack.Screen
          name="TrainerAvailability"
          component={TrainerAvailabilityScreen}
          options={{ title: 'Mi Disponibilidad' }}
        />
        <Stack.Screen
          name="TrainerProfile"
          component={TrainerProfileScreen}
          options={{ title: 'Perfil Profesional' }}
        />
        <Stack.Screen
          name="Videos"
          component={VideosScreen}
          options={{ title: 'Videos' }}
        />
        <Stack.Screen
          name="Routines"
          component={RoutinesScreen}
          options={{ title: 'Rutinas' }}
        />
        <Stack.Screen
          name="RoutineDetail"
          component={RoutineDetailScreen}
          options={{ title: 'Detalle de rutina' }}
        />
        <Stack.Screen
          name="Exercises"
          component={ExercisesScreen}
          options={{ title: 'Ejercicios' }}
        />
        <Stack.Screen
          name="Social"
          component={SocialScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}