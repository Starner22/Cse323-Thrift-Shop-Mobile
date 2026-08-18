import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface Category {
    categoryID: number;
    name: string;
    image_path: string;
    created_at: string;
    product_count: number;
}

const Admin_Category_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCategories, setTotalCategories] = useState(0);
    const limit = 15;

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Form states
    const [addForm, setAddForm] = useState({
        name: '',
        image: null as string | null
    });
    const [editForm, setEditForm] = useState({
        name: '',
        image: null as string | null,
        existingImage: ''
    });

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchCategories();
        }
    }, [isAuthenticated, page]);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await apiService.getCategoriesForAdmin(page, limit, searchQuery);
            if (response && response.success) {
                setCategories(response.data || []);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalCategories(response.pagination?.total || 0);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCategories();
        setRefreshing(false);
    };

    const handleSearch = () => {
        setPage(1);
        fetchCategories();
    };

    const pickImage = async (isEdit: boolean = false) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    const imageData = `data:image/jpeg;base64,${asset.base64}`;
                    if (isEdit) {
                        setEditForm({ ...editForm, image: imageData });
                    } else {
                        setAddForm({ ...addForm, image: imageData });
                    }
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleAddCategory = async () => {
        if (!addForm.name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        try {
            setProcessingId(-1);
            await apiService.addCategory({
                name: addForm.name.trim(),
                image: addForm.image
            });
            Alert.alert('Success', 'Category added successfully');
            setShowAddModal(false);
            resetAddForm();
            await fetchCategories();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add category');
        } finally {
            setProcessingId(null);
        }
    };

    const handleEditCategory = async () => {
        if (!selectedCategory) return;
        
        if (!editForm.name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }

        try {
            setProcessingId(selectedCategory.categoryID);
            await apiService.updateCategory(selectedCategory.categoryID, {
                name: editForm.name.trim(),
                image: editForm.image
            });
            Alert.alert('Success', 'Category updated successfully');
            setShowEditModal(false);
            await fetchCategories();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update category');
        } finally {
            setProcessingId(null);
            setSelectedCategory(null);
        }
    };

    const handleDeleteCategory = (category: Category) => {
        if (category.product_count > 0) {
            Alert.alert(
                'Cannot Delete Category',
                `This category has ${category.product_count} product${category.product_count > 1 ? 's' : ''} assigned to it. Please reassign or delete the products first.`,
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${category.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingId(category.categoryID);
                            await apiService.deleteCategory(category.categoryID);
                            Alert.alert('Success', 'Category deleted successfully');
                            await fetchCategories();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete category');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const resetAddForm = () => {
        setAddForm({ name: '', image: null });
    };

    const openEditModal = (category: Category) => {
        setSelectedCategory(category);
        setEditForm({
            name: category.name || '',
            image: null,
            existingImage: category.image_path || ''
        });
        setShowEditModal(true);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderCategoryCard = ({ item }: { item: Category }) => {
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;
        const isProcessing = processingId === item.categoryID;

        return (
            <View style={styles.categoryCard}>
                <View style={styles.cardContent}>
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.categoryImage} />
                        ) : (
                            <View style={[styles.categoryImage, styles.imagePlaceholder]}>
                                <Ionicons name="folder-outline" size={30} color="#ccc" />
                            </View>
                        )}
                    </View>
                    <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{item.name}</Text>
                        <View style={styles.categoryMeta}>
                            <Text style={styles.categoryMetaText}>📦 {item.product_count || 0} products</Text>
                            <Text style={styles.categoryMetaText}>📅 {formatDate(item.created_at)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => openEditModal(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                            <>
                                <Ionicons name="create-outline" size={16} color="#4CAF50" />
                                <Text style={styles.editButtonText}>Edit</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteCategory(item)}
                        disabled={isProcessing || item.product_count > 0}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={16} color={item.product_count > 0 ? '#ccc' : '#FF6B6B'} />
                                <Text style={[styles.deleteButtonText, item.product_count > 0 && styles.deleteButtonDisabled]}>
                                    Delete
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                pages.push(i);
            } else if (i === page - 2 || i === page + 2) {
                pages.push(-1);
            }
        }

        return (
            <View style={styles.paginationContainer}>
                <TouchableOpacity 
                    style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                    onPress={() => page > 1 && setPage(page - 1)}
                    disabled={page === 1}
                >
                    <Ionicons name="chevron-back" size={20} color={page === 1 ? '#ccc' : '#333'} />
                </TouchableOpacity>

                {pages.map((p, index) => {
                    if (p === -1) {
                        return <Text key={`sep-${index}`} style={styles.pageSeparator}>...</Text>;
                    }
                    return (
                        <TouchableOpacity
                            key={p}
                            style={[styles.pageButton, page === p && styles.pageButtonActive]}
                            onPress={() => setPage(p)}
                        >
                            <Text style={[styles.pageButtonText, page === p && styles.pageButtonTextActive]}>
                                {p}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity 
                    style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                    onPress={() => page < totalPages && setPage(page + 1)}
                    disabled={page === totalPages}
                >
                    <Ionicons name="chevron-forward" size={20} color={page === totalPages ? '#ccc' : '#333'} />
                </TouchableOpacity>
            </View>
        );
    };

    if (!isAuthenticated || user?.role !== 'Admin') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Access Denied</Text>
                    <Text style={styles.authRequiredSubtext}>
                        You need admin privileges to view this page.
                    </Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.loginButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Category Management</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                        resetAddForm();
                        setShowAddModal(true);
                    }}
                >
                    <Ionicons name="add" size={28} color="#DC3545" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search categories..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            handleSearch();
                        }}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading categories...</Text>
                </View>
            ) : categories.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="folder-open-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Categories Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No categories match your search.' 
                            : 'No categories have been created yet.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={categories}
                        renderItem={renderCategoryCard}
                        keyExtractor={(item) => item.categoryID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
            )}

            {/* Add Category Modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowAddModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Category</Text>
                                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.modalForm}>
                                    {/* Image Upload */}
                                    <View style={styles.imageSection}>
                                        <Text style={styles.label}>Category Image</Text>
                                        <TouchableOpacity 
                                            style={styles.imageUploadContainer}
                                            onPress={() => pickImage(false)}
                                        >
                                            {addForm.image ? (
                                                <Image source={{ uri: addForm.image }} style={styles.uploadedImage} />
                                            ) : (
                                                <View style={styles.imagePlaceholder}>
                                                    <Ionicons name="camera-outline" size={40} color="#ccc" />
                                                    <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Category Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={addForm.name}
                                            onChangeText={(text) => setAddForm({ ...addForm, name: text })}
                                            placeholder="Enter category name"
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalCancel]}
                                    onPress={() => setShowAddModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalSubmit]}
                                    onPress={handleAddCategory}
                                    disabled={processingId === -1}
                                >
                                    {processingId === -1 ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>Add Category</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Edit Category Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowEditModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Category</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.modalScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.modalForm}>
                                    {/* Image Upload */}
                                    <View style={styles.imageSection}>
                                        <Text style={styles.label}>Category Image</Text>
                                        <TouchableOpacity 
                                            style={styles.imageUploadContainer}
                                            onPress={() => pickImage(true)}
                                        >
                                            {editForm.image ? (
                                                <Image source={{ uri: editForm.image }} style={styles.uploadedImage} />
                                            ) : editForm.existingImage ? (
                                                <Image source={{ uri: `${imageBaseUrl}${editForm.existingImage}` }} style={styles.uploadedImage} />
                                            ) : (
                                                <View style={styles.imagePlaceholder}>
                                                    <Ionicons name="camera-outline" size={40} color="#ccc" />
                                                    <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                        {editForm.existingImage && !editForm.image && (
                                            <Text style={styles.imageHint}>Current image shown. Tap to change.</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Category Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.name}
                                            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                            placeholder="Enter category name"
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalCancel]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalSubmit]}
                                    onPress={handleEditCategory}
                                    disabled={processingId === selectedCategory?.categoryID}
                                >
                                    {processingId === selectedCategory?.categoryID ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.modalSubmitText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    iconButton: {
        padding: 4,
    },
    storeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    addButton: {
        padding: 4,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#333',
        paddingVertical: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    categoryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginRight: 12,
    },
    categoryImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    categoryMeta: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 2,
    },
    categoryMetaText: {
        fontSize: 12,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    editButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    editButtonText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    deleteButtonText: {
        fontSize: 12,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    deleteButtonDisabled: {
        color: '#ccc',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    authRequiredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    authRequiredText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    authRequiredSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    loginButton: {
        marginTop: 24,
        backgroundColor: '#DC3545',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 4,
        flexWrap: 'wrap',
    },
    pageButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 36,
        alignItems: 'center',
    },
    pageButtonActive: {
        backgroundColor: '#DC3545',
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    pageButtonText: {
        fontSize: 14,
        color: '#333',
    },
    pageButtonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    pageSeparator: {
        paddingHorizontal: 4,
        color: '#999',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%',
        paddingBottom: 20,
    },
    modalScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalForm: {
        marginTop: 8,
        paddingBottom: 20,
    },
    imageSection: {
        marginBottom: 16,
    },
    imageUploadContainer: {
        width: '100%',
        height: 120,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholderText: {
        fontSize: 13,
        color: '#999',
        marginTop: 6,
    },
    imageHint: {
        fontSize: 11,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancel: {
        backgroundColor: '#f0f0f0',
    },
    modalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    modalSubmit: {
        backgroundColor: '#DC3545',
    },
    modalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Category_Management;