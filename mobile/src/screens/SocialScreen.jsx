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

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comunidad</Text>
        <TouchableOpacity style={styles.camBtn}>
          <MaterialCommunityIcons name="camera-plus-outline" size={26} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
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
                  <View style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{post.userName.charAt(0).toUpperCase()}</Text>
                  </View>
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
        activeOpacity={0.8}
        onPress={handleOpenCreate}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
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
                    colors={['#4CAF50', '#2E7D32']}
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
              <ActivityIndicator size="small" color="#4CAF50" style={{ margin: 20 }} />
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
                <MaterialCommunityIcons name="send-circle" size={36} color="#4CAF50" />
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

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backBtn: { padding: 5 },
  camBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  container: { padding: 20, paddingBottom: 100 },
  
  postCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: { color: '#fff', fontWeight: 'bold' },
  postMeta: { flex: 1 },
  postUser: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  postTime: { color: '#666', fontSize: 12, marginTop: 2 },
  postContent: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 12,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: { color: '#888', fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22
  },

  // Action Sheet Styles
  actionSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionSheetHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionSheetIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 12,
  },
  actionSheetTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    backgroundColor: '#1e1e1e',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  confirmTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confirmDesc: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  confirmBtnCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtnDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF5252',
  },
  confirmBtnDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    borderColor: '#333',
  },
  modalGradient: {
    padding: 20,
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
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    borderTopColor: '#2a2a2a',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  commentSendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
