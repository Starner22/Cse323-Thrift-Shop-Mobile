import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    FlatList,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface OrderItem {
    orderItemID: number;
    productID: number;
    product_name: string;
    quantity: number;
    price_at_purchase: number;
    image_path: string;
}

interface SalesOrder {
    orderID: number;
    buyerID: number;
    buyer_name: string;
    buyer_email: string;
    totalPrice: number;
    orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';
    orderDate: string;
    shipping_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_postal_code: string;
    item_count: number;
    items: OrderItem[];
}

interface SalesStats {
    totalOrders: number;
    totalRevenue: number;
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
    cancelled: number;
}

const Seller_Sales_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<SalesOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [stats, setStats] = useState<SalesStats>({
        totalOrders: 0,
        totalRevenue: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchSellerOrders();
        }
    }, [isAuthenticated]);

    const fetchSellerOrders = async () => {
        try {
            setLoading(true);
            const response = await apiService.getSellerOrders();
            if (response && response.success) {
                setOrders(response.data || []);
                setFilteredOrders(response.data || []);
                setStats(response.stats || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    pending: 0,
                    processing: 0,
                    shipped: 0,
                    completed: 0,
                    cancelled: 0
                });
            } else {
                setOrders([]);
                setFilteredOrders([]);
            }
        } catch (error) {
            console.error('Error fetching seller orders:', error);
            Alert.alert('Error', 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSellerOrders();
        setRefreshing(false);
    };

    const applyFilter = (status: string) => {
        setActiveFilter(status);
        if (status === 'all') {
            setFilteredOrders(orders);
        } else {
            setFilteredOrders(orders.filter(order => order.orderStatus === status));
        }
    };

    const handleOrderPress = (orderID: number) => {
        navigation.navigate('SellerSalesDetails', { orderID });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Pending':
                return { label: 'Pending', color: '#FF9F43', icon: 'time-outline' };
            case 'Processing':
                return { label: 'Processing', color: '#3498DB', icon: 'refresh-outline' };
            case 'Shipped':
                return { label: 'Shipped', color: '#6C5CE7', icon: 'cube-outline' };
            case 'Completed':
                return { label: 'Completed', color: '#4CAF50', icon: 'checkmark-circle' };
            case 'Cancelled':
                return { label: 'Cancelled', color: '#FF6B6B', icon: 'close-circle' };
            default:
                return { label: 'Unknown', color: '#999', icon: 'alert-circle' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    const renderOrderItem = ({ item }: { item: SalesOrder }) => {
        const statusConfig = getStatusConfig(item.orderStatus);
        const itemNames = item.items.map(i => i.product_name).join(', ');

        return (
            <TouchableOpacity
                style={[styles.orderCard, { borderLeftColor: statusConfig.color, borderLeftWidth: 4 }]}
                onPress={() => handleOrderPress(item.orderID)}
                activeOpacity={0.7}
            >
                <View style={styles.orderHeader}>
                    <View style={styles.orderIdContainer}>
                        <Text style={styles.orderId}>Order #{item.orderID}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.orderDate}>{formatDate(item.orderDate)}</Text>
                </View>

                <View style={styles.orderBody}>
                    <View style={styles.orderBuyer}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.orderBuyerName}>{item.buyer_name}</Text>
                    </View>
                    <Text style={styles.orderItems} numberOfLines={1}>
                        {item.item_count} items: {itemNames}
                    </Text>
                </View>

                <View style={styles.orderFooter}>
                    <Text style={styles.orderTotal}>Sales: {formatCurrency(item.totalPrice)}</Text>
                    <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleOrderPress(item.orderID)}
                    >
                        <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                        {formatCurrency(stats.totalRevenue)}
                    </Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
            </View>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#FF9F43' }]}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#3498DB' }]}>{stats.processing}</Text>
                    <Text style={styles.statLabel}>Processing</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#6C5CE7' }]}>{stats.shipped}</Text>
                    <Text style={styles.statLabel}>Shipped</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
            </View>
        </View>
    );

    if (!isAuthenticated || user?.role !== 'Seller') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Access Denied</Text>
                    <Text style={styles.authRequiredSubtext}>
                        You need seller privileges to view sales.
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
                <Text style={styles.storeTitle}>My Sales</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Stats */}
            {renderStats()}

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'Pending', label: 'Pending' },
                    { key: 'Processing', label: 'Processing' },
                    { key: 'Shipped', label: 'Shipped' },
                    { key: 'Completed', label: 'Completed' },
                    { key: 'Cancelled', label: 'Cancelled' },
                ].map((filter) => {
                    const isActive = activeFilter === filter.key;
                    const count = orders.filter(o => filter.key === 'all' ? true : o.orderStatus === filter.key).length;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => applyFilter(filter.key)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {filter.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                                    <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading sales...</Text>
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cash-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>
                        {activeFilter !== 'all' ? 'No orders found' : 'No sales yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {activeFilter !== 'all' 
                            ? `You don't have any ${activeFilter.toLowerCase()} orders.`
                            : 'When buyers purchase your products, they\'ll appear here.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOrders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item.orderID.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
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
    statsContainer: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
    },
    statCard: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 4,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 4,
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
    filterBadge: {
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 18,
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
        paddingBottom: 20,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    orderIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    orderId: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    orderDate: {
        fontSize: 11,
        color: '#999',
    },
    orderBody: {
        marginBottom: 8,
        paddingLeft: 4,
        gap: 4,
    },
    orderBuyer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orderBuyerName: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    orderItems: {
        fontSize: 13,
        color: '#666',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    orderTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 12,
        color: '#3498DB',
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
});

export default Seller_Sales_Screen;