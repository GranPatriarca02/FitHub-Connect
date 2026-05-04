import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, ArrowRight, Chrome } from 'lucide-react-native';
import { MotiView } from 'moti';

export default function LoginScreen() {
    const isWeb = Platform.OS === 'web';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View className="flex-1 bg-fithub-black">
            <View className="flex-1 flex-row">

                {/* PANEL IZQUIERDO (Solo visible en Web / Pantallas grandes) */}
                {isWeb && (
                    <View className="hidden lg:flex flex-1 bg-fithub-gray relative">
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070' }}
                            className="absolute inset-0 w-full h-full opacity-40"
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', '#050505']}
                            className="absolute inset-0"
                        />
                        <View className="flex-1 justify-end p-20">
                            <MotiView
                                from={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 200 }}
                            >
                                <Text className="text-fithub-green text-7xl font-black italic tracking-tighter">FITHUB Connect</Text>
                                <Text className="text-white text-3xl font-light mt-4 max-w-md">
                                    Entrena con inteligencia. Conecta con tu comunidad.
                                </Text>
                            </MotiView>
                        </View>
                    </View>
                )}

                {/* PANEL DERECHO (Formulario) */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    className={`${isWeb ? 'w-full lg:w-[600px]' : 'w-full'}`}
                >
                    <View className="flex-1 justify-center p-8 md:p-16 lg:p-24">

                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 600 }}
                        >
                            {/* Logo en Móvil */}
                            {!isWeb && (
                                <Text className="text-fithub-green text-3xl font-black italic mb-10">FITHUB Connect</Text>
                            )}

                            <Text className="text-white text-4xl font-bold tracking-tight">Bienvenido</Text>
                            <Text className="text-gray-500 text-lg mt-2 mb-10">Ingresa tus credenciales para acceder.</Text>

                            <View className="space-y-5">
                                {/* Email */}
                                <View>
                                    <Text className="text-gray-400 text-[10px] uppercase tracking-[3px] mb-2 ml-1">Email</Text>
                                    <View className="flex-row items-center bg-fithub-gray border border-border-nocta rounded-2xl px-4 h-16 focus:border-fithub-green">
                                        <Mail color="#555" size={20} />
                                        <TextInput
                                            placeholder="ejemplo@fithub.com"
                                            placeholderTextColor="#444"
                                            className="flex-1 ml-3 text-white font-medium"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>
                                </View>

                                {/* Password */}
                                <View className="mt-4">
                                    <Text className="text-gray-400 text-[10px] uppercase tracking-[3px] mb-2 ml-1">Contraseña</Text>
                                    <View className="flex-row items-center bg-fithub-gray border border-border-nocta rounded-2xl px-4 h-16">
                                        <Lock color="#555" size={20} />
                                        <TextInput
                                            placeholder="••••••••"
                                            placeholderTextColor="#444"
                                            secureTextEntry
                                            className="flex-1 ml-3 text-white font-medium"
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                    </View>
                                </View>

                                {/* Botón Login */}
                                <TouchableOpacity className="mt-8 overflow-hidden rounded-2xl shadow-xl shadow-fithub-green/20">
                                    <LinearGradient
                                        colors={['#2ecc71', '#27ae60']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        className="h-16 flex-row justify-center items-center"
                                    >
                                        <Text className="text-white font-bold text-lg mr-2">Iniciar Sesión</Text>
                                        <ArrowRight color="white" size={20} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Separador */}
                                <View className="flex-row items-center my-8">
                                    <View className="flex-1 h-[1px] bg-border-nocta" />
                                    <Text className="text-gray-600 px-4 text-xs italic">O continúa con</Text>
                                    <View className="flex-1 h-[1px] bg-border-nocta" />
                                </View>

                                {/* Google Login (Look Pro) */}
                                <TouchableOpacity className="flex-row justify-center items-center h-16 border border-border-nocta rounded-2xl bg-transparent">
                                    <Chrome color="white" size={20} />
                                    <Text className="text-white font-semibold ml-3">Google</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity className="mt-10 items-center">
                                <Text className="text-gray-500">
                                    ¿No tienes cuenta? <Text className="text-fithub-green font-bold">Regístrate</Text>
                                </Text>
                            </TouchableOpacity>
                        </MotiView>

                    </View>
                </ScrollView>
            </View>
        </View>
    );
}