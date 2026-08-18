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
}

const Admin_Seller_Products = ({ route, navigation }: any) => {
    const { sellerID, sellerName } = route.params || {};
    const { user, isAuthenticated } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 15;

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated && sellerID) {
            fetchProducts();
        }
    }, [isAuthenticated, sellerID, page]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await apiService.getSellerProducts(sellerID, page, limit);
            if (response && response.success) {
                setProducts(response.data || []);
                setStats(response.stats || { total: 0, approved: 0, pending: 0, rejected: 0 });
                setTotalPages(response.pagination?.totalPages || 1);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error('Error fetching seller products:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const renderProduct = ({ item }: { item: Product }) => {
        const statusConfig = getStatusConfig(item.status);
        const imageUrl = item.image_path ? `${imageBaseUrl}${item.image_path}` : null;

        return (
            <View style={[styles.productCard, { borderLeftColor: statusConfig.color, borderLeftWidth: 4 }]}>
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
                            <Text style={styles.productMetaText}>{item.categoryName}</Text>
                            <Text style={styles.productMetaText}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={styles.statusContainer}>
                            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                        <Text style={styles.productDate}>📅 {formatDate(item.created_at)}</Text>
                    </View>
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

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle} numberOfLines={1}>
                    Products: {sellerName || 'Seller'}
                </Text>
                <Text style={styles.countBadge}>{stats.total}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
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
                        This seller hasn't listed any products yet.
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={products}
                        renderItem={renderProduct}
                        keyExtractor={(item) => item.productID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
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
        fontSize: 18,
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
    productContent: {
        flexDirection: 'row',
    },
    imageContainer: {
        width: 80,
        height: 80,
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
    productDate: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 2,
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
});

export default Admin_Seller_Products;