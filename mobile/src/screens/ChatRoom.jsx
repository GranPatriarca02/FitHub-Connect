import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AppLayout, { theme } from './AppLayout';
import { getChatHistory, getMyContacts, markChatAsRead } from '../api';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

const ChatRoom = ({ route, navigation }) => {
    const { trainerId, trainerName } = route.params || {};
    const [userData, setUserData] = useState(null);
    const [activeChat, setActiveChat] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingContacts, setLoadingContacts] = useState(true);

    const socket = useRef(null);
    const scrollRef = useRef(null);
    const isWeb = Platform.OS === 'web';

    // REFERENCIAS
    const activeChatRef = useRef(null);
    const userDataRef = useRef(null);
    const isMountedRef = useRef(true);
    const reconnectTimeoutRef = useRef(null);
    const isConnectingRef = useRef(false);

    // NORMALIZADOR DE MENSAJES
    const normalizeMsg = useCallback((m) => {
        if (!m) return null;
        let textContent = m.content || m.text || (m.body && typeof m.body === 'string' ? m.body : "");

        if (!textContent && m.message && !m.receiverId && !m.receiver_id) {
            textContent = m.message;
        }

        if (textContent === "Mensaje enviado exitosamente" || !textContent || !textContent.trim()) {
            return null;
        }

        const rawSenderId = m.senderId ?? m.sender_id;
        const sId = rawSenderId != null ? Number(rawSenderId) : null;
        const rawReceiverId = m.receiverId ?? m.receiver_id;
        const rId = rawReceiverId != null ? Number(rawReceiverId) : null;

        const rawDate = m.createdAt ?? m.created_at ?? m.timestamp;
        const ts = rawDate != null ? (isNaN(rawDate) ? rawDate : Number(rawDate)) : Date.now();
        const dateObj = new Date(ts);

        return {
            id: m.id != null ? String(m.id) : `temp-${Date.now()}-${Math.random()}`,
            sender_id: sId,
            receiver_id: rId,
            text: textContent.trim(),
            time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: (m.isRead || m.is_read || m.status === 'read') ? 'read' : 'sent',
            timestamp: dateObj.getTime()
        };
    }, []);

    const sortMessages = (list) => {
        return [...list].sort((a, b) => a.timestamp - b.timestamp);
    };

    // SELECCIONAR CONTACTO
    const handleSelectContact = useCallback(async (contact, myId) => {
        const currentId = myId || userDataRef.current?.id;
        if (!currentId) return;

        const targetContact = {
            ...contact,
            id: Number(contact.id)
        };

        // ACTUALIZACIÓN DE ESTADO Y REFERENCIA
        setActiveChat(targetContact);
        activeChatRef.current = targetContact;

        // Limpiar visualmente el contador de no leídos
        setContacts(prev => prev.map(c =>
            Number(c.id) === targetContact.id
                ? { ...c, hasUnread: false, unreadCount: 0 }
                : c
        ));

        setLoadingMessages(true);

        try {
            // Avisar al servidor (API)
            await markChatAsRead(currentId, targetContact.id);

            // Avisar al socket
            if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(JSON.stringify({
                    type: 'READ_EVENT',
                    senderId: targetContact.id
                }));
            }

            const history = await getChatHistory(currentId, targetContact.id);
            const adaptedMessages = history
                .map(m => normalizeMsg(m))
                .filter(m => m !== null);

            setMessages(sortMessages(adaptedMessages));

        } catch (error) {
            console.error("Error al seleccionar contacto:", error);
        } finally {
            setLoadingMessages(false);
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollToEnd({ animated: false });
                }
            }, 150);
        }
    }, [normalizeMsg]);

    // CONEXIÓN WEBSOCKET
    const connectWS = useCallback((myId) => {
        if (!WS_URL || !myId) return;

        // Evitar múltiples conexiones simultáneas
        if (isConnectingRef.current) {
            return;
        }

        isConnectingRef.current = true;

        // Limpiar reconnect pendiente
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Limpiar socket anterior
        if (socket.current) {
            socket.current.onclose = null;
            socket.current.onerror = null;
            socket.current.close();
        }

        const ws = new WebSocket(`${WS_URL}/chat/${myId}`);
        socket.current = ws;

        ws.onopen = () => {
            isConnectingRef.current = false;
            console.log("WebSocket conectado");

            // Si el usuario ya tenía un chat abierto al reconectar, mandamos lectura
            if (activeChatRef.current) {
                ws.send(JSON.stringify({
                    type: 'READ_EVENT',
                    senderId: activeChatRef.current.id
                }));
            }

            const hb = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
            }, 15000);
            ws.heartbeat = hb;
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            const myCurrentId = userDataRef.current?.id; // Usar ref para el ID propio

            // CAMBIO DE ESTADO (ONLINE/OFFLINE)
            if (data.type === 'USER_STATUS_CHANGE') {
                const tId = Number(data.userId);
                const isOn = Boolean(data.isOnline);

                setContacts(prev => prev.map(c =>
                    Number(c.id) === tId ? { ...c, isOnline: isOn } : c
                ));

                if (activeChatRef.current?.id === tId) {
                    setActiveChat(prev => prev ? { ...prev, isOnline: isOn } : null);
                }
                return;
            }

            // DOBLE CHECK (CONFIRMACIÓN DE LECTURA)
            if (data.type === 'READ_CONFIRMATION') {
                const rId = Number(data.readerId); // Quién leyó
                setMessages(prev => prev.map(m => {
                    // Si el que leyó es el receptor de mis mensajes, se ponen en 'read'
                    if (Number(m.receiver_id) === rId) {
                        return { ...m, status: 'read' };
                    }
                    return m;
                }));
                return;
            }

            // FLUJO DE MENSAJES
            if (data.type === 'MESSAGE') {
                const sId = Number(data.senderId);
                const rId = Number(data.receiverId);
                const isMe = sId === myCurrentId;
                const contactId = isMe ? rId : sId;

                // 1. Actualizar Sidebar
                setContacts(prev => prev.map(c => {
                    if (Number(c.id) === contactId) {
                        const isNotActive = activeChatRef.current?.id !== contactId;
                        return {
                            ...c,
                            hasUnread: isNotActive,
                            unreadCount: (isNotActive && !isMe) ? (c.unreadCount || 0) + 1 : 0
                        };
                    }
                    return c;
                }));

                // 2. Pintar en el chat SOLO si coincide con el chat abierto
                if (Number(activeChatRef.current?.id) === Number(contactId)) {
                    const newMsg = normalizeMsg(data);
                    if (!newMsg) return;
                    // Si el receptor tiene el chat abierto marcamos como leído e informamos al servidor.
                    if (!isMe) {
                        newMsg.status = 'read';
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'READ_EVENT', senderId: sId }));
                        }
                    }

                    setMessages(prev => {
                        // Anti-duplicado por ID real
                        if (prev.some(m => String(m.id) === String(newMsg.id))) return prev;

                        // Si es mi mensaje, reemplazar el temporal
                        if (isMe) {
                            const tempIdx = prev.findLastIndex(m =>
                                String(m.id).startsWith('temp-') && m.text.trim() === newMsg.text.trim()
                            );
                            if (tempIdx !== -1) {
                                const copy = [...prev];
                                copy[tempIdx] = newMsg;
                                return copy;
                            }
                        }
                        return sortMessages([...prev, newMsg]);
                    });
                }
            }
        };

        ws.onclose = () => {
            isConnectingRef.current = false;

            if (ws.heartbeat) {
                clearInterval(ws.heartbeat);
            }

            if (isMountedRef.current) {
                console.log("🔄 Reconectando WS...");

                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWS(myId);
                }, 3000);
            }
        };

        ws.onerror = (err) => {
            console.log("⚠️ Error WS:", err);
            ws.close();
        };
    }, [normalizeMsg]);

    // INICIALIZAR CHAT
    useEffect(() => {
        isMountedRef.current = true;

        const initChat = async () => {
            const id = await AsyncStorage.getItem('userId');
            const role = await AsyncStorage.getItem('userRole');

            if (!id || !isMountedRef.current) return;

            const numericId = parseInt(id);
            const userObj = { id: numericId, role: role };

            // 1. Seteamos datos de usuario en estado y referencia
            setUserData(userObj);
            userDataRef.current = userObj;

            // 2. Conectamos el WebSocket
            connectWS(numericId);

            setLoadingContacts(true);
            try {
                // 3. Cargamos la lista de contactos
                const list = await getMyContacts(numericId);
                if (!isMountedRef.current) return;

                setContacts(list.map(c => ({
                    ...c,
                    id: Number(c.id),
                    isOnline: c.isOnline || false,
                    hasUnread: (c.unreadCount && c.unreadCount > 0) || c.hasUnread || false
                })));

                // 4. SI VENIMOS DE OTRA PANTALLA CON UN TRAINER ESPECÍFICO:
                if (trainerId) {
                    handleSelectContact({ id: Number(trainerId), name: trainerName }, numericId);

                    // Intentamos marcar como leído, pero solo si el socket se abre
                    const checkAndSend = () => {
                        if (socket.current?.readyState === WebSocket.OPEN) {
                            socket.current.send(JSON.stringify({
                                type: 'READ_EVENT',
                                senderId: Number(trainerId)
                            }));
                        } else if (socket.current?.readyState === WebSocket.CONNECTING) {
                            // Si aún está conectando, esperamos un poco más
                            setTimeout(checkAndSend, 500);
                        }
                    };
                    setTimeout(checkAndSend, 1000);
                }
            } catch (error) {
                console.error("Error inicializando chat:", error);
            } finally {
                if (isMountedRef.current) setLoadingContacts(false);
            }
        };

        initChat();

        return () => {
            isMountedRef.current = false;
            activeChatRef.current = null;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            if (socket.current) {
                socket.current.onclose = null;
                socket.current.close();
            }
        };
    }, [trainerId, trainerName, connectWS, handleSelectContact]);

    // ENVIAR MENSAJE
    const handleSendMessage = () => {
        if (!newMessage.trim() || !activeChat || !userData) return;

        const textToSend = newMessage.trim();
        const sentAt = Date.now();
        const tempId = `temp-${sentAt}`;

        const localMsg = {
            id: tempId,
            sender_id: userData.id,
            receiver_id: activeChat.id,
            text: textToSend,
            time: new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            timestamp: sentAt
        };

        setMessages(prev => sortMessages([...prev, localMsg]));
        setNewMessage('');

        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify({
                type: 'SEND_MESSAGE',
                receiverId: activeChat.id,
                content: textToSend
            }));
        } else {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        }
    };

    const handleKeyPress = (e) => {
        if (isWeb && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!userData) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

    return (
        <AppLayout title="Mensajes" navigation={navigation}>
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#000', padding: isWeb ? 10 : 0 }}>
                {/* --- SIDEBAR DE CHATS --- */}
                {(isWeb || (!isWeb && !activeChat)) && (
                    <View style={{
                        width: isWeb ? 320 : '100%',
                        backgroundColor: theme.bgSecondarySoft,
                        borderRadius: isWeb ? 24 : 0,
                        marginRight: isWeb ? 15 : 0,
                        padding: 15,
                        borderWidth: isWeb ? 1 : 0,
                        borderColor: theme.borderDefault
                    }}>
                        <Text style={{ color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 20 }}>Chats</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {loadingContacts ? (
                                <ActivityIndicator color={theme.brand} />
                            ) : (
                                contacts.map((contact) => (
                                    <ContactItem
                                        key={contact.id}
                                        contact={contact}
                                        isActive={activeChat?.id === contact.id}
                                        onPress={handleSelectContact}
                                    />
                                ))
                            )}
                        </ScrollView>
                    </View>
                )}

                {/* --- VENTANA DE CHAT ACTIVO --- */}
                {(isWeb || (!isWeb && activeChat)) && (
                    <View style={{
                        flex: 1,
                        backgroundColor: theme.bgSecondarySoft,
                        borderRadius: isWeb ? 24 : 0,
                        overflow: 'hidden',
                        borderWidth: isWeb ? 1 : 0,
                        borderColor: theme.borderDefault
                    }}>
                        {activeChat ? (
                            <KeyboardAvoidingView
                                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                style={{ flex: 1 }}
                                keyboardVerticalOffset={isWeb ? 0 : 90}
                            >
                                <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.borderDefault, flexDirection: 'row', alignItems: 'center' }}>
                                    {!isWeb && (
                                        <TouchableOpacity onPress={() => {
                                            setActiveChat(null);
                                            activeChatRef.current = null;
                                        }} style={{ marginRight: 15 }}>
                                            <Ionicons name="arrow-back" size={24} color="white" />
                                        </TouchableOpacity>
                                    )}
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.brand, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', color: '#000' }}>{activeChat.name ? activeChat.name.charAt(0) : 'U'}</Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{activeChat.name}</Text>
                                        <Text style={{ color: activeChat.isOnline ? theme.brand : '#666', fontSize: 12 }}>
                                            {activeChat.isOnline ? 'Online' : 'Offline'}
                                        </Text>
                                    </View>
                                </View>

                                <ScrollView
                                    ref={scrollRef}
                                    contentContainerStyle={{ padding: 20 }}
                                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                >
                                    {loadingMessages ? (
                                        <ActivityIndicator color={theme.brand} />
                                    ) : (
                                        messages.map((msg) => {
                                            const isMine = Number(msg.sender_id) === Number(userData.id);
                                            const failed = msg.status === 'failed';
                                            return (
                                                <View key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', marginBottom: 15, maxWidth: '80%' }}>
                                                    <View style={{
                                                        backgroundColor: failed ? '#5a1a1a' : (isMine ? theme.brand : 'rgba(255,255,255,0.1)'),
                                                        padding: 12,
                                                        borderRadius: 15
                                                    }}>
                                                        <Text style={{ color: isMine && !failed ? '#000' : 'white', fontSize: 14 }}>{msg.text}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: 4 }}>
                                                        <Text style={{ color: '#666', fontSize: 10 }}>{msg.time}</Text>
                                                        {isMine && (
                                                            failed
                                                                ? <Ionicons name="alert-circle" size={16} color="#FF3B30" style={{ marginLeft: 4 }} />
                                                                : <Ionicons name={msg.status === 'read' ? "checkmark-done" : "checkmark"} size={16} color={msg.status === 'read' ? "#40E0D0" : "#666"} style={{ marginLeft: 4 }} />
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>

                                <View style={{ padding: 20 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: theme.borderDefault }}>
                                        <TextInput
                                            style={{ flex: 1, padding: 12, outlineStyle: 'none', color: '#FFF' }}
                                            placeholder="Escribe un mensaje..."
                                            placeholderTextColor="#666"
                                            value={newMessage}
                                            onChangeText={setNewMessage}
                                            onKeyPress={handleKeyPress}
                                            onSubmitEditing={handleSendMessage}
                                        />
                                        <TouchableOpacity onPress={handleSendMessage}>
                                            <Ionicons name="send" size={18} color="black" style={{ backgroundColor: theme.brand, padding: 8, borderRadius: 10 }} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#333" />
                                <Text style={{ color: '#666', marginTop: 10 }}>Selecciona un chat para empezar</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </AppLayout>
    );
};

// --- COMPONENTE DE ITEM DE CONTACTO ---
const ContactItem = memo(({ contact, isActive, onPress }) => {
    const { name, role, hasUnread, isOnline } = contact;
    return (
        <TouchableOpacity
            onPress={() => onPress(contact)}
            style={{
                flexDirection: 'row',
                padding: 15,
                backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 15,
                marginBottom: 5,
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 45, height: 45, borderRadius: 12, backgroundColor: '#333', marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{name ? name.charAt(0) : 'U'}</Text>
                    <View style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: isOnline ? theme.brand : '#555',
                        borderWidth: 2,
                        borderColor: theme.bgSecondarySoft
                    }} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{name}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>{role}</Text>
                </View>
            </View>
            {hasUnread && !isActive && (
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30', marginLeft: 10 }} />
            )}
        </TouchableOpacity>
    );
});

ContactItem.displayName = 'ContactItem';

export default ChatRoom;