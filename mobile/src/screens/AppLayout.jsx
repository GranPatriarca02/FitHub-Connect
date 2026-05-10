import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Platform, Modal, SafeAreaView,
    Image, StatusBar, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

// COLORES APP
export const theme = {
    bgPrimary: '#0b1120',
    bgPrimarySoft: '#111827',
    bgSecondarySoft: '#1f2937',
    borderDefault: '#374151',
    brand: '#3b82f6',
    brandSofter: 'rgba(59, 130, 246, 0.1)',
    textHeading: '#ffffff',
    textBody: '#9ca3af',
    textBrand: '#60a5fa',
    danger: '#ef4444',
};

export default function AppLayout({ children, title, navigation, extraNotifications = [] }) {
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
        if (profileMenuVisible) loadData();
    }, [profileMenuVisible]);

    // __ FUNCIÓN CERRAR SESIÓN __
    const handleLogout = async () => {
        try {
            setProfileMenuVisible(false);
            // Borramos lo que identifica a la sesión activa.
            const keysToRemove = ['userToken', 'loginTimestamp', 'userRole', 'userId', 'userName', 'userEmail'];
            await AsyncStorage.multiRemove(keysToRemove);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
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
        <View style={{ marginTop: 20 }}>
            <NavItem icon="grid-outline" label="Dashboard" active={title === 'Dashboard'} onPress={() => { setIsMenuOpen(false); navigation.navigate('Home'); }} />
            <NavItem icon="people-outline" label="Monitores" active={title === 'Monitores'} onPress={() => { setIsMenuOpen(false); navigation.navigate('MonitorList'); }} />
            <NavItem icon="barbell-outline" label="Rutinas" active={title === 'Rutinas'} onPress={() => { setIsMenuOpen(false); navigation.navigate('Routines'); }} />
            <NavItem icon="chatbubble-outline" label="Social" active={title === 'Social'} onPress={() => { setIsMenuOpen(false); navigation.navigate('Social'); }} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
            <StatusBar barStyle="light-content" backgroundColor={theme.bgPrimarySoft} />
            {Platform.OS === 'ios' && <SafeAreaView style={{ backgroundColor: theme.bgPrimarySoft }} />}

            {/* --- TOP NAVBAR --- */}
            <View style={{
                height: 60, backgroundColor: theme.bgPrimarySoft, borderBottomWidth: 1, borderColor: theme.borderDefault,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, zIndex: 1000
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!isWeb && (
                        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={{ padding: 5, marginRight: 10 }}>
                            <Ionicons name="menu" size={28} color="white" />
                        </TouchableOpacity>
                    )}
                    <Image source={{ uri: 'https://flowbite.com/docs/images/logo.svg' }} style={{ width: 28, height: 28, marginRight: 10 }} />
                    <Text style={{ color: 'white', fontSize: 19, fontWeight: 'bold' }}>FitHub</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                    {/* --- BOTÓN NOTIFICACIONES --- */}
                    <View style={{ position: 'relative' }}>
                        <TouchableOpacity onPress={() => setNotificationsVisible(!notificationsVisible)} style={{ padding: 5, marginRight: 15 }}>
                            <Ionicons name="notifications" size={24} color={theme.textBody} />
                            {allNotifications.length > 0 && (
                                <View style={{ position: 'absolute', top: 5, right: 17, width: 10, height: 10, backgroundColor: theme.danger, borderRadius: 5, borderWidth: 2, borderColor: theme.bgPrimarySoft }} />
                            )}
                        </TouchableOpacity>

                        {/* --- DROPDOWN NOTIFICACIONES --- */}
                        {notificationsVisible && (
                            <View style={{
                                position: 'absolute', top: 45, right: 0, width: 280,
                                backgroundColor: theme.bgSecondarySoft, borderRadius: 12,
                                borderWidth: 1, borderColor: theme.borderDefault, elevation: 20, zIndex: 2000,
                                maxHeight: 400, overflow: 'hidden'
                            }}>
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
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* --- BOTÓN PERFIL --- */}
                    <TouchableOpacity onPress={() => setProfileMenuVisible(true)}>
                        <Image source={{ uri: 'https://flowbite.com/docs/images/people/profile-picture-5.jpg' }} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: theme.borderDefault }} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1, flexDirection: 'row' }}>
                {isWeb && (
                    <View style={{ width: 260, backgroundColor: theme.bgPrimarySoft, borderRightWidth: 1, borderColor: theme.borderDefault, padding: 15 }}>
                        <SidebarLinks />
                    </View>
                )}
                <View style={{ flex: 1 }}>{children}</View>
            </View>

            {/* --- MODAL DROPDOWN PERFIL --- */}
            <Modal visible={profileMenuVisible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
                    <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 15 }}>
                        <TouchableWithoutFeedback>
                            <View style={{ width: 280, backgroundColor: '#1f2937', borderRadius: 8, borderWidth: 1, borderColor: theme.borderDefault, overflow: 'hidden', elevation: 25 }}>
                                <View style={{ padding: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', padding: 10, borderRadius: 6 }}>
                                        <Image source={{ uri: 'https://flowbite.com/docs/images/people/profile-picture-5.jpg' }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{userData.name}</Text>
                                            <Text style={{ color: '#9ca3af', fontSize: 12 }} numberOfLines={1}>{userData.email}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
                                    <DropdownLink
                                        icon="account-outline"
                                        label="Account"
                                        onPress={() => {
                                            setProfileMenuVisible(false);
                                            navigation.navigate('Account');
                                        }}
                                    />
                                    <DropdownLink
                                        icon="rocket-launch-outline"
                                        label="Upgrade to PRO"
                                        color={theme.brand}
                                        onPress={() => {
                                            setProfileMenuVisible(false);
                                            navigation.navigate('SubscriptionBenefits');
                                        }}
                                    />
                                    <View style={{ height: 1, backgroundColor: theme.borderDefault, marginVertical: 4 }} />
                                    <DropdownLink icon="logout" label="Sign out" color={theme.danger} onPress={handleLogout} />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* --- MENÚ MÓVIL --- */}
            <Modal visible={isMenuOpen} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimarySoft }}>
                    <View style={{ padding: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>FitHub</Text>
                            <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                                <Ionicons name="close" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                        <SidebarLinks />
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const DropdownLink = ({ icon, label, onPress, color = '#fff' }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 6 }}
    >
        <MaterialCommunityIcons
            name={icon}
            size={18}
            color={color === theme.danger ? theme.danger : (color === theme.brand ? theme.brand : '#9ca3af')}
        />
        <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: '500', color: color }}>{label}</Text>
    </TouchableOpacity>
);

const NavItem = ({ icon, label, active, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{
        flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 5,
        backgroundColor: active ? theme.brandSofter : 'transparent'
    }}>
        <Ionicons name={icon} size={22} color={active ? theme.brand : theme.textBody} />
        <Text style={{ color: active ? 'white' : theme.textBody, marginLeft: 15, fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
);