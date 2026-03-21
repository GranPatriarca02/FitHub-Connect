// Punto de entrada de la app con la navegacion principal
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MonitorListScreen from './src/screens/MonitorListScreen';
import MonitorDetailScreen from './src/screens/MonitorDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Login"
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
