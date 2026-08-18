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

interface Order {
    orderID: number;
    totalPrice: number;
    orderStatus: 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled';
    orderDate: string;
    shipping_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_postal_code: string;
    item_count: number;
}

const Customer_Order_History = ({ navigation }: any) => {
    const { isAuthenticated } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await apiService.getMyOrders();
            if (response && response.success) {
                setOrders(response.data || []);
                setFilteredOrders(response.data || []);
            } else {
                setOrders([]);
                setFilteredOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            Alert.alert('Error', 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
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
        navigation.navigate('OrderDetails', { orderID });
    };

    const handleCancelOrder = (order: Order) => {
        if (order.orderStatus !== 'Pending') {
            Alert.alert('Cannot Cancel', 'Only pending orders can be cancelled');
            return;
        }

        Alert.alert(
            'Cancel Order',
            `Are you sure you want to cancel Order #${order.orderID}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await apiService.cancelOrder(order.orderID);
                            if (response && response.success) {
                                Alert.alert('Success', 'Order cancelled successfully');
                                await fetchOrders();
                            } else {
                                Alert.alert('Error', response?.message || 'Failed to cancel order');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel order');
                        }
                    }
                }
            ]
        );
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

    const renderOrderItem = ({ item }: { item: Order }) => {
        const statusConfig = getStatusConfig(item.orderStatus);
        const canCancel = item.orderStatus === 'Pending';

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
                    <Text style={styles.orderItems}>📦 {item.item_count} items</Text>
                    <Text style={styles.orderTotal}>${item.totalPrice.toFixed(2)}</Text>
                </View>

                <View style={styles.orderFooter}>
                    <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleOrderPress(item.orderID)}
                    >
                        <Text style={styles.viewButtonText}>View Details</Text>
                    </TouchableOpacity>

                    {canCancel && (
                        <TouchableOpacity 
                            style={styles.cancelButton}
                            onPress={() => handleCancelOrder(item)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel Order</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const getStatusCount = (status: string) => {
        if (status === 'all') return orders.length;
        return orders.filter(o => o.orderStatus === status).length;
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to view your orders
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

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>My Orders</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

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
                    const count = getStatusCount(filter.key);
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
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>
                        {activeFilter !== 'all' ? 'No orders found' : 'No orders yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {activeFilter !== 'all' 
                            ? `You don't have any ${activeFilter.toLowerCase()} orders.`
                            : 'Start shopping to see your orders here!'}
                    </Text>
                    {activeFilter === 'all' && (
                        <TouchableOpacity 
                            style={styles.shopButton}
                            onPress={() => navigation.navigate('BrowseAll')}
                        >
                            <Text style={styles.shopButtonText}>Start Shopping</Text>
                        </TouchableOpacity>
                    )}
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
        marginBottom: 8,
    },
    orderIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    orderId: {
        fontSize: 16,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingLeft: 4,
    },
    orderItems: {
        fontSize: 14,
        color: '#666',
    },
    orderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
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
    cancelButton: {
        backgroundColor: '#fff5f5',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    cancelButtonText: {
        fontSize: 12,
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
    shopButton: {
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    shopButtonText: {
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
});

export default Customer_Order_History;