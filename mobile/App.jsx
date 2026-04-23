// Navegación principal.
import React, { useState, useEffect } from 'react'; // Añadidos useState y useEffect
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native'; // Añadidos para la carga
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
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

const Stack = createNativeStackNavigator();

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    // Esta función mira si hay una sesión guardada.
    const verificarSesion = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.error("Error leyendo el token", e);
      } finally {
        setCargando(false);
      }
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
          name="Home"
          component={HomeScreen}
          options={{ title: 'FitHub Connect', headerBackVisible: false }}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}