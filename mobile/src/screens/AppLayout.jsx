import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Platform, Modal, SafeAreaView,
    Image, StatusBar, ScrollView, TouchableWithoutFeedback, ImageBackground
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// IMPORTACIÓN DEL LOGO LOCAL
import LogoApp from '../../assets/FITHUB.png';

const isWeb = Platform.OS === 'web';

// COLORES APP
export const theme = {
    bgPrimary: '#000000',
    bgPrimarySoft: '#0a0a0a',
    bgSecondarySoft: '#121212',
    borderDefault: 'rgba(255,255,255,0.1)', // Más sutil
    brand: '#22c55e',
    brandSofter: 'rgba(34, 197, 94, 0.1)',
    textHeading: '#ffffff',
    textBody: '#9ca3af',
    textBrand: '#4ade80',
    danger: '#ef4444',
    cardBg: 'rgba(255,255,255,0.05)', // Para glassmorphism
};

// RANGOS PARA EL LINEAR GRADIENT DEL FONDO
const backgroundColors = ['#000000', 'rgba(34, 197, 94, 0.05)', '#000000'];

export default function AppLayout({ children, title, navigation, extraNotifications = [], useHeroPattern = false, showBackButton = false, headerRight = null }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);
    const [userData, setUserData] = useState({ name: 'Usuario', email: '', role: 'FREE' });

    // Cargar datos rápidos para el dropdown
    useEffect(() => {
        const loadData = async () => {
            try {
                const name = await AsyncStorage.getItem('userName');
                const email = await AsyncStorage.getItem('userEmail');
                const role = await AsyncStorage.getItem('userRole');
                setUserData({
                    name: name || 'Atleta',
                    email: email || '',
                    role: role || 'FREE'
                });
            } catch (e) {
                console.error("Error cargando datos en Layout", e);
            }
        };
        loadData();
    }, [profileMenuVisible]);

    // __ FUNCIÓN CERRAR SESIÓN __
    const handleLogout = async () => {
        try {
            setProfileMenuVisible(false);
            const keysToRemove = ['userToken', 'loginTimestamp', 'userRole', 'userId', 'userName', 'userEmail'];
            await AsyncStorage.multiRemove(keysToRemove);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    const closeAllMenus = () => {
        setNotificationsVisible(false);
        setProfileMenuVisible(false);
    };

    const allNotifications = [
        ...extraNotifications,
        {
            id: 'fijo-1',
            user: 'Omar Remolacha',
            message: "Toca tirar pa lante hermano",
            time: 'Hace un momento',
            icon: 'email',
            color: theme.textBrand
        }
    ];

    const SidebarLinks = () => (
        <View style={{ marginTop: 2 }}>
            <NavItem
                icon="home-outline"
                label="Inicio"
                subLabel="Pantalla principal"
                active={title === 'Dashboard'}
                onPress={() => { setIsMenuOpen(false); navigation.navigate('Home'); }}
            />
            <NavItem
                icon={userData.role === 'TRAINER' ? 'calendar-outline' : 'people-outline'}
                label={userData.role === 'TRAINER' ? 'Mi Disponibilidad' : 'Monitores'}
                subLabel={userData.role === 'TRAINER' ? 'Gestiona tu agenda' : 'Busca entrenadores'}
                active={title === 'Monitores' || title === 'Mi Disponibilidad'}
                onPress={() => {
                    setIsMenuOpen(false);
                    navigation.navigate(userData.role === 'TRAINER' ? 'TrainerAvailability' : 'MonitorList');
                }}
            />
            <NavItem
                icon="barbell-outline"
                label="Rutinas"
                subLabel="Tus planes de entrenamiento"
                active={title === 'Rutinas'}
                onPress={() => { setIsMenuOpen(false); navigation.navigate('Routines'); }}
            />
            <NavItem
                icon="chatbubbles-outline"
                label="Comunidad"
                subLabel="Explora el contenido social"
                active={title === 'Comunidad'}
                onPress={() => { setIsMenuOpen(false); navigation.navigate('Social'); }}
            />
            <NavItem
                icon="play-circle-outline"
                label="Vídeos"
                subLabel="Aprende técnicas nuevas"
                active={title === 'Vídeos'}
                onPress={() => { setIsMenuOpen(false); navigation.navigate('Videos'); }}
            />
        </View>
    );

    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* --- TOP NAVBAR --- */}
            <View style={{
                paddingTop: insets.top,
                backgroundColor: theme.bgPrimarySoft, borderBottomWidth: 1, borderColor: theme.borderDefault,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, zIndex: 1000
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 60 }}>
                    {!isWeb && (

                        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={{ padding: 5, marginRight: 10 }}>
                            <Ionicons name="menu" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Image
                            source={LogoApp}
                            style={{ width: 128, height: 128, marginRight: 10, borderRadius: 6 }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ position: 'relative' }}>
                        <TouchableOpacity onPress={() => { setProfileMenuVisible(false); setNotificationsVisible(!notificationsVisible); }} style={{ padding: 5, marginRight: 15 }}>
                            <Ionicons name="notifications" size={24} color={theme.textBody} />
                            {allNotifications.length > 0 && (
                                <View style={{ position: 'absolute', top: 5, right: 17, width: 10, height: 10, backgroundColor: theme.danger, borderRadius: 5, borderWidth: 2, borderColor: theme.bgPrimarySoft }} />
                            )}
                        </TouchableOpacity>
                        {notificationsVisible && (
                            <View style={{ position: 'absolute', top: 45, right: 0, width: 280, backgroundColor: theme.bgSecondarySoft, borderRadius: 12, borderWidth: 1, borderColor: theme.borderDefault, elevation: 20, zIndex: 3000, maxHeight: 400, overflow: 'hidden' }}>
                                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.borderDefault }}>
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Notificaciones ({allNotifications.length})</Text>
                                </View>
                                <ScrollView style={{ maxHeight: 340 }}>
                                    {allNotifications.map((item) => (
                                        <View key={item.id} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.borderDefault }}>
                                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name={item.icon} size={18} color={item.color || theme.textBrand} />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{item.user}</Text>
                                                <Text style={{ color: theme.textBody, fontSize: 11, marginTop: 2 }}>{item.message}</Text>
                                                <Text style={{ color: theme.textBrand, fontSize: 10, marginTop: 6, fontWeight: '500' }}>{item.time}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity 
                        onPress={() => { setNotificationsVisible(false); setProfileMenuVisible(true); }}
                        style={{ position: 'relative' }}
                    >
                        <View style={{
                            padding: 2,
                            borderRadius: 20,
                            backgroundColor: userData.role === 'PREMIUM' ? '#FFD700' : (userData.role === 'TRAINER' ? theme.brand : 'transparent'),
                            shadowColor: userData.role === 'PREMIUM' ? '#FFD700' : theme.brand,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: (userData.role === 'PREMIUM' || userData.role === 'TRAINER') ? 0.5 : 0,
                            shadowRadius: 6,
                        }}>
                            <Image 
                                source={{ uri: 'https://flowbite.com/docs/images/people/profile-picture-5.jpg' }} 
                                style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.bgPrimarySoft }} 
                            />
                        </View>
                        {(userData.role === 'PREMIUM' || userData.role === 'TRAINER') && (
                            <View style={{ 
                                position: 'absolute', bottom: -1, right: -1, 
                                backgroundColor: userData.role === 'PREMIUM' ? '#FFD700' : theme.brand,
                                borderRadius: 10, width: 14, height: 14,
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: 1.5, borderColor: theme.bgPrimarySoft
                            }}>
                                <MaterialCommunityIcons 
                                    name={userData.role === 'PREMIUM' ? "star" : "dumbbell"} 
                                    size={8} color="#000" 
                                />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <View style={{ flex: 1, flexDirection: 'row', overflow: 'hidden' }}>
                {isWeb && (
                    <View style={{ width: 260, backgroundColor: theme.bgPrimarySoft, borderRightWidth: 1, borderColor: theme.borderDefault, padding: 15 }}>
                        <SidebarLinks />
                    </View>
                )}

                <TouchableWithoutFeedback onPress={closeAllMenus}>
                    <LinearGradient colors={backgroundColors} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                        {useHeroPattern ? (
                            <ImageBackground
                                source={{ uri: 'https://flowbite.s3.amazonaws.com/docs/jumbotron/hero-pattern.svg' }}
                                style={{ flex: 1 }}
                                imageStyle={{ opacity: 0.1, tintColor: theme.brand }}
                                resizeMode="repeat"
                            >
                                {/* Sub-header con back + título */}
                                {showBackButton && title && (
                                    <View style={subHeaderStyle}>
                                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
                                            <Ionicons name="arrow-back" size={24} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={subHeaderTitleStyle}>{title}</Text>
                                        <View style={{ minWidth: 36 }}>{headerRight || null}</View>
                                    </View>
                                )}
                                {children}
                            </ImageBackground>
                        ) : (
                            <>
                                {/* Sub-header con back + título */}
                                {showBackButton && title && (
                                    <View style={subHeaderStyle}>
                                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
                                            <Ionicons name="arrow-back" size={24} color="#fff" />
                                        </TouchableOpacity>
                                        <Text style={subHeaderTitleStyle}>{title}</Text>
                                        <View style={{ minWidth: 36 }}>{headerRight || null}</View>
                                    </View>
                                )}
                                {children}
                            </>
                        )}
                    </LinearGradient>
                </TouchableWithoutFeedback>
            </View>

            {/* --- MODAL NAVEGACIÓN MÓVIL --- */}
            <Modal visible={isMenuOpen} animationType="fade" transparent={false}>
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimarySoft }}>
                    <View style={{ padding: 20, flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Image
                                    source={LogoApp}
                                    style={{ width: 32, height: 32, marginRight: 10, borderRadius: 6 }}
                                    resizeMode="contain"
                                />
                                <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>FitHub</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={{ padding: 5 }}>
                                <Ionicons name="close" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                        <SidebarLinks />
                    </View>
                </SafeAreaView>
            </Modal>

            {/* --- MODAL PERFIL --- */}
            <Modal visible={profileMenuVisible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
                    <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 15 }}>
                        <TouchableWithoutFeedback>
                            <View style={{ width: 280, backgroundColor: theme.bgSecondarySoft, borderRadius: 8, borderWidth: 1, borderColor: theme.borderDefault, overflow: 'hidden', elevation: 25 }}>
                                <View style={{ padding: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.borderDefault, padding: 10, borderRadius: 6 }}>
                                        <Image source={{ uri: 'https://flowbite.com/docs/images/people/profile-picture-5.jpg' }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{userData.name}</Text>
                                            <Text style={{ color: '#9ca3af', fontSize: 12 }} numberOfLines={1}>{userData.email}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
                                    <DropdownLink icon="account-outline" label="Mi cuenta" onPress={() => { setProfileMenuVisible(false); navigation.navigate('Account'); }} />
                                    {userData.role !== 'PREMIUM' && userData.role !== 'TRAINER' && (
                                        <DropdownLink icon="rocket-launch-outline" label="Hazte Premium" color={theme.brand} onPress={() => { setProfileMenuVisible(false); navigation.navigate('SubscriptionBenefits'); }} />
                                    )}
                                    <View style={{ height: 1, backgroundColor: theme.borderDefault, marginVertical: 4 }} />
                                    <DropdownLink icon="logout" label="Cerrar sesión" color={theme.danger} onPress={handleLogout} />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const DropdownLink = ({ icon, label, onPress, color = '#fff' }) => (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 6 }}>
        <MaterialCommunityIcons name={icon} size={18} color={color === theme.danger ? theme.danger : (color === theme.brand ? theme.brand : '#9ca3af')} />
        <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: '500', color: color }}>{label}</Text>
    </TouchableOpacity>
);

const NavItem = ({ icon, label, subLabel, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{
        flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 15,
        backgroundColor: active ? theme.brandSofter : 'transparent'
    }}>
        <View style={{
            width: 44, height: 44, borderRadius: 10,
            backgroundColor: active ? theme.brand : theme.bgSecondarySoft,
            justifyContent: 'center', alignItems: 'center'
        }}>
            <Ionicons name={icon} size={24} color={active ? 'white' : theme.textBrand} />
        </View>
        <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ color: active ? 'white' : theme.textHeading, fontSize: 17, fontWeight: '700' }}>{label}</Text>
            <Text style={{ color: theme.textBody, fontSize: 14, marginTop: 2 }}>{subLabel}</Text>
        </View>
    </TouchableOpacity>
);

// Estilos para el sub-header con botón de retroceso (igual que en SocialScreen)
const subHeaderStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderDefault,
    backgroundColor: theme.bgPrimarySoft,
};

const subHeaderTitleStyle = {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
};
