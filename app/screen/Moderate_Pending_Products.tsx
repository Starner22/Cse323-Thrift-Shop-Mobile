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

interface PendingProduct {
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
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
}

const Moderate_Pending_Products = ({ navigation }: any) => {
    const { isAuthenticated, user } = useAuth();
    const [products, setProducts] = useState<PendingProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<PendingProduct | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);

    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchPendingProducts();
        }
    }, [isAuthenticated]);

    const fetchPendingProducts = async () => {
        try {
            setLoading(true);
            const data = await apiService.getPendingProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching pending products:', error);
            Alert.alert('Error', 'Failed to load pending products');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPendingProducts();
        setRefreshing(false);
    };

    const handleApprove = (product: PendingProduct) => {
        Alert.alert(
            'Approve Product',
            `Are you sure you want to approve "${product.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            setProcessingId(product.productID);
                            await apiService.approveProduct(product.productID);
                            setProducts(prev => prev.filter(p => p.productID !== product.productID));
                            Alert.alert('Success', 'Product approved successfully!');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to approve product');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = (product: PendingProduct) => {
        setSelectedProduct(product);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const submitReject = async () => {
        if (!selectedProduct) return;
        
        if (!rejectReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejection');
            return;
        }

        try {
            setProcessingId(selectedProduct.productID);
            await apiService.rejectProduct(selectedProduct.productID, rejectReason.trim());
            setProducts(prev => prev.filter(p => p.productID !== selectedProduct.productID));
            setShowRejectModal(false);
            Alert.alert('Success', 'Product rejected');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reject product');
        } finally {
            setProcessingId(null);
            setSelectedProduct(null);
        }
    };


    const handleViewDetails = (product: PendingProduct) => {
        setSelectedProduct(product);
        setShowDetailModal(true);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderProduct = ({ item }: { item: PendingProduct }) => {
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;
        const isProcessing = processingId === item.productID;

        return (
            <View style={styles.productCard}>
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
                        <View style={styles.sellerInfo}>
                            <Ionicons name="person-outline" size={12} color="#999" />
                            <Text style={styles.sellerName}>{item.sellerName || `Seller #${item.sellerID}`}</Text>
                        </View>
                        <Text style={styles.productDate}>Listed: {formatDate(item.created_at)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Approve</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject</Text>
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
                <Text style={styles.storeTitle}>Pending Products</Text>
                <Text style={styles.countBadge}>{products.length}</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading pending products...</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
                    <Text style={styles.emptyTitle}>All Clear! 🎉</Text>
                    <Text style={styles.emptySubtext}>
                        No products pending moderation at the moment.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {products.map((item) => (
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
                                            <Text style={styles.modalLabel}>Listed:</Text>
                                            <Text style={styles.modalValue}>{formatDate(selectedProduct.created_at)}</Text>
                                        </View>
                                        
                                        <View style={styles.modalDivider} />
                                        
                                        <Text style={styles.modalDescriptionTitle}>Description</Text>
                                        <Text style={styles.modalDescription}>
                                            {selectedProduct.description || 'No description provided.'}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalApproveButton]}
                                onPress={() => {
                                    if (selectedProduct) {
                                        setShowDetailModal(false);
                                        handleApprove(selectedProduct);
                                    }
                                }}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalRejectButton]}
                                onPress={() => {
                                    if (selectedProduct) {
                                        setShowDetailModal(false);
                                        handleReject(selectedProduct);
                                    }
                                }}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowRejectModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.rejectModalContent}
                    >
                        <View style={styles.rejectModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reject Product</Text>
                                <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.rejectModalSubtitle}>
                                Please provide a reason for rejecting "{selectedProduct?.name}":
                            </Text>

                            <TextInput
                                style={styles.rejectInput}
                                placeholder="Enter rejection reason..."
                                placeholderTextColor="#999"
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.rejectModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalCancel]}
                                    onPress={() => setShowRejectModal(false)}
                                >
                                    <Text style={styles.rejectModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalSubmit]}
                                    onPress={submitReject}
                                >
                                    <Text style={styles.rejectModalSubmitText}>Submit</Text>
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
        backgroundColor: '#FF9F43',
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
    cardContent: {
        flexDirection: 'row',
    },
    imageContainer: {
        width: 90,
        height: 90,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        flex: 1,
        marginLeft: 12,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    productPrice: {
        fontSize: 16,
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
    sellerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sellerName: {
        fontSize: 11,
        color: '#999',
        marginLeft: 4,
    },
    productDate: {
        fontSize: 10,
        color: '#bbb',
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
        minWidth: 90,
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF6B6B',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
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
    // Detail Modal
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
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    modalApproveButton: {
        backgroundColor: '#4CAF50',
    },
    modalRejectButton: {
        backgroundColor: '#FF6B6B',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    // Reject Modal
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
        backgroundColor: '#FF6B6B',
    },
    rejectModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Moderate_Pending_Products;