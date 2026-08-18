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
    FlatList,
    Modal,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface DeletedProduct {
    productID: number;
    name: string;
    description: string;
    price: number;
    condition: string;
    quantity: number;
    categoryID: number | null;
    categoryName: string;
    image_path: string;
    status: string;
    sellerName: string;
    created_at: string;
    updated_at: string;
    is_deleted: number;
    sellerEmail?: string;
    moderation_notes?: string;
}

const Admin_Deleted_Products = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [products, setProducts] = useState<DeletedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState<DeletedProduct | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchDeletedProducts();
        }
    }, [isAuthenticated]);

    const fetchDeletedProducts = async () => {
        try {
            setLoading(true);
            const response = await apiService.getDeletedProducts();
            if (response && response.success) {
                setProducts(response.data || []);
                setTotal(response.pagination?.total || 0);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error('Error fetching deleted products:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDeletedProducts();
        setRefreshing(false);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getConditionColor = (condition: string) => {
        switch (condition) {
            case 'Excellent': return '#4CAF50';
            case 'Good': return '#2196F3';
            case 'Normal': return '#FF9800';
            case 'Subpar': return '#f44336';
            default: return '#999';
        }
    };

    const getConditionEmoji = (condition: string) => {
        switch (condition) {
            case 'Excellent': return '⭐';
            case 'Good': return '👍';
            case 'Normal': return '👌';
            case 'Subpar': return '⚠️';
            default: return '❓';
        }
    };

    const renderProduct = ({ item }: { item: DeletedProduct }) => {
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;

        return (
            <View style={styles.productCard}>
                <View style={styles.productContent}>
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.productImage} />
                        ) : (
                            <View style={[styles.productImage, styles.imagePlaceholder]}>
                                <Ionicons name="image-outline" size={30} color="#ccc" />
                            </View>
                        )}
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
                        <View style={styles.conditionBadge}>
                            <Text style={[
                                styles.conditionText,
                                { color: getConditionColor(item.condition) }
                            ]}>
                                {getConditionEmoji(item.condition)} {item.condition}
                            </Text>
                        </View>
                        <Text style={styles.sellerName}>👤 {item.sellerName}</Text>
                        <Text style={styles.productDate}>🗑️ Deleted: {formatDate(item.updated_at)}</Text>
                        
                        <TouchableOpacity 
                            style={styles.viewButton}
                            onPress={() => {
                                setSelectedProduct(item);
                                setModalVisible(true);
                            }}
                        >
                            <Ionicons name="eye-outline" size={16} color="#6C5CE7" />
                            <Text style={styles.viewButtonText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Product Details Modal
    const ProductDetailModal = () => {
        if (!selectedProduct) return null;

        const imageUrl = selectedProduct.image_path ? `${imageBaseUrl}${selectedProduct.image_path}` : null;

        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Product Details</Text>
                            <TouchableOpacity 
                                onPress={() => setModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            {/* Product Image */}
                            {imageUrl ? (
                                <Image source={{ uri: imageUrl }} style={styles.modalImage} />
                            ) : (
                                <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
                                    <Ionicons name="image-outline" size={60} color="#ccc" />
                                </View>
                            )}

                            {/* Status Badges */}
                            <View style={styles.modalBadges}>
                                <View style={[
                                    styles.modalBadge, 
                                    { backgroundColor: getConditionColor(selectedProduct.condition) + '20' }
                                ]}>
                                    <Text style={[
                                        styles.modalBadgeText,
                                        { color: getConditionColor(selectedProduct.condition) }
                                    ]}>
                                        {getConditionEmoji(selectedProduct.condition)} {selectedProduct.condition}
                                    </Text>
                                </View>
                            </View>

                            {/* Product Name */}
                            <Text style={styles.modalProductName}>{selectedProduct.name}</Text>

                            {/* Price */}
                            <Text style={styles.modalPrice}>${selectedProduct.price.toFixed(2)}</Text>

                            {/* Description */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>📝 Description</Text>
                                <Text style={styles.modalDescription}>
                                    {selectedProduct.description || 'No description provided.'}
                                </Text>
                            </View>

                            {/* Details Grid */}
                            <View style={styles.modalGrid}>
                                <View style={styles.modalGridItem}>
                                    <Text style={styles.modalGridLabel}>Category</Text>
                                    <Text style={styles.modalGridValue}>
                                        {selectedProduct.categoryName || 'Uncategorized'}
                                    </Text>
                                </View>
                                <View style={styles.modalGridItem}>
                                    <Text style={styles.modalGridLabel}>Quantity</Text>
                                    <Text style={styles.modalGridValue}>{selectedProduct.quantity}</Text>
                                </View>
                                <View style={styles.modalGridItem}>
                                    <Text style={styles.modalGridLabel}>Seller</Text>
                                    <Text style={styles.modalGridValue}>{selectedProduct.sellerName}</Text>
                                </View>
                                <View style={styles.modalGridItem}>
                                    <Text style={styles.modalGridLabel}>Status</Text>
                                    <Text style={[
                                        styles.modalGridValue,
                                        { color: selectedProduct.status === 'approved' ? '#4CAF50' : '#FF9800' }
                                    ]}>
                                        {selectedProduct.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            {/* Timestamps */}
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>⏰ Timestamps</Text>
                                <View style={styles.timestampRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#999" />
                                    <Text style={styles.timestampText}>
                                        Created: {formatDate(selectedProduct.created_at)}
                                    </Text>
                                </View>
                                <View style={styles.timestampRow}>
                                    <Ionicons name="trash-outline" size={16} color="#f44336" />
                                    <Text style={[styles.timestampText, styles.timestampDeleted]}>
                                        Deleted: {formatDate(selectedProduct.updated_at)}
                                    </Text>
                                </View>
                            </View>

                            {/* Moderation Notes if any */}
                            {selectedProduct.moderation_notes && (
                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>📌 Moderation Notes</Text>
                                    <Text style={styles.modalNotes}>
                                        {selectedProduct.moderation_notes}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Modal Footer */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.modalActionButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalActionButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
                        You need admin privileges to view deleted products.
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
                <Text style={styles.storeTitle}>🗑️ Deleted Products</Text>
                <Text style={styles.countBadge}>{total}</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading deleted products...</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="trash-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Deleted Products</Text>
                    <Text style={styles.emptySubtext}>
                        Products that are deleted will appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.productID.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Product Detail Modal */}
            <ProductDetailModal />
        </SafeAreaView>
    );
};

const { height } = Dimensions.get('window');

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
        fontSize: 18,
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
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    productContent: {
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
    deletedBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'red',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    deletedBadgeText: {
        fontSize: 9,
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
    conditionBadge: {
        marginTop: 2,
    },
    conditionText: {
        fontSize: 11,
        fontWeight: '500',
    },
    sellerName: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    productDate: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 2,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingVertical: 4,
        paddingHorizontal: 10,
        backgroundColor: '#6C5CE7',
        borderRadius: 6,
        alignSelf: 'flex-start',
        gap: 4,
    },
    viewButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.9,
        minHeight: height * 0.6,
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
    modalCloseButton: {
        padding: 4,
    },
    modalScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    modalImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        marginTop: 16,
    },
    modalImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBadges: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        flexWrap: 'wrap',
    },
    modalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    deletedBadgeModal: {
        backgroundColor: '#6C5CE7',
    },
    modalBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    modalProductName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    modalPrice: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 4,
    },
    modalSection: {
        marginTop: 16,
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 14,
        color: '#333',
        lineHeight: 22,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
    },
    modalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    modalGridItem: {
        width: '48%',
    },
    modalGridLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 2,
    },
    modalGridValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    timestampRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    timestampText: {
        fontSize: 12,
        color: '#666',
    },
    timestampDeleted: {
        color: '#f44336',
        fontWeight: '500',
    },
    modalNotes: {
        fontSize: 13,
        color: '#555',
        backgroundColor: '#fff3e0',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#FF9800',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalActionButton: {
        backgroundColor: '#6C5CE7',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalActionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
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
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Deleted_Products;