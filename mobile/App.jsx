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
        // Pequeño retraso.
        setTimeout(() => setCargando(false), 500);
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}