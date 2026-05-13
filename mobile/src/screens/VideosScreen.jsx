import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Linking, Platform, Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

// Extrae el thumbnail de YouTube si la URL es de YT
const getYoutubeThumbnail = (url) => {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

export default function VideosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userRole, setUserRole] = useState('FREE');
  const [userId, setUserId] = useState(null);

  const [videos, setVideos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Campos del modal de publicar video
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [esPremium, setEsPremium] = useState(true);

  // Modal confirmación borrado
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [videoParaBorrar, setVideoParaBorrar] = useState(null);

  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const role = await AsyncStorage.getItem('userRole') || 'FREE';
          const uid = await AsyncStorage.getItem('userId');
          setUserRole(role);
          setUserId(uid);

          const endpoint = role === 'TRAINER' ? '/videos/my' : '/videos';
          const headers = { 'X-User-Role': role };
          if (uid) headers['X-User-Id'] = uid;

          const res = await fetch(`${API_URL}${endpoint}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setVideos(data);
          }

          if (uid && role !== 'TRAINER') {
            const subsRes = await fetch(`${API_URL}/subscriptions/user/${uid}`);
            if (subsRes.ok) {
              const subsData = await subsRes.json();
              setHasActiveSubscription(Array.isArray(subsData) && subsData.length > 0);
            }
          }
        } catch (e) {
          Alert.alert('Error', 'No se pudieron cargar los videos');
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [])
  );

  const isTrainer = userRole === 'TRAINER';

  const handleAbrirVideo = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el video')
    );
  };

  const handlePublicar = async () => {
    if (!nuevoTitulo.trim() || !nuevaUrl.trim()) {
      Alert.alert('Campos obligatorios', 'El título y la URL son necesarios');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
          'X-User-Role': userRole,
        },
        body: JSON.stringify({
          title: nuevoTitulo.trim(),
          description: nuevaDesc.trim() || null,
          videoUrl: nuevaUrl.trim(),
          isPremium: esPremium,
        }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al publicar el video');
      }

      setModalVisible(false);
      setNuevoTitulo('');
      setNuevaDesc('');
      setNuevaUrl('');

      // Recargar lista
      const res2 = await fetch(`${API_URL}/videos/my`, {
        headers: { 'X-User-Id': userId, 'X-User-Role': 'TRAINER' },
      });
      if (res2.ok) setVideos(await res2.json());

      Alert.alert('¡Publicado!', 'Tu video ya está disponible para los usuarios Premium.');
    } catch (e) {
      Alert.alert('Error al publicar', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (video) => {
    setVideoParaBorrar(video);
    setDeleteModalVisible(true);
  };

  const confirmarBorradoReal = async () => {
    if (!videoParaBorrar) return;
    const videoId = videoParaBorrar.id;
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId || '' },
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No tienes permiso o el video no existe');
      }

      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      setDeleteModalVisible(false);
      setVideoParaBorrar(null);
      // Opcional: toast o alerta de éxito
    } catch (e) {
      if (Platform.OS === 'web') alert(e.message || 'No se pudo eliminar el video');
      else Alert.alert('Error', e.message || 'No se pudo eliminar el video');
    } finally {
      setGuardando(false);
    }
  };

  // -------- RENDER TARJETA DE VIDEO --------
  const VideoCard = ({ video, showDelete = false }) => {
    const thumb = video.thumbnailUrl || getYoutubeThumbnail(video.videoUrl);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => handleAbrirVideo(video.videoUrl)}
          activeOpacity={0.85}
        >
          {/* Miniatura */}
          <View style={styles.thumbnailContainer}>
            {thumb ? (
              <View style={styles.thumbnailPlaceholder}>
                <LinearGradient
                  colors={[theme.brandSofter, theme.bgSecondarySoft]}
                  style={styles.thumbGradient}
                >
                  <MaterialCommunityIcons name="play-circle" size={44} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              </View>
            ) : (
              <LinearGradient
                colors={[theme.bgSecondarySoft, theme.bgPrimary]}
                style={styles.thumbGradient}
              >
                <MaterialCommunityIcons name="play-circle" size={44} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            )}
            {/* Badge GRATIS / PREMIUM */}
            <View style={[styles.badge, video.isPremium ? styles.badgePremium : styles.badgeFree]}>
              <Text style={styles.badgeText}>{video.isPremium ? 'PREMIUM' : 'GRATIS'}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text>
            {video.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>{video.description}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Footer con acciones (Fuera del touchable principal) */}
        <View style={[styles.cardBody, { paddingTop: 0 }]}>
          <View style={styles.cardFooter}>
            <View style={styles.trainerTag}>
              <MaterialCommunityIcons
                name={video.trainerName ? 'dumbbell' : 'shield-check'}
                size={13}
                color={video.trainerName ? '#4FC3F7' : '#4CAF50'}
              />
              <Text style={[styles.trainerName, !video.trainerName && { color: '#4CAF50' }]}>
                {video.trainerName || 'FitHub Official'}
              </Text>
            </View>
            {showDelete && (
              <Pressable 
                onPress={() => handleEliminar(video)} 
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && { opacity: 0.7, scale: 0.95 }
                ]}
                hitSlop={15}
              >
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
              </Pressable>
            )}
            <TouchableOpacity 
              onPress={() => handleAbrirVideo(video.videoUrl)}
              style={styles.playHint}
            >
              <Ionicons name="play" size={13} color="#4CAF50" />
              <Text style={styles.playHintText}>Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // -------- RENDER VISTA UNIFICADA --------
  const videosGratis = videos.filter((v) => !v.isPremium);
  const videosPremium = videos.filter((v) => v.isPremium);
  const misVideos = isTrainer ? videos : []; // Para el entrenador, la API ya devuelve solo los suyos

  return (
    <AppLayout title="Vídeos" navigation={navigation} showBackButton={true}>
      <ScrollView
        contentContainerStyle={[styles.container]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons 
              name={isTrainer ? "video-plus" : "play-box-multiple"} 
              size={26} 
              color={isTrainer ? "#4FC3F7" : "#4CAF50"} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{isTrainer ? 'Panel de Videos' : 'Videos'}</Text>
            <Text style={styles.pageSub}>
              {isTrainer ? 'Gestiona tu contenido y mira la galería' : (hasActiveSubscription ? 'Tus vídeos de entrenadores y contenido gratuito' : 'Contenido gratuito de FitHub')}
            </Text>
          </View>
          {isTrainer && (
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.publishBtnText}>Publicar</Text>
            </TouchableOpacity>
          )}
        </View>

        {cargando ? (
          <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* VISTA PARA ENTRENADORES: Solo sus propios videos */}
            {isTrainer ? (
              <>
                <Text style={styles.sectionLabel}>Mis Publicaciones</Text>
                {misVideos.length === 0 ? (
                  <View style={styles.emptyPersonal}>
                    <Text style={styles.noContent}>Aún no has publicado ningún video.</Text>
                    <Text style={styles.pageSub}>Usa el botón "Publicar" para añadir contenido.</Text>
                  </View>
                ) : (
                  misVideos.map((v) => <VideoCard key={v.id} video={v} showDelete={true} />)
                )}
              </>
            ) : (
              /* VISTA PARA USUARIOS (FREE/PREMIUM) */
              <>
                {/* Sección GRATIS */}
                <Text style={styles.sectionLabel}>Contenido Gratuito</Text>
                {videosGratis.length === 0 ? (
                  <Text style={styles.noContent}>No hay videos gratuitos disponibles.</Text>
                ) : (
                  videosGratis.map((v) => <VideoCard key={v.id} video={v} />)
                )}

                {/* Sección PREMIUM */}
                <View style={styles.premiumSectionHeader}>
                  <Text style={styles.sectionLabel}>Videos de tus entrenadores</Text>
                  {hasActiveSubscription && (
                    <View style={styles.unlockedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.brand} />
                      <Text style={styles.unlockedText}>Suscrito</Text>
                    </View>
                  )}
                </View>

                {videosPremium.length > 0 ? (
                  videosPremium.map((v) => <VideoCard key={v.id} video={v} />)
                ) : hasActiveSubscription ? (
                  <Text style={styles.noContent}>Tus entrenadores aún no han publicado videos premium.</Text>
                ) : (
                  /* Sección bloqueada para FREE sin suscripciones */
                  <TouchableOpacity
                    style={styles.lockedSection}
                    onPress={() => navigation.navigate('SubscriptionBenefits')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#1a1200', '#2a1f00']} style={styles.lockedGradient}>
                      <View style={styles.lockIconWrap}>
                        <Ionicons name="lock-closed" size={32} color="#FFD700" />
                      </View>
                      <Text style={styles.lockedTitle}>Apoya a un entrenador</Text>
                      <Text style={styles.lockedDesc}>
                        Suscríbete a uno de nuestros entrenadores para desbloquear todos sus videos y rutinas exclusivas.
                      </Text>
                      <View style={styles.lockedBtn}>
                        <Text style={styles.lockedBtnText}>Ver entrenadores</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <PublishModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        titulo={nuevoTitulo}
        setTitulo={setNuevoTitulo}
        desc={nuevaDesc}
        setDesc={setNuevaDesc}
        url={nuevaUrl}
        setUrl={setNuevaUrl}
        esPremium={esPremium}
        setEsPremium={setEsPremium}
        onPublish={handlePublicar}
        guardando={guardando}
      />

      <DeleteConfirmModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={confirmarBorradoReal}
        itemName={videoParaBorrar?.title}
        loading={guardando}
      />
    </AppLayout>
  );
}

// -------- MODAL CONFIRMACION BORRADO --------
function DeleteConfirmModal({ visible, onClose, onConfirm, itemName, loading }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlayCenter}>
        <View style={styles.deleteCard}>
          <View style={styles.deleteIconCircle}>
            <Ionicons name="trash-outline" size={28} color={theme.danger} />
          </View>
          <Text style={styles.deleteTitle}>¿Eliminar video?</Text>
          <Text style={styles.deleteDesc}>
            Estás a punto de eliminar <Text style={{fontWeight: '700', color: '#fff'}}>{itemName}</Text>. Esta acción no se puede deshacer.
          </Text>
          
          <View style={styles.deleteModalBtns}>
            <TouchableOpacity 
              style={styles.modalCancelBtn} 
              onPress={onClose} 
              disabled={loading}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalDeleteBtn} 
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalDeleteText}>Eliminar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -------- MODAL PUBLICAR --------
function PublishModal({ visible, onClose, titulo, setTitulo, desc, setDesc, url, setUrl, esPremium, setEsPremium, onPublish, guardando }) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
          <View style={styles.modalTopRow}>
            <Text style={styles.modalTitle}>Publicar video</Text>
            <TouchableOpacity onPress={onClose} disabled={guardando}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>Los videos públicos ayudan a promocionarte entre todos los usuarios.</Text>

          <View style={styles.visibilityContainer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.visibilityTitle}>¿Contenido Premium?</Text>
              <Text style={styles.visibilityDesc}>
                {esPremium ? 'Solo usuarios suscritos podrán verlo.' : 'Todos los usuarios podrán verlo (Promoción).'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setEsPremium(!esPremium)}
              style={[styles.toggleBtn, esPremium ? styles.toggleBtnOn : styles.toggleBtnOff]}
            >
              <View style={[styles.toggleCircle, esPremium ? styles.toggleCircleOn : styles.toggleCircleOff]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.separatorModal} />

          <Text style={styles.fieldLabel}>Título *</Text>
          <TextInput
            style={styles.fieldInput}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ej: Técnica perfecta de press de banca"
            placeholderTextColor="#444"
            maxLength={100}
          />

          <Text style={styles.fieldLabel}>Descripción</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMulti]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe brevemente el contenido del video..."
            placeholderTextColor="#444"
            multiline
            numberOfLines={3}
            maxLength={300}
          />

          <Text style={styles.fieldLabel}>URL del video *</Text>
          <TextInput
            style={styles.fieldInput}
            value={url}
            onChangeText={setUrl}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#444"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.fieldHint}>Soporta YouTube, Vimeo o cualquier enlace de video</Text>

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, guardando && { opacity: 0.6 }]}
              onPress={onPublish}
              disabled={guardando}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[theme.brand, '#15803d']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {guardando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Publicar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// -------- ESTILOS --------
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingBottom: 50 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  headerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  pageSub: { fontSize: 12, color: theme.textBody },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.brand,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  publishBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textBrand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
    marginTop: 4,
  },
  premiumSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  unlockedText: { fontSize: 11, color: theme.brand, fontWeight: '600' },
  noContent: { color: theme.textBody, fontSize: 13, marginBottom: 12 },

  // Tarjeta de video
  card: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  thumbnailContainer: { position: 'relative' },
  thumbnailPlaceholder: { width: '100%', height: 160 },
  thumbGradient: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeFree: { backgroundColor: '#1b5e20' },
  badgePremium: { backgroundColor: '#7B1FA2' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 5 },
  cardDesc: { fontSize: 12, color: '#777', marginBottom: 10, lineHeight: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trainerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  trainerName: { fontSize: 11, color: '#4FC3F7', fontWeight: '600' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.brandSofter,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  playHintText: { fontSize: 11, color: theme.textBrand, fontWeight: '600' },

  // Sección bloqueada
  lockedSection: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  lockedGradient: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a2a00',
    borderRadius: 18,
  },
  lockIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  lockedTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  lockedDesc: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  lockedBtn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  lockedBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#444' },
  emptyText: { fontSize: 13, color: '#333', textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 12, color: theme.textBody, marginBottom: 22 },
  fieldLabel: { fontSize: 12, color: theme.textBody, marginBottom: 8, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: theme.bgPrimary,
    color: '#fff',
    fontSize: 14,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 16,
  },
  fieldInputMulti: { height: 80, textAlignVertical: 'top' },
  fieldHint: { fontSize: 11, color: '#444', marginTop: -10, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelBtnText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyPersonal: {
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: theme.borderDefault,
    marginVertical: 25,
  },
  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  visibilityTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  visibilityDesc: { color: '#666', fontSize: 11 },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: theme.brand },
  toggleBtnOff: { backgroundColor: '#444' },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleCircleOn: { alignSelf: 'flex-end' },
  toggleCircleOff: { alignSelf: 'flex-start' },
  separatorModal: { height: 1, backgroundColor: theme.borderDefault, marginBottom: 20 },
  
  // Estilos Modal Borrado
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  deleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  deleteDesc: {
    fontSize: 13,
    color: theme.textBody,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  deleteModalBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.bgPrimary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  modalCancelText: {
    color: theme.textBody,
    fontWeight: '600',
    fontSize: 14,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.danger,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
