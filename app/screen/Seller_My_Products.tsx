import React, { useState, useEffect, useCallback } from 'react';
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
    TextInput
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
    status: 'pending' | 'approved' | 'rejected';
    seller_active?: number;
    can_display?: number;
    moderation_notes?: string;
    created_at: string;
    rejected_reason?: string;
}

const Seller_My_Products = ({ navigation }: any) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const { user, isAuthenticated } = useAuth();
    const [isSuspended, setIsSuspended] = useState(false);

    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            checkSellerStatus();
            fetchProducts();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        filterProducts();
    }, [products, activeFilter, searchQuery]);

    const checkSellerStatus = async () => {
        try {
            const response = await apiService.checkSellerStatus();
            if (response.hasApplied && response.status === 'suspended') {
                setIsSuspended(true);
            }
        } catch (error) {
            console.error('Error checking seller status:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const data = await apiService.getMyProducts();
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

        if (activeFilter !== 'all') {
            filtered = filtered.filter(p => p.status === activeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query)
            );
        }

        setFilteredProducts(filtered);
    };

    const handleDelete = (productID: number, productName: string) => {
        Alert.alert(
            'Delete Product',
            `Are you sure you want to delete "${productName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingId(productID);
                            await apiService.deleteProduct(productID);
                            await fetchProducts();
                            Alert.alert('Success', 'Product deleted successfully');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete product');
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (product: Product) => {
        navigation.navigate('SellerEditProduct', { product });
    };

    // ============================================================
    // NEW: Toggle visibility handler
    // ============================================================
    const handleToggleVisibility = async (product: Product) => {
        const isVisible = product.seller_active === 1;
        const newStatus = isVisible ? 0 : 1;
        const action = newStatus === 1 ? 'Show' : 'Hide';
        
        Alert.alert(
            `${action} Product`,
            `Are you sure you want to ${action.toLowerCase()} "${product.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    onPress: async () => {
                        try {
                            setTogglingId(product.productID);
                            await apiService.toggleProductVisibility(product.productID, newStatus === 1);
                            await fetchProducts();
                            Alert.alert('Success', `Product ${action.toLowerCase()}ed successfully`);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to update visibility');
                        } finally {
                            setTogglingId(null);
                        }
                    }
                }
            ]
        );
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Approved', color: '#4CAF50', icon: 'checkmark-circle' };
            case 'pending':
                return { label: 'Pending', color: '#FF9F43', icon: 'time-outline' };
            case 'rejected':
                return { label: 'Rejected', color: '#FF6B6B', icon: 'close-circle' };
            default:
                return { label: 'Unknown', color: '#999', icon: 'alert-circle' };
        }
    };

    const getStatusIcon = (status: string): any => {
        switch (status) {
            case 'approved': return 'checkmark-circle';
            case 'pending': return 'time-outline';
            case 'rejected': return 'close-circle';
            default: return 'alert-circle';
        }
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const statusConfig = getStatusConfig(item.status);
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;
        const isDeleting = deletingId === item.productID;
        const isToggling = togglingId === item.productID;
        const isVisible = item.seller_active === 1;
        const isHiddenByMod = item.can_display === 0;

        // Determine visibility status
        let visibilityText = '';
        let visibilityColor = '';
        let visibilityIcon: any = '';

        if (isHiddenByMod) {
            visibilityText = 'Hidden by Moderator';
            visibilityColor = '#FF6B6B';
            visibilityIcon = 'shield-checkmark';
        } else if (!isVisible) {
            visibilityText = 'Hidden by Seller';
            visibilityColor = '#FF9F43';
            visibilityIcon = 'eye-off';
        } else {
            visibilityText = 'Visible';
            visibilityColor = '#4CAF50';
            visibilityIcon = 'eye';
        }

        return (
            <View style={[
                styles.productCard, 
                !isVisible && styles.hiddenCard,
                isHiddenByMod && styles.moderatorHiddenCard
            ]}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => navigation.navigate('ProductDetail', { productId: item.productID })}
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
                        {/* Visibility Badge */}
                        <View style={[styles.hiddenBadge, { backgroundColor: isHiddenByMod ? '#FF6B6B' : '#FF9F43' }]}>
                            <Ionicons name={visibilityIcon} size={12} color="#fff" />
                            <Text style={styles.hiddenBadgeText}>{visibilityText}</Text>
                        </View>
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {item.name}
                        </Text>
                        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                        <View style={styles.productMeta}>
                            <Text style={styles.productMetaText}>Qty: {item.quantity}</Text>
                            <Text style={styles.productMetaText}>Category: {item.categoryName || 'N/A'}</Text>
                        </View>
                        <View style={styles.statusContainer}>
                            <Ionicons name={getStatusIcon(item.status)} size={14} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                            {item.status === 'approved' && (
                                <View style={[styles.visibilityDot, { backgroundColor: isHiddenByMod ? '#FF6B6B' : (isVisible ? '#4CAF50' : '#FF9F43') }]} />
                            )}
                        </View>
                        {item.status === 'rejected' && item.rejected_reason && (
                            <Text style={styles.rejectedReason} numberOfLines={1}>
                                Reason: {item.rejected_reason}
                            </Text>
                        )}
                        {isHiddenByMod && item.moderation_notes && (
                            <Text style={styles.moderationNote} numberOfLines={1}>
                                📝 {item.moderation_notes}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEdit(item)}
                    >
                        <Ionicons name="create-outline" size={18} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    {/* Show/Hide Button - Only for approved products AND not hidden by moderator */}
                    {item.status === 'approved' && !isHiddenByMod && (
                        <TouchableOpacity 
                            style={[
                                styles.actionButton, 
                                isVisible ? styles.hideButton : styles.showButton
                            ]}
                            onPress={() => handleToggleVisibility(item)}
                            disabled={isToggling}
                        >
                            {isToggling ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons 
                                        name={isVisible ? "eye-off-outline" : "eye-outline"} 
                                        size={18} 
                                        color="#fff" 
                                    />
                                    <Text style={styles.actionButtonText}>
                                        {isVisible ? 'Hide' : 'Show'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Show disabled button if hidden by moderator */}
                    {item.status === 'approved' && isHiddenByMod && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.moderatorDisabledButton]}
                            disabled={true}
                        >
                            <Ionicons name="lock-closed-outline" size={18} color="#999" />
                            <Text style={styles.moderatorDisabledText}>Locked</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item.productID, item.name)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isSuspended) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>My Products</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.suspendedContainer}>
                    <Ionicons name="ban-outline" size={60} color="#6C5CE7" />
                    <Text style={styles.suspendedTitle}>Account Suspended</Text>
                    <Text style={styles.suspendedText}>
                        Your seller account has been suspended. You cannot manage products at this time.
                    </Text>
                    <TouchableOpacity 
                        style={styles.contactSupportButton}
                        onPress={() => Alert.alert('Contact Support', 'Support will reach out to you shortly.')}
                    >
                        <Text style={styles.contactSupportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="storefront-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to view your products
                    </Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginButtonText}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>My Products</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => navigation.navigate('SellerSellProduct')}
                >
                    <Ionicons name="add" size={24} color="#4CAF50" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your products..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.filterContainer}>
                {['all', 'pending', 'approved', 'rejected'].map((filter) => {
                    const count = products.filter(p => filter === 'all' ? true : p.status === filter).length;
                    const isActive = activeFilter === filter;
                    return (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Text>
                            <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                                <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                                    {count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading your products...</Text>
                </View>
            ) : filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>
                        {searchQuery.trim() ? 'No products match your search' : 'No products yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'Try a different search term' 
                            : 'Start selling by adding your first product!'}
                    </Text>
                    {!searchQuery.trim() && (
                        <TouchableOpacity 
                            style={styles.browseButton}
                            onPress={() => navigation.navigate('SellerSellProduct')}
                        >
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.browseButtonText}>Add Product</Text>
                        </TouchableOpacity>
                    )}
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
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    filterText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
    },
    filterBadge: {
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 16,
        alignItems: 'center',
    },
    filterBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    filterBadgeText: {
        fontSize: 10,
        color: '#666',
        fontWeight: 'bold',
    },
    filterBadgeTextActive: {
        color: '#fff',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
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
        borderColor: '#FF9F43',
        borderWidth: 1.5,
        backgroundColor: '#fffbf0',
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
    hiddenBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 159, 67, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    hiddenBadgeText: {
        fontSize: 10,
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
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    visibilityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 6,
    },
    rejectedReason: {
        fontSize: 11,
        color: '#FF6B6B',
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
        paddingHorizontal: 14,
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
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '500',
    },
    hideButton: {
        backgroundColor: '#FF9F43',
        borderWidth: 1,
        borderColor: '#FF9F43',
    },
    showButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    actionButtonText: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    deleteButtonText: {
        fontSize: 13,
        color: '#FF6B6B',
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
    browseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
    suspendedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: '#f8f9fa',
    },
    suspendedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    suspendedText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    contactSupportButton: {
        marginTop: 24,
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    contactSupportButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    moderatorHiddenCard: {
        borderColor: '#FF6B6B',
        borderWidth: 1.5,
        backgroundColor: '#fff5f5',
    },
    moderatorDisabledButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
        opacity: 0.6,
    },
    moderatorDisabledText: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },
    moderationNote: {
        fontSize: 11,
        color: '#FF6B6B',
        marginTop: 2,
        fontStyle: 'italic',
    },
});

export default Seller_My_Products;