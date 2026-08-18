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
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
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

interface Order {
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
    shipping_phone: string;
    payment_method: string;
    payment_status: string;
    item_count: number;
    items?: OrderItem[];
}

interface OrderStats {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    completed: number;
    cancelled: number;
    totalRevenue: number;
}

const Admin_Order_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [stats, setStats] = useState<OrderStats>({
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0,
        totalRevenue: 0
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchOrders();
        }
    }, [isAuthenticated]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAllOrdersForAdmin();
            if (response && response.success) {
                setOrders(response.data || []);
                setFilteredOrders(response.data || []);
                setStats(response.stats || {
                    total: 0,
                    pending: 0,
                    processing: 0,
                    shipped: 0,
                    completed: 0,
                    cancelled: 0,
                    totalRevenue: 0
                });
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

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            await fetchOrders();
            return;
        }

        const orderID = parseInt(searchQuery.trim());
        if (isNaN(orderID) || orderID <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid order ID (number)');
            return;
        }

        setIsSearching(true);
        try {
            const response = await apiService.getOrderDetailsForAdmin(orderID);
            if (response && response.success) {
                setOrders([response.data]);
                setFilteredOrders([response.data]);
                Alert.alert('Order Found', `Order #${orderID} found!`);
            } else {
                Alert.alert('Not Found', `Order #${orderID} not found`);
                setOrders([]);
                setFilteredOrders([]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to search for order');
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        fetchOrders();
    };

    const applyFilter = (status: string) => {
        setActiveFilter(status);
        if (searchQuery) {
            setSearchQuery('');
        }
        if (status === 'all') {
            fetchOrders();
        } else {
            const filtered = orders.filter(order => order.orderStatus === status);
            setFilteredOrders(filtered);
        }
        setShowFilterDropdown(false);
    };

    const handleViewOrder = async (order: Order) => {
        try {
            const response = await apiService.getOrderDetailsForAdmin(order.orderID);
            if (response && response.success) {
                setSelectedOrder(response.data);
                setShowDetailsModal(true);
            } else {
                Alert.alert('Error', 'Failed to load order details');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load order details');
        }
    };

    const handleUpdateStatus = (order: Order) => {
        setSelectedOrder(order);
        setSelectedStatus(order.orderStatus);
        setShowStatusModal(true);
    };

    const handleConfirmStatusUpdate = async () => {
        if (!selectedOrder || !selectedStatus) return;
        if (selectedStatus === selectedOrder.orderStatus) {
            Alert.alert('Info', 'Status is already set to this value');
            setShowStatusModal(false);
            return;
        }

        try {
            setUpdatingId(selectedOrder.orderID);
            await apiService.updateOrderStatus(selectedOrder.orderID, selectedStatus);
            Alert.alert('Success', `Order status updated to ${selectedStatus}`);
            setShowStatusModal(false);
            await fetchOrders();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update order status');
        } finally {
            setUpdatingId(null);
            setSelectedOrder(null);
        }
    };

    const handleCancelOrder = (order: Order) => {
        if (order.orderStatus === 'Completed') {
            Alert.alert('Cannot Cancel', 'Completed orders cannot be cancelled');
            return;
        }
        setSelectedOrder(order);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedOrder) return;
        if (!cancelReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for cancellation');
            return;
        }

        try {
            setUpdatingId(selectedOrder.orderID);
            await apiService.cancelOrderAdmin(selectedOrder.orderID, cancelReason.trim());
            Alert.alert('Success', 'Order cancelled successfully');
            setShowCancelModal(false);
            await fetchOrders();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to cancel order');
        } finally {
            setUpdatingId(null);
            setSelectedOrder(null);
            setCancelReason('');
        }
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

    const getAvailableStatuses = (currentStatus: string) => {
        const transitions: { [key: string]: string[] } = {
            'Pending': ['Processing', 'Cancelled'],
            'Processing': ['Shipped'],
            'Shipped': ['Completed'],
            'Completed': [],
            'Cancelled': []
        };
        return transitions[currentStatus] || [];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    const renderStats = () => (
        <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
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
            </View>
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats.cancelled}</Text>
                    <Text style={styles.statLabel}>Cancelled</Text>
                </View>
                <View style={[styles.statCard, styles.revenueCard]}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                        {formatCurrency(stats.totalRevenue)}
                    </Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
            </View>
        </View>
    );

    const renderOrderItem = ({ item }: { item: Order }) => {
        const statusConfig = getStatusConfig(item.orderStatus);
        const isUpdating = updatingId === item.orderID;

        return (
            <View style={[styles.orderCard, { borderLeftColor: statusConfig.color, borderLeftWidth: 4 }]}>
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
                    <Text style={styles.orderItems}>📦 {item.item_count || 0} items</Text>
                    <Text style={styles.orderPayment}>
                        💳 {item.payment_method === 'COD' ? 'Cash on Delivery' : item.payment_method}
                    </Text>
                </View>

                <View style={styles.orderFooter}>
                    <Text style={styles.orderTotal}>{formatCurrency(item.totalPrice)}</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.viewButton]}
                            onPress={() => handleViewOrder(item)}
                            disabled={isUpdating}
                        >
                            <Ionicons name="eye-outline" size={16} color="#3498DB" />
                            <Text style={styles.viewButtonText}>View</Text>
                        </TouchableOpacity>

                        {item.orderStatus !== 'Completed' && item.orderStatus !== 'Cancelled' && (
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.updateButton]}
                                onPress={() => handleUpdateStatus(item)}
                                disabled={isUpdating}
                            >
                                {isUpdating ? (
                                    <ActivityIndicator size="small" color="#4CAF50" />
                                ) : (
                                    <>
                                        <Ionicons name="refresh-outline" size={16} color="#4CAF50" />
                                        <Text style={styles.updateButtonText}>Update</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {item.orderStatus !== 'Completed' && item.orderStatus !== 'Cancelled' && (
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => handleCancelOrder(item)}
                                disabled={isUpdating}
                            >
                                <Ionicons name="close-circle-outline" size={16} color="#FF6B6B" />
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
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
                        You need admin privileges to manage orders.
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
                <Text style={styles.storeTitle}>Order Management</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            {renderStats()}

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by Order ID..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        keyboardType="number-pad"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={clearSearch}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={styles.searchButton}
                        onPress={handleSearch}
                        disabled={isSearching}
                    >
                        {isSearching ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.searchButtonText}>Search</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </View>

            <View style={styles.filterTabs}>
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
                    <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>
                        {searchQuery ? 'Order Not Found' : activeFilter !== 'all' ? 'No orders found' : 'No orders yet'}
                    </Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery 
                            ? `Order #${searchQuery} not found.`
                            : activeFilter !== 'all' 
                                ? `No ${activeFilter.toLowerCase()} orders.`
                                : 'Orders will appear here when customers make purchases.'}
                    </Text>
                    {searchQuery && (
                        <TouchableOpacity 
                            style={styles.clearSearchButton}
                            onPress={clearSearch}
                        >
                            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
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

            <Modal
                visible={showDetailsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowDetailsModal(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Order #{selectedOrder?.orderID}</Text>
                            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedOrder && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalStatusRow}>
                                        <Text style={styles.modalLabel}>Status:</Text>
                                        <View style={[styles.modalStatusBadge, { backgroundColor: getStatusConfig(selectedOrder.orderStatus).color + '20' }]}>
                                            <Ionicons name={getStatusConfig(selectedOrder.orderStatus).icon as any} size={14} color={getStatusConfig(selectedOrder.orderStatus).color} />
                                            <Text style={[styles.modalStatusText, { color: getStatusConfig(selectedOrder.orderStatus).color }]}>
                                                {getStatusConfig(selectedOrder.orderStatus).label}
                                            </Text>
                                        </View>
                                    </View>


                                    <View style={styles.modalStatusRow}>
                                        <Text style={styles.modalLabel}>Payment:</Text>
                                        <View style={[styles.modalStatusBadge, { backgroundColor: selectedOrder.payment_status === 'Paid' ? '#4CAF5020' : '#FF9F4320' }]}>
                                            <Ionicons name={selectedOrder.payment_status === 'Paid' ? "checkmark-circle" : "time-outline"} size={14} color={selectedOrder.payment_status === 'Paid' ? '#4CAF50' : '#FF9F43'} />
                                            <Text style={[styles.modalStatusText, { color: selectedOrder.payment_status === 'Paid' ? '#4CAF50' : '#FF9F43' }]}>
                                                {selectedOrder.payment_status || 'Pending'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.modalSectionTitle}>👤 Buyer</Text>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Name:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.buyer_name}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Email:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.buyer_email}</Text>
                                    </View>

                                    <Text style={styles.modalSectionTitle}>📦 Items</Text>
                                    {selectedOrder.items && selectedOrder.items.map((item) => (
                                        <View key={item.orderItemID} style={styles.modalOrderItem}>
                                            <View style={styles.modalOrderItemImage}>
                                                {item.image_path ? (
                                                    <Image 
                                                        source={{ uri: `${imageBaseUrl}${item.image_path}` }} 
                                                        style={styles.modalOrderItemImg}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[styles.modalOrderItemImg, styles.imagePlaceholder]}>
                                                        <Ionicons name="image-outline" size={20} color="#ccc" />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.modalOrderItemInfo}>
                                                <Text style={styles.modalOrderItemName} numberOfLines={2}>
                                                    {item.product_name}
                                                </Text>
                                                <Text style={styles.modalOrderItemQty}>Qty: {item.quantity}</Text>
                                            </View>
                                            <Text style={styles.modalOrderItemPrice}>
                                                ${(item.price_at_purchase * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}

                                    <View style={styles.modalDivider} />

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Total:</Text>
                                        <Text style={[styles.modalValue, { fontWeight: 'bold', color: '#4CAF50' }]}>
                                            {formatCurrency(selectedOrder.totalPrice)}
                                        </Text>
                                    </View>


                                    <Text style={styles.modalSectionTitle}>📍 Shipping</Text>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Name:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.shipping_name}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Address:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.shipping_address}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>City:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.shipping_city}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Postal:</Text>
                                        <Text style={styles.modalValue}>{selectedOrder.shipping_postal_code}</Text>
                                    </View>
                                    {selectedOrder.shipping_phone && (
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Phone:</Text>
                                            <Text style={styles.modalValue}>{selectedOrder.shipping_phone}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {selectedOrder && selectedOrder.orderStatus !== 'Completed' && selectedOrder.orderStatus !== 'Cancelled' && (
                                <>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.modalUpdateButton]}
                                        onPress={() => {
                                            setShowDetailsModal(false);
                                            handleUpdateStatus(selectedOrder);
                                        }}
                                    >
                                        <Ionicons name="refresh-outline" size={18} color="#fff" />
                                        <Text style={styles.modalButtonText}>Update Status</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.modalButton, styles.modalCancelButton]}
                                        onPress={() => {
                                            setShowDetailsModal(false);
                                            handleCancelOrder(selectedOrder);
                                        }}
                                    >
                                        <Ionicons name="close-circle-outline" size={18} color="#fff" />
                                        <Text style={styles.modalButtonText}>Cancel Order</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalCloseButton]}
                                onPress={() => setShowDetailsModal(false)}
                            >
                                <Text style={styles.modalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


            <Modal
                visible={showStatusModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowStatusModal(false)}
                    />
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statusModalBody}>
                            <Text style={styles.statusModalOrder}>Order #{selectedOrder?.orderID}</Text>
                            <Text style={styles.statusModalCurrent}>Current: {selectedOrder && getStatusConfig(selectedOrder.orderStatus).label}</Text>

                            <View style={styles.statusOptions}>
                                {selectedOrder && getAvailableStatuses(selectedOrder.orderStatus).map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={[
                                            styles.statusOption,
                                            selectedStatus === status && styles.statusOptionSelected
                                        ]}
                                        onPress={() => setSelectedStatus(status)}
                                    >
                                        <View style={[styles.statusOptionDot, { backgroundColor: getStatusConfig(status).color }]} />
                                        <Text style={[
                                            styles.statusOptionText,
                                            selectedStatus === status && styles.statusOptionTextSelected
                                        ]}>
                                            {getStatusConfig(status).label}
                                        </Text>
                                        {selectedStatus === status && (
                                            <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.statusModalFooter}>
                            <TouchableOpacity 
                                style={[styles.statusModalButton, styles.statusModalCancel]}
                                onPress={() => setShowStatusModal(false)}
                            >
                                <Text style={styles.statusModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.statusModalButton, styles.statusModalSave]}
                                onPress={handleConfirmStatusUpdate}
                            >
                                <Text style={styles.statusModalSaveText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showCancelModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCancelModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowCancelModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.cancelModalContent}
                    >
                        <View style={styles.cancelModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Cancel Order</Text>
                                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.cancelModalBody}>
                                <Text style={styles.cancelModalOrder}>Order #{selectedOrder?.orderID}</Text>
                                <Text style={styles.cancelModalSubtitle}>
                                    Please provide a reason for cancelling this order:
                                </Text>

                                <TextInput
                                    style={styles.cancelInput}
                                    placeholder="Enter cancellation reason..."
                                    placeholderTextColor="#999"
                                    value={cancelReason}
                                    onChangeText={setCancelReason}
                                    multiline
                                    numberOfLines={4}
                                />

                                <Text style={styles.cancelModalWarning}>
                                    ⚠️ This action will restore product stock and cannot be undone.
                                </Text>
                            </View>

                            <View style={styles.cancelModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.cancelModalButton, styles.cancelModalCancel]}
                                    onPress={() => setShowCancelModal(false)}
                                >
                                    <Text style={styles.cancelModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.cancelModalButton, styles.cancelModalSubmit]}
                                    onPress={handleConfirmCancel}
                                >
                                    <Text style={styles.cancelModalSubmitText}>Confirm Cancel</Text>
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
    statsContainer: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 4,
    },
    statCard: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 2,
    },
    revenueCard: {
        flex: 1.5,
    },
    statNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 10,
        color: '#999',
        marginTop: 1,
    },

    searchContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minWidth: 200,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
        paddingVertical: 4,
    },
    searchButton: {
        backgroundColor: '#DC3545',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 4,
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
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
        minWidth: 180,
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

    filterTabs: {
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
        backgroundColor: '#DC3545',
        borderColor: '#DC3545',
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
        gap: 2,
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
    orderPayment: {
        fontSize: 12,
        color: '#888',
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
    actionButtons: {
        flexDirection: 'row',
        gap: 6,
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
        fontSize: 11,
        color: '#3498DB',
        fontWeight: '500',
    },
    updateButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    updateButtonText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '500',
    },
    cancelButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    cancelButtonText: {
        fontSize: 11,
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
    clearSearchButton: {
        marginTop: 16,
        backgroundColor: '#DC3545',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    clearSearchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
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
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
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
    modalStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    modalStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    modalStatusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginTop: 12,
        marginBottom: 4,
    },
    modalRow: {
        flexDirection: 'row',
        paddingVertical: 2,
    },
    modalLabel: {
        fontSize: 13,
        color: '#666',
        width: 70,
    },
    modalValue: {
        fontSize: 13,
        color: '#333',
        flex: 1,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 8,
    },
    modalOrderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalOrderItemImage: {
        width: 40,
        height: 40,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginRight: 10,
    },
    modalOrderItemImg: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOrderItemInfo: {
        flex: 1,
    },
    modalOrderItemName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#333',
    },
    modalOrderItemQty: {
        fontSize: 11,
        color: '#999',
    },
    modalOrderItemPrice: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
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
    modalUpdateButton: {
        backgroundColor: '#4CAF50',
    },
    modalCancelButton: {
        backgroundColor: '#FF6B6B',
    },
    modalCloseButton: {
        backgroundColor: '#f0f0f0',
        flex: 0.5,
    },
    modalCloseText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    statusModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    statusModalBody: {
        padding: 20,
    },
    statusModalOrder: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    statusModalCurrent: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    statusOptions: {
        gap: 8,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        gap: 10,
    },
    statusOptionSelected: {
        borderColor: '#DC3545',
        backgroundColor: '#fff5f5',
    },
    statusOptionDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusOptionText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    statusOptionTextSelected: {
        color: '#DC3545',
        fontWeight: '600',
    },
    statusModalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
    },
    statusModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    statusModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    statusModalCancelText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '500',
    },
    statusModalSave: {
        backgroundColor: '#DC3545',
    },
    statusModalSaveText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },

    cancelModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    cancelModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
    },
    cancelModalBody: {
        marginTop: 8,
    },
    cancelModalOrder: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    cancelModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    cancelInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    cancelModalWarning: {
        fontSize: 12,
        color: '#FF6B6B',
        marginTop: 10,
    },
    cancelModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    cancelModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    cancelModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    cancelModalSubmit: {
        backgroundColor: '#DC3545',
    },
    cancelModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Order_Management;