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
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface Product {
    productID: number;
    name: string;
    description: string;
    price: number;
    condition: string;
    quantity: number;
    categoryID: number | null;
    categoryName: string;
    image_path: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    can_display: number;
    seller_active: number;
    sellerName: string;
    sellerEmail: string;
    moderation_notes?: string;
    is_deleted?: number;
}

interface ProductStats {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
}

const Admin_Product_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [stats, setStats] = useState<ProductStats>({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    });
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const limit = 15;

    // Modals
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'hide' | 'show' | 'delete' | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Edit Form
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        price: '',
        quantity: '',
        condition: 'Normal',
        categoryID: '',
        status: ''
    });

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchProducts();
        }
    }, [isAuthenticated, page, statusFilter, showDeleted]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await apiService.getProductsForAdmin(page, limit, searchQuery, statusFilter, showDeleted);
            if (response && response.success) {
                setProducts(response.data || []);
                setStats(response.stats || { total: 0, approved: 0, pending: 0, rejected: 0 });
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalProducts(response.pagination?.total || 0);
            } else {
                setProducts([]);
            }
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

    const handleSearch = () => {
        setPage(1);
        fetchProducts();
    };

    const applyFilter = (filter: string) => {
        setStatusFilter(filter);
        if (filter === 'deleted') {
            setShowDeleted(true);
        } else {
            setShowDeleted(false);
        }
        setPage(1);
        setShowFilterDropdown(false);
    };

    const handleViewProduct = async (productID: number) => {
        try {
            const response = await apiService.getProductForAdmin(productID);
            if (response && response.success) {
                setSelectedProduct(response.data);
                setShowViewModal(true);
            } else {
                Alert.alert('Error', 'Failed to load product details');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load product details');
        }
    };

    const handleAction = (product: Product, action: 'approve' | 'reject' | 'hide' | 'show' | 'delete') => {
        if (action === 'delete') {
            Alert.alert(
                'Delete Product',
                `Delete "${product.name}"? This will permanently remove it from all users.\n\nAdmins can still view it in the "Deleted" filter.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => confirmAction(product, action)
                    }
                ]
            );
            return;
        }

        if (action === 'reject') {
            setSelectedProduct(product);
            setActionType(action);
            setActionReason('');
            setShowActionModal(true);
            return;
        }

        confirmAction(product, action);
    };

    const confirmAction = async (product: Product, action: 'approve' | 'reject' | 'hide' | 'show' | 'delete') => {
        const actionLabels = {
            approve: 'Approve',
            reject: 'Reject',
            hide: 'Hide',
            show: 'Show',
            delete: 'Delete'
        };

        if (action === 'reject' && !actionReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejection');
            return;
        }

        try {
            setProcessingId(product.productID);
            
            if (action === 'delete') {
                await apiService.softDeleteProduct(product.productID);
            } else {
                await apiService.adminProductAction({
                    productID: product.productID,
                    action: action,
                    reason: action === 'reject' ? actionReason : undefined
                });
            }
            
            Alert.alert('Success', `Product ${actionLabels[action].toLowerCase()}d successfully`);
            setShowActionModal(false);
            await fetchProducts();
        } catch (error: any) {
            Alert.alert('Error', error.message || `Failed to ${action} product`);
        } finally {
            setProcessingId(null);
            setSelectedProduct(null);
            setActionType(null);
            setActionReason('');
        }
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setEditForm({
            name: product.name || '',
            description: product.description || '',
            price: product.price?.toString() || '',
            quantity: product.quantity?.toString() || '',
            condition: product.condition || 'Normal',
            categoryID: product.categoryID?.toString() || '',
            status: product.status || ''
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

        try {
            await apiService.adminUpdateProduct(selectedProduct.productID, {
                name: editForm.name.trim(),
                description: editForm.description.trim(),
                price: priceNum,
                quantity: parseInt(editForm.quantity) || 0,
                condition: editForm.condition,
                categoryID: parseInt(editForm.categoryID) || 0,
                status: editForm.status
            });
            Alert.alert('Success', 'Product updated successfully');
            setShowEditModal(false);
            await fetchProducts();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update product');
        }
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

    const getVisibilityStatus = (product: Product) => {
        if (product.can_display === 0) {
            return { label: 'Hidden by Mod', color: '#FF6B6B', icon: 'eye-off' };
        }
        if (product.seller_active === 0) {
            return { label: 'Hidden by Seller', color: '#FF9F43', icon: 'pause-circle' };
        }
        return { label: 'Visible', color: '#4CAF50', icon: 'eye' };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderStatsCard = () => (
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#333' }]}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#FF9F43' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats.rejected}</Text>
                <Text style={styles.statLabel}>Rejected</Text>
            </View>
        </View>
    );

    const renderProductCard = ({ item }: { item: Product }) => {
        const statusConfig = getStatusConfig(item.status);
        const visibility = getVisibilityStatus(item);
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;
        const isProcessing = processingId === item.productID;
        const isDeleted = item.is_deleted === 1;

        return (
            <View style={[styles.productCard, { borderLeftColor: statusConfig.color, borderLeftWidth: 4, opacity: isDeleted ? 0.6 : 1 }]}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => handleViewProduct(item.productID)}
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
                        {isDeleted && (
                            <View style={styles.deletedBadge}>
                                <Ionicons name="skull-outline" size={12} color="#fff" />
                                <Text style={styles.deletedBadgeText}>Ghost</Text>
                            </View>
                        )}
                        {!isDeleted && (
                            <View style={[styles.visibilityBadge, { backgroundColor: visibility.color }]}>
                                <Ionicons name={visibility.icon as any} size={10} color="#fff" />
                                <Text style={styles.visibilityBadgeText}>{visibility.label}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.productInfo}>
                        <Text style={[styles.productName, isDeleted && styles.deletedText]} numberOfLines={1}>
                            {item.name}
                            {isDeleted && ' 💀'}
                        </Text>
                        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
                        <View style={styles.productMeta}>
                            <Text style={styles.productMetaText}>{item.categoryName || 'Uncategorized'}</Text>
                            <Text style={styles.productMetaText}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={styles.statusContainer}>
                            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                        <Text style={styles.sellerName}>👤 {item.sellerName}</Text>
                        {isDeleted && (
                            <Text style={styles.deletedDate}>🗑️ Deleted</Text>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewProduct(item.productID)}
                    >
                        <Ionicons name="eye-outline" size={14} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    {!isDeleted && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => handleEditProduct(item)}
                        >
                            <Ionicons name="create-outline" size={14} color="#4CAF50" />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    )}

                    {item.status === 'pending' && !isDeleted && (
                        <>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => handleAction(item, 'approve')}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                        <Text style={styles.actionButtonText}>Approve</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => handleAction(item, 'reject')}
                                disabled={isProcessing}
                            >
                                <Ionicons name="close" size={14} color="#fff" />
                                <Text style={styles.actionButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {item.status !== 'pending' && !isDeleted && (
                        <TouchableOpacity 
                            style={[styles.actionButton, item.can_display === 1 ? styles.hideButton : styles.showButton]}
                            onPress={() => handleAction(item, item.can_display === 1 ? 'hide' : 'show')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons 
                                        name={item.can_display === 1 ? "eye-off-outline" : "eye-outline"} 
                                        size={14} 
                                        color="#fff" 
                                    />
                                    <Text style={styles.actionButtonText}>
                                        {item.can_display === 1 ? 'Hide' : 'Show'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {!isDeleted && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleAction(item, 'delete')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FF6B6B" />
                            ) : (
                                <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
                            )}
                        </TouchableOpacity>
                    )}
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
                <Text style={styles.storeTitle}>Product Management</Text>
                <Text style={styles.countBadge}>{totalProducts}</Text>
            </View>

            {/* Stats */}
            {renderStatsCard()}

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
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

                <View style={styles.filterContainer}>
                    <TouchableOpacity 
                        style={styles.filterButton}
                        onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                    >
                        <Ionicons name="options-outline" size={18} color="#555" />
                        <Text style={styles.filterButtonText}>
                            {statusFilter === 'all' ? 'All' : 
                             statusFilter === 'deleted' ? '🗑️ Deleted' :
                             statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                        </Text>
                        <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#555" />
                    </TouchableOpacity>

                    {showFilterDropdown && (
                        <View style={styles.filterDropdown}>
                            {['all', 'pending', 'approved', 'rejected', 'deleted'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.filterDropdownItem,
                                        statusFilter === status && styles.filterDropdownItemActive
                                    ]}
                                    onPress={() => applyFilter(status)}
                                >
                                    <Text style={[
                                        styles.filterDropdownText,
                                        statusFilter === status && styles.filterDropdownTextActive
                                    ]}>
                                        {status === 'all' ? 'All' :
                                         status === 'deleted' ? '🗑️ Deleted' :
                                         status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Text>
                                    {statusFilter === status && (
                                        <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            ) : products.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Products Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No products match your search.' 
                            : statusFilter === 'deleted' 
                                ? 'No products have been deleted.' 
                                : 'No products have been listed yet.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={products}
                        renderItem={renderProductCard}
                        keyExtractor={(item) => item.productID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
            )}

            {/* View Product Modal */}
            <Modal
                visible={showViewModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowViewModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowViewModal(false)}
                    />
                    <View style={styles.viewModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Product Details</Text>
                            <TouchableOpacity onPress={() => setShowViewModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedProduct && (
                                <View style={styles.modalBody}>
                                    <Image 
                                        source={{ uri: `${imageBaseUrl}${selectedProduct.image_path}` }} 
                                        style={styles.modalImage}
                                        defaultSource={require('../assets/placeholder.png')}
                                    />
                                    
                                    {selectedProduct.is_deleted === 1 && (
                                        <View style={styles.modalDeletedBadge}>
                                            <Ionicons name="skull-outline" size={16} color="#fff" />
                                            <Text style={styles.modalDeletedBadgeText}>Ghost Product</Text>
                                        </View>
                                    )}
                                    
                                    <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                                    <Text style={styles.modalProductPrice}>${selectedProduct.price.toFixed(2)}</Text>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Status:</Text>
                                        <Text style={[styles.modalValue, { color: getStatusConfig(selectedProduct.status).color }]}>
                                            {getStatusConfig(selectedProduct.status).label}
                                        </Text>
                                    </View>

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
                                        <Text style={styles.modalValue}>{selectedProduct.sellerName}</Text>
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

                                    {selectedProduct.moderation_notes && (
                                        <>
                                            <View style={styles.modalDivider} />
                                            <Text style={styles.modalSectionTitle}>Moderation Notes</Text>
                                            <Text style={styles.modalDescription}>{selectedProduct.moderation_notes}</Text>
                                        </>
                                    )}

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Description</Text>
                                    <Text style={styles.modalDescription}>
                                        {selectedProduct.description || 'No description provided.'}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowViewModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Product Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.editModalOverlay}>
                    <TouchableOpacity 
                        style={styles.editModalBackdrop}
                        onPress={() => setShowEditModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.editModalContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                    >
                        <View style={styles.editModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Product</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.editModalScrollContent}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.editForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Product Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.name}
                                            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                            placeholder="Product name"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={editForm.description}
                                            onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                                            placeholder="Description"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Price *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.price}
                                            onChangeText={(text) => setEditForm({ ...editForm, price: text })}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Quantity</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.quantity}
                                            onChangeText={(text) => setEditForm({ ...editForm, quantity: text })}
                                            placeholder="Quantity"
                                            keyboardType="number-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Condition</Text>
                                        <View style={styles.conditionContainer}>
                                            {['Excellent', 'Good', 'Normal', 'Subpar'].map((cond) => (
                                                <TouchableOpacity
                                                    key={cond}
                                                    style={[
                                                        styles.conditionChip,
                                                        editForm.condition === cond && styles.conditionChipActive
                                                    ]}
                                                    onPress={() => setEditForm({ ...editForm, condition: cond })}
                                                >
                                                    <Text style={[
                                                        styles.conditionChipText,
                                                        editForm.condition === cond && styles.conditionChipTextActive
                                                    ]}>
                                                        {cond}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Status</Text>
                                        <View style={styles.statusSelector}>
                                            {['pending', 'approved', 'rejected'].map((status) => (
                                                <TouchableOpacity
                                                    key={status}
                                                    style={[
                                                        styles.statusChip,
                                                        editForm.status === status && styles.statusChipActive
                                                    ]}
                                                    onPress={() => setEditForm({ ...editForm, status: status })}
                                                >
                                                    <Text style={[
                                                        styles.statusChipText,
                                                        editForm.status === status && styles.statusChipTextActive
                                                    ]}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.editModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editModalCancel]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={styles.editModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editModalSave]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={styles.editModalSaveText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Action Modal (Reject Reason) */}
            <Modal
                visible={showActionModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowActionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowActionModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.actionModalContent}
                    >
                        <View style={styles.actionModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reject Product</Text>
                                <TouchableOpacity onPress={() => setShowActionModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.actionModalSubtitle}>
                                Please provide a reason for rejecting "{selectedProduct?.name}":
                            </Text>

                            <TextInput
                                style={styles.actionInput}
                                placeholder="Enter rejection reason..."
                                placeholderTextColor="#999"
                                value={actionReason}
                                onChangeText={setActionReason}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.actionModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.actionModalButton, styles.actionModalCancel]}
                                    onPress={() => setShowActionModal(false)}
                                >
                                    <Text style={styles.actionModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionModalButton, styles.actionModalSubmit]}
                                    onPress={() => selectedProduct && confirmAction(selectedProduct, 'reject')}
                                >
                                    <Text style={styles.actionModalSubmitText}>Reject</Text>
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
        backgroundColor: '#DC3545',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8,
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
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
        position: 'relative',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 4,
    },
    filterButtonText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    filterDropdown: {
        position: 'absolute',
        top: 44,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minWidth: 150,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    filterDropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterDropdownItemActive: {
        backgroundColor: '#e8f5e9',
    },
    filterDropdownText: {
        fontSize: 14,
        color: '#333',
    },
    filterDropdownTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
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
        borderLeftWidth: 4,
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
    deletedBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(108, 92, 231, 0.9)',
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
    deletedText: {
        color: '#999',
    },
    deletedDate: {
        fontSize: 11,
        color: '#6C5CE7',
        marginTop: 2,
        fontWeight: '500',
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
        marginTop: 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    sellerName: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8,
        marginTop: 8,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 3,
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 10,
        color: '#3498DB',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    editButtonText: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: '500',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF6B6B',
        borderWidth: 1,
        borderColor: '#FF6B6B',
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
    deleteButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
        paddingHorizontal: 8,
    },
    deleteButtonText: {
        fontSize: 10,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    actionButtonText: {
        fontSize: 10,
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
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackground: {
        flex: 1,
    },
    viewModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%',
        paddingBottom: 20,
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
    modalBody: {
        padding: 20,
    },
    modalImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        marginBottom: 12,
    },
    modalDeletedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 6,
        marginBottom: 8,
    },
    modalDeletedBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
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
        marginTop: 2,
    },
    modalRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        width: 90,
        fontWeight: '500',
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
    modalSectionTitle: {
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
    modalCloseButton: {
        backgroundColor: '#DC3545',
        marginHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Edit Modal
    editModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    editModalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    editModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    editModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%',
        paddingBottom: 20,
    },
    editModalScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    editForm: {
        marginTop: 8,
        paddingBottom: 20,
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
        fontSize: 15,
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
    conditionChipActive: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4CAF50',
    },
    conditionChipText: {
        fontSize: 13,
        color: '#666',
    },
    conditionChipTextActive: {
        color: '#4CAF50',
        fontWeight: '500',
    },
    statusSelector: {
        flexDirection: 'row',
        gap: 6,
    },
    statusChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    statusChipActive: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4CAF50',
    },
    statusChipText: {
        fontSize: 13,
        color: '#666',
    },
    statusChipTextActive: {
        color: '#4CAF50',
        fontWeight: '500',
    },
    editModalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    editModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    editModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    editModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    editModalSave: {
        backgroundColor: '#DC3545',
    },
    editModalSaveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Action Modal
    actionModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    actionModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
    },
    actionModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 12,
    },
    actionInput: {
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
    actionModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    actionModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    actionModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    actionModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    actionModalSubmit: {
        backgroundColor: '#DC3545',
    },
    actionModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Product_Management;