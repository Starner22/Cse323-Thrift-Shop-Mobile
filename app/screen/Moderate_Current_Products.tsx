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
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface Product {
    productID: number;
    name: string;
    description: string;
    price: number;
    condition: string;
    quantity: number;
    categoryID: number;
    categoryName?: string;
    image_path: string;
    sellerID: number;
    sellerName?: string;
    sellerEmail?: string;
    status: 'pending' | 'approved' | 'rejected';
    can_display: number;
    seller_active: number;
    moderation_notes?: string;
    seller_notes?: string;
    created_at: string;
    updated_at: string;
}

const Moderate_Current_Products = ({ navigation }: any) => {
    const { isAuthenticated, user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        price: '',
        quantity: '',
        condition: 'Good'
    });
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';
    const conditionOptions = ['Excellent', 'Good', 'Normal', 'Subpar'];

    useEffect(() => {
        if (isAuthenticated) {
            fetchProducts();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        filterProducts();
    }, [products, activeFilter]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllProductsForModeration();
            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching products:', error);
            Alert.alert('Error', 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    const filterProducts = () => {
        let filtered = [...products];
        
        if (activeFilter === 'visible') {
            filtered = filtered.filter(p => p.can_display === 1 && p.seller_active === 1);
        } else if (activeFilter === 'hidden_by_mod') {
            filtered = filtered.filter(p => p.can_display === 0);
        } else if (activeFilter === 'hidden_by_seller') {
            filtered = filtered.filter(p => p.seller_active === 0);
        } else if (activeFilter === 'pending') {
            filtered = filtered.filter(p => p.status === 'pending');
        } else if (activeFilter === 'rejected') {
            filtered = filtered.filter(p => p.status === 'rejected');
        }
        
        setFilteredProducts(filtered);
    };

    const getVisibilityStatus = (product: Product) => {
        if (product.can_display === 0) {
            return { label: 'Hidden by Mod', color: '#FF6B6B', icon: 'eye-off' };
        }
        if (product.seller_active === 0) {
            return { label: 'Hidden by Seller', color: '#FF9F43', icon: 'pause-circle' };
        }
        return { label: 'Visible', color: '#4CAF50', icon: 'eye' };
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved': return { label: 'Approved', color: '#4CAF50', icon: 'checkmark-circle' };
            case 'pending': return { label: 'Pending', color: '#FF9F43', icon: 'time-outline' };
            case 'rejected': return { label: 'Rejected', color: '#FF6B6B', icon: 'close-circle' };
            default: return { label: 'Unknown', color: '#999', icon: 'alert-circle' };
        }
    };

    const handleToggleVisibility = (product: Product) => {
        const isVisible = product.can_display === 1;
        const action = isVisible ? 'hide' : 'show';
        
        Alert.alert(
            `${isVisible ? 'Hide' : 'Show'} Product`,
            `Are you sure you want to ${action} "${product.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action.toUpperCase(),
                    onPress: async () => {
                        try {
                            setProcessingId(product.productID);
                            await apiService.updateProductVisibility(product.productID, !isVisible);
                            await fetchProducts();
                            Alert.alert('Success', `Product ${action}den successfully`);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to update visibility');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleViewDetails = (product: Product) => {
        setSelectedProduct(product);
        setShowDetailModal(true);
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setEditForm({
            name: product.name || '',
            description: product.description || '',
            price: product.price?.toString() || '',
            quantity: product.quantity?.toString() || '1',
            condition: product.condition || 'Good'
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedProduct) return;
        
        if (!editForm.name.trim()) {
            Alert.alert('Error', 'Product name is required');
            return;
        }
        
        const priceNum = parseFloat(editForm.price);
        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Error', 'Valid price is required');
            return;
        }
        
        const quantityNum = parseInt(editForm.quantity);
        if (isNaN(quantityNum) || quantityNum < 1) {
            Alert.alert('Error', 'Quantity must be at least 1');
            return;
        }

        try {
            setProcessingId(selectedProduct.productID);
            await apiService.moderateUpdateProduct(selectedProduct.productID, {
                name: editForm.name.trim(),
                description: editForm.description.trim(),
                price: priceNum,
                quantity: quantityNum,
                condition: editForm.condition
            });
            await fetchProducts();
            setShowEditModal(false);
            Alert.alert('Success', 'Product updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update product');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAddNote = (product: Product) => {
        setSelectedProduct(product);
        setNoteText('');
        setShowNoteModal(true);
    };

    const submitNote = async () => {
        if (!selectedProduct || !noteText.trim()) {
            Alert.alert('Error', 'Please enter a note');
            return;
        }

        try {
            setProcessingId(selectedProduct.productID);
            await apiService.addModerationNote(selectedProduct.productID, noteText.trim());
            await fetchProducts();
            setShowNoteModal(false);
            Alert.alert('Success', 'Note added successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add note');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const visibility = getVisibilityStatus(item);
        const status = getStatusConfig(item.status);
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;
        const isProcessing = processingId === item.productID;

        return (
            <View style={[styles.productCard, !item.can_display && styles.hiddenCard]}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => handleViewDetails(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.productImage} />
                        ) : (
                            <View style={[styles.productImage, styles.imagePlaceholder]}>
                                <Ionicons name="image-outline" size={30} color="#ccc" />
                            </View>
                        )}
                        <View style={[styles.visibilityBadge, { backgroundColor: visibility.color }]}>
                            <Ionicons name={visibility.icon as any} size={12} color="#fff" />
                            <Text style={styles.visibilityBadgeText}>{visibility.label}</Text>
                        </View>
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                        <View style={styles.productMeta}>
                            <Text style={styles.productMetaText}>{item.categoryName || 'Uncategorized'}</Text>
                            <Text style={styles.productMetaText}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={styles.statusRow}>
                            <Ionicons name={status.icon as any} size={14} color={status.color} />
                            <Text style={[styles.statusText, { color: status.color }]}>
                                {status.label}
                            </Text>
                            <Text style={styles.sellerName}>
                                · {item.sellerName || `Seller #${item.sellerID}`}
                            </Text>
                        </View>
                        {item.moderation_notes && (
                            <Text style={styles.notePreview} numberOfLines={1}>
                                📝 {item.moderation_notes}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewDetails(item)}
                    >
                        <Ionicons name="eye-outline" size={18} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditProduct(item)}
                    >
                        <Ionicons name="create-outline" size={18} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.noteButton]}
                        onPress={() => handleAddNote(item)}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color="#9C27B0" />
                        <Text style={styles.noteButtonText}>Note</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, item.can_display ? styles.hideButton : styles.showButton]}
                        onPress={() => handleToggleVisibility(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons 
                                    name={item.can_display ? "eye-off-outline" : "eye-outline"} 
                                    size={18} 
                                    color="#fff" 
                                />
                                <Text style={styles.actionButtonText}>
                                    {item.can_display ? 'Hide' : 'Show'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (!isAuthenticated || (user?.role !== 'Moderator' && user?.role !== 'Admin')) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Access Denied</Text>
                    <Text style={styles.authRequiredSubtext}>
                        You need moderator privileges to view this page.
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
                <Text style={styles.storeTitle}>All Products</Text>
                <Text style={styles.countBadge}>{filteredProducts.length}</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'visible', label: 'Visible' },
                    { key: 'hidden_by_mod', label: 'Hidden by Mod' },
                    { key: 'hidden_by_seller', label: 'Hidden by Seller' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'rejected', label: 'Rejected' },
                ].map((filter) => {
                    const isActive = activeFilter === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setActiveFilter(filter.key)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptySubtext}>
                        {activeFilter === 'all' 
                            ? 'No products in the system yet.' 
                            : 'No products match the selected filter.'}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {filteredProducts.map((item) => (
                        <View key={item.productID}>
                            {renderProduct({ item })}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowDetailModal(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Product Details</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedProduct && (
                                <>
                                    <Image 
                                        source={{ uri: `${imageBaseUrl}${selectedProduct.image_path}` }} 
                                        style={styles.modalImage} 
                                    />
                                    
                                    <View style={styles.modalBody}>
                                        <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                                        <Text style={styles.modalProductPrice}>${selectedProduct.price.toFixed(2)}</Text>
                                        
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Category:</Text>
                                            <Text style={styles.modalValue}>{selectedProduct.categoryName || 'Uncategorized'}</Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Condition:</Text>
                                            <Text style={styles.modalValue}>{selectedProduct.condition}</Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Quantity:</Text>
                                            <Text style={styles.modalValue}>{selectedProduct.quantity}</Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Seller:</Text>
                                            <Text style={styles.modalValue}>{selectedProduct.sellerName || `ID: ${selectedProduct.sellerID}`}</Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Status:</Text>
                                            <Text style={[styles.modalValue, { color: getStatusConfig(selectedProduct.status).color }]}>
                                                {getStatusConfig(selectedProduct.status).label}
                                            </Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Visibility:</Text>
                                            <Text style={[styles.modalValue, { color: getVisibilityStatus(selectedProduct).color }]}>
                                                {getVisibilityStatus(selectedProduct).label}
                                            </Text>
                                        </View>
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Listed:</Text>
                                            <Text style={styles.modalValue}>{formatDate(selectedProduct.created_at)}</Text>
                                        </View>
                                        
                                        <View style={styles.modalDivider} />
                                        
                                        <Text style={styles.modalDescriptionTitle}>Description</Text>
                                        <Text style={styles.modalDescription}>
                                            {selectedProduct.description || 'No description provided.'}
                                        </Text>

                                        {selectedProduct.moderation_notes && (
                                            <>
                                                <View style={styles.modalDivider} />
                                                <Text style={styles.modalDescriptionTitle}>Moderation Notes</Text>
                                                <Text style={styles.modalDescription}>
                                                    {selectedProduct.moderation_notes}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalEditButton]}
                                onPress={() => {
                                    if (selectedProduct) {
                                        setShowDetailModal(false);
                                        handleEditProduct(selectedProduct);
                                    }
                                }}
                            >
                                <Ionicons name="create-outline" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalNoteButton]}
                                onPress={() => {
                                    if (selectedProduct) {
                                        setShowDetailModal(false);
                                        handleAddNote(selectedProduct);
                                    }
                                }}
                            >
                                <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Add Note</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, selectedProduct?.can_display ? styles.modalHideButton : styles.modalShowButton]}
                                onPress={() => {
                                    if (selectedProduct) {
                                        setShowDetailModal(false);
                                        handleToggleVisibility(selectedProduct);
                                    }
                                }}
                            >
                                <Ionicons 
                                    name={selectedProduct?.can_display ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color="#fff" 
                                />
                                <Text style={styles.modalButtonText}>
                                    {selectedProduct?.can_display ? 'Hide' : 'Show'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Modal */}
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
                        style={styles.editModalContent}
                    >
                        <View style={styles.editModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Product</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.editForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Product Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.name}
                                            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={editForm.description}
                                            onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Price</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.price}
                                            onChangeText={(text) => setEditForm({ ...editForm, price: text })}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Quantity</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.quantity}
                                            onChangeText={(text) => setEditForm({ ...editForm, quantity: text })}
                                            keyboardType="number-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Condition</Text>
                                        <View style={styles.conditionContainer}>
                                            {conditionOptions.map((cond) => (
                                                <TouchableOpacity
                                                    key={cond}
                                                    style={[
                                                        styles.conditionChip,
                                                        editForm.condition === cond && styles.conditionChipSelected
                                                    ]}
                                                    onPress={() => setEditForm({ ...editForm, condition: cond })}
                                                >
                                                    <Text style={[
                                                        styles.conditionChipText,
                                                        editForm.condition === cond && styles.conditionChipTextSelected
                                                    ]}>
                                                        {cond}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.rejectModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalCancel]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={styles.rejectModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalSubmit]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={styles.rejectModalSubmitText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Note Modal */}
            <Modal
                visible={showNoteModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNoteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowNoteModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.rejectModalContent}
                    >
                        <View style={styles.rejectModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Moderation Note</Text>
                                <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.rejectModalSubtitle}>
                                Adding note for "{selectedProduct?.name}":
                            </Text>

                            <TextInput
                                style={styles.rejectInput}
                                placeholder="Enter moderation note..."
                                placeholderTextColor="#999"
                                value={noteText}
                                onChangeText={setNoteText}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.rejectModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalCancel]}
                                    onPress={() => setShowNoteModal(false)}
                                >
                                    <Text style={styles.rejectModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalSubmit]}
                                    onPress={submitNote}
                                >
                                    <Text style={styles.rejectModalSubmitText}>Add Note</Text>
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
    countBadge: {
        backgroundColor: '#6C5CE7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    filterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 6,
    },
    filterTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: '#6C5CE7',
        borderColor: '#6C5CE7',
    },
    filterText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    hiddenCard: {
        borderColor: '#FF6B6B',
        borderWidth: 2,
    },
    cardContent: {
        flexDirection: 'row',
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    visibilityBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    visibilityBadgeText: {
        fontSize: 8,
        color: '#fff',
        fontWeight: 'bold',
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    productPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 2,
    },
    productMeta: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 2,
    },
    productMetaText: {
        fontSize: 11,
        color: '#999',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        flexWrap: 'wrap',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    sellerName: {
        fontSize: 11,
        color: '#999',
        marginLeft: 6,
    },
    notePreview: {
        fontSize: 11,
        color: '#9C27B0',
        marginTop: 2,
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 6,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 12,
        color: '#3498DB',
        fontWeight: '500',
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
    noteButton: {
        backgroundColor: '#f3e5f5',
        borderWidth: 1,
        borderColor: '#9C27B0',
    },
    noteButtonText: {
        fontSize: 12,
        color: '#9C27B0',
        fontWeight: '500',
    },
    hideButton: {
        backgroundColor: '#FF6B6B',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    showButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    actionButtonText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
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
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackground: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
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
    modalImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#f5f5f5',
    },
    modalBody: {
        padding: 16,
    },
    modalProductName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalProductPrice: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 4,
    },
    modalRow: {
        flexDirection: 'row',
        marginTop: 6,
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        width: 80,
    },
    modalValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 12,
    },
    modalDescriptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    modalDescription: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    modalEditButton: {
        backgroundColor: '#4CAF50',
    },
    modalNoteButton: {
        backgroundColor: '#9C27B0',
    },
    modalHideButton: {
        backgroundColor: '#FF6B6B',
    },
    modalShowButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Edit Modal
    editModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    editModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
        maxHeight: '85%',
    },
    editForm: {
        marginTop: 8,
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
        paddingVertical: 10,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    conditionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    conditionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    conditionChipSelected: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4CAF50',
    },
    conditionChipText: {
        fontSize: 13,
        color: '#666',
    },
    conditionChipTextSelected: {
        color: '#4CAF50',
        fontWeight: '500',
    },
    // Reject/Note Modal
    rejectModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    rejectModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
    },
    rejectModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 12,
    },
    rejectInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    rejectModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    rejectModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    rejectModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    rejectModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    rejectModalSubmit: {
        backgroundColor: '#4CAF50',
    },
    rejectModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Moderate_Current_Products;