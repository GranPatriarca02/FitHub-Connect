import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

export default function SocialScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Create/Edit Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null); // Si es null, es modo crear

  // Comments Modal states
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Custom Actions Modals (Web friendly)
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId ? parseInt(userId) : null);
      
      const response = await fetch(`${API_URL}/social/posts`, {
        headers: { 'X-User-Id': userId || '' }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (e) {
      console.error("Error fetching posts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // --- ACTIONS FOR POSTS ---

  const handleOpenCreate = () => {
    setEditingPostId(null);
    setPostContent('');
    setModalVisible(true);
  };

  const handleSavePost = async () => {
    if (!postContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('userName') || "Tú";
      const userRole = await AsyncStorage.getItem('userRole') || "";
      
      console.log("Iniciando publicación...", { userId, editingPostId });

      if (editingPostId) {
        // MODO EDICIÓN
        const response = await fetch(`${API_URL}/social/posts/${editingPostId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'X-User-Id': userId || '' 
          },
          body: JSON.stringify({ content: postContent.trim() })
        });

        if (response.ok) {
          setPosts(current => current.map(p => p.id === editingPostId ? { ...p, content: postContent.trim() } : p));
          setModalVisible(false);
          setEditingPostId(null);
          setPostContent('');
        } else {
          const errData = await response.json().catch(() => ({}));
          Alert.alert('Error', errData.error || 'No se pudo editar la publicación');
        }
      } else {
        // MODO CREACIÓN
        const response = await fetch(`${API_URL}/social/posts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'X-User-Id': userId || '' 
          },
          body: JSON.stringify({ content: postContent.trim() })
        });

        console.log("Respuesta creación:", response.status);

        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          
          // Actualización optimista inmediata
          const newPostObj = {
            id: result.id || Date.now(), // Usar Date.now() como fallback de ID
            userId: userId ? parseInt(userId) : 0,
            userName: userName,
            userRole: userRole,
            content: postContent.trim(),
            likesCount: 0,
            commentsCount: 0,
            timeAgo: "Ahora mismo",
            isLikedByMe: false
          };

          // Actualizar estado, limpiar input y CERRAR MODAL de inmediato
          setPosts(current => [newPostObj, ...current]);
          setPostContent('');
          setModalVisible(false);
          
          console.log("Post añadido optimísticamente, modal cerrado.");

          // Refrescar en segundo plano para sincronizar IDs reales y otros datos
          setTimeout(() => fetchPosts(), 500);
        } else {
          const errData = await response.json().catch(() => ({}));
          Alert.alert('Error', errData.error || 'No se pudo publicar');
        }
      }
    } catch (e) {
      console.error("Error en handleSavePost:", e);
      Alert.alert('Error', 'Error de red o del servidor al publicar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async (id) => {
    // Optimistic update
    const oldPosts = [...posts];
    setPosts(current => current.filter(p => p.id !== id));
    try {
      const userId = await AsyncStorage.getItem('userId');
      const response = await fetch(`${API_URL}/social/posts/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId || '' }
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (Platform.OS === 'web') alert(data.error || 'No se pudo eliminar la publicacion');
        else Alert.alert('Error', data.error || 'No se pudo eliminar la publicacion');
        setPosts(oldPosts); // Revertir
      }
    } catch (e) {
      if (Platform.OS === 'web') alert('Problema de conexion al eliminar');
      else Alert.alert('Error', 'Problema de conexion al eliminar');
      setPosts(oldPosts); // Revertir
    }
  };

  const handleDeletePost = (id) => {
    setSelectedPost(posts.find(p => p.id === id));
    setDeleteConfirmVisible(true);
    setOptionsModalVisible(false); // Por si venía de opciones
  };

  const showPostOptions = (post) => {
    setSelectedPost(post);
    setOptionsModalVisible(true);
  };

  const handleToggleLike = async (postId, currentlyLiked) => {
    setPosts(current => current.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLikedByMe: !currentlyLiked,
          likesCount: currentlyLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1
        };
      }
      return p;
    }));

    try {
      const userId = await AsyncStorage.getItem('userId');
      const response = await fetch(`${API_URL}/social/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'X-User-Id': userId || '' }
      });
      if (!response.ok) fetchPosts();
    } catch (e) {
      fetchPosts();
    }
  };

  // --- ACTIONS FOR COMMENTS ---

  const handleOpenComments = async (post) => {
    setActivePostForComments(post);
    setCommentsModalVisible(true);
    setCommentsLoading(true);
    setComments([]);

    try {
      const response = await fetch(`${API_URL}/social/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !activePostForComments) return;
    
    const commentText = newComment.trim();
    setNewComment('');
    
    // Optimistic Update local list
    const optimisticComment = {
      id: Math.random(),
      userId: currentUserId,
      userName: "Tú",
      userRole: "",
      content: commentText,
      timeAgo: "Ahora mismo"
    };
    setComments(curr => [...curr, optimisticComment]);
    
    // Update main feed comment count
    setPosts(curr => curr.map(p => p.id === activePostForComments.id ? { ...p, commentsCount: p.commentsCount + 1 } : p));

    try {
      const userId = await AsyncStorage.getItem('userId');
      await fetch(`${API_URL}/social/posts/${activePostForComments.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId || '' },
        body: JSON.stringify({ content: commentText })
      });
      // Silent refresh
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const cameraBtn = (
    <TouchableOpacity style={{ padding: 5 }}>
      <MaterialCommunityIcons name="camera-plus-outline" size={26} color={theme.brand} />
    </TouchableOpacity>
  );

  return (
    <AppLayout title="Comunidad" navigation={navigation} showBackButton={true} headerRight={cameraBtn}>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aún no hay publicaciones. ¡Sé el primero en decir algo!</Text>
            </View>
          ) : (
            posts.map(post => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <LinearGradient colors={[theme.brand, '#15803d']} style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{post.userName.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={styles.postMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.postUser}>{post.userName}</Text>
                      {post.userRole === 'TRAINER' && (
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#4FC3F7" style={{ marginLeft: 4 }} />
                      )}
                      {post.userRole === 'PREMIUM' && (
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={styles.postTime}>{post.timeAgo}</Text>
                  </View>
                  
                  {/* Opciones solo para mi propio post */}
                  {currentUserId === post.userId && (
                    <TouchableOpacity onPress={() => showPostOptions(post)} style={{ padding: 5 }}>
                      <MaterialCommunityIcons name="dots-horizontal" size={20} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.postContent}>{post.content}</Text>
                
                <View style={styles.postFooter}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleToggleLike(post.id, post.isLikedByMe)}
                  >
                    <MaterialCommunityIcons 
                      name={post.isLikedByMe ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.isLikedByMe ? "#FF5252" : "#888"} 
                    />
                    <Text style={[styles.actionText, post.isLikedByMe && { color: '#FF5252' }]}>
                      {post.likesCount}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenComments(post)}>
                    <MaterialCommunityIcons name="comment-outline" size={20} color="#888" />
                    <Text style={styles.actionText}>{post.commentsCount}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionBtn}>
                    <MaterialCommunityIcons name="share-variant-outline" size={20} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Botón Flotante para crear Post */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.9}
        onPress={handleOpenCreate}
      >
        <LinearGradient
          colors={[theme.brand, '#15803d']}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="pencil" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal para Crear / Editar Post */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCentered}>
            <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalGradient}>
              <View style={styles.modalHeaderCentered}>
                <Text style={styles.modalTitleCentered}>{editingPostId ? 'Editar Publicación' : 'Nueva Publicación'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.postInputCentered}
                placeholder="¿Qué estás pensando?"
                placeholderTextColor="#666"
                multiline
                autoFocus
                value={postContent}
                onChangeText={setPostContent}
              />
              
              <View style={styles.modalFooterCentered}>
                <Text style={[styles.charCount, postContent.length > 280 && { color: '#FF5252' }]}>
                  {postContent.length}/280
                </Text>
                <TouchableOpacity 
                  onPress={handleSavePost}
                  disabled={!postContent.trim() || isSubmitting || postContent.length > 280}
                  style={styles.submitBtnContainer}
                >
                  <LinearGradient
                    colors={[theme.brand, '#15803d']}
                    style={[styles.submitBtnCentered, (!postContent.trim() || isSubmitting || postContent.length > 280) && { opacity: 0.5 }]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>{editingPostId ? 'Guardar' : 'Publicar'}</Text>
                        <MaterialCommunityIcons name="send" size={16} color="#fff" style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para Comentarios */}
      <Modal
        visible={commentsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentsOverlay}>
          <View style={styles.commentsContent}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setCommentsModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={theme.brand} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
                ListEmptyComponent={<Text style={styles.emptyComments}>Sé el primero en comentar.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.commentBody}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.commentUser}>{item.userName}</Text>
                        <Text style={styles.commentTime}>{item.timeAgo}</Text>
                      </View>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escribe un comentario..."
                placeholderTextColor="#666"
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity 
                style={[styles.commentSendBtn, !newComment.trim() && { opacity: 0.5 }]} 
                disabled={!newComment.trim()}
                onPress={handleSendComment}
              >
                <MaterialCommunityIcons name="send-circle" size={36} color={theme.brand} />
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Personalizado de Opciones (Web & Mobile) */}
      <Modal
        visible={optionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setOptionsModalVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetIndicator} />
              <Text style={styles.actionSheetTitle}>Gestionar Publicacion</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setOptionsModalVisible(false);
                setEditingPostId(selectedPost.id);
                setPostContent(selectedPost.content);
                setModalVisible(true);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
                <MaterialCommunityIcons name="pencil" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.actionTextItem}>Editar contenido</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => handleDeletePost(selectedPost.id)}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 82, 82, 0.1)' }]}>
                <MaterialCommunityIcons name="trash-can" size={22} color="#FF5252" />
              </View>
              <Text style={[styles.actionTextItem, { color: '#FF5252' }]}>Eliminar publicacion</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionItem, styles.actionCancel]} 
              onPress={() => setOptionsModalVisible(false)}
            >
              <Text style={styles.actionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Confirmacion de Borrado */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#FF5252" style={{ marginBottom: 16 }} />
            <Text style={styles.confirmTitle}>¿Eliminar publicacion?</Text>
            <Text style={styles.confirmDesc}>Esta accion no se puede deshacer. El contenido se borrara de la comunidad.</Text>
            
            <View style={styles.confirmFooter}>
              <TouchableOpacity 
                style={styles.confirmBtnCancel} 
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmBtnCancelText}>No, mantener</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmBtnDelete} 
                onPress={() => {
                  setDeleteConfirmVisible(false);
                  executeDelete(selectedPost.id);
                }}
              >
                <Text style={styles.confirmBtnDeleteText}>Si, eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderDefault,
    backgroundColor: theme.bgPrimarySoft,
  },
  backBtn: { padding: 5 },
  camBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  container: { padding: 20, paddingBottom: 100 },
  
  postCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  postMeta: { flex: 1 },
  postUser: { color: '#fff', fontWeight: '700', fontSize: 16 },
  postTime: { color: theme.textBody, fontSize: 12, marginTop: 2 },
  postContent: {
    color: '#eee',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
    paddingTop: 15,
    gap: 25,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
      }
    })
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  emptyState: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  emptyStateText: {
    color: theme.textBody,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24
  },

  // Action Sheet Styles
  actionSheet: {
    backgroundColor: theme.bgSecondarySoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 25,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  actionSheetIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.borderDefault,
    borderRadius: 2,
    marginBottom: 15,
  },
  actionSheetTitle: {
    color: theme.textBody,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextItem: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionCancel: {
    marginTop: 10,
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  actionCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Confirm Box Styles
  confirmBox: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 28,
    padding: 28,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  confirmTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  confirmDesc: {
    color: theme.textBody,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  confirmBtnCancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtnDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: theme.danger,
  },
  confirmBtnDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  // Modals generic
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCentered: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  modalGradient: {
    backgroundColor: theme.bgSecondarySoft,
    padding: 22,
  },
  modalHeaderCentered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleCentered: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
  },
  postInputCentered: {
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  modalFooterCentered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtnContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitBtnCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Comments specific
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsContent: {
    backgroundColor: theme.bgPrimary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '60%',
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderDefault,
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyComments: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.bgSecondarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  commentBody: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
  },
  commentUser: { color: '#fff', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  commentTime: { color: '#666', fontSize: 11 },
  commentText: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  commentInputBox: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
    alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.bgPrimary,
    color: '#fff',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  commentSendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
