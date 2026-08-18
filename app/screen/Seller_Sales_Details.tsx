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

interface SalesDetails {
    orderID: number;
    buyerID: number;
    buyer_name: string;
    buyer_email: string;
    buyer_phone: string;
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
    items: OrderItem[];
}

const Seller_Sales_Details = ({ route, navigation }: any) => {
    const { orderID } = route.params || {};
    const { isAuthenticated } = useAuth();
    const [sales, setSales] = useState<SalesDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated && orderID) {
            fetchSalesDetails();
        }
    }, [isAuthenticated, orderID]);

    const fetchSalesDetails = async () => {
        try {
            setLoading(true);
            const response = await apiService.getSellerOrderDetails(orderID);
            if (response && response.success) {
                setSales(response.data);
            } else {
                Alert.alert('Error', 'Failed to load sales details');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Error fetching sales details:', error);
            Alert.alert('Error', 'Failed to load sales details');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSalesDetails();
        setRefreshing(false);
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

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'Paid': return '#4CAF50';
            case 'Pending': return '#FF9F43';
            case 'Failed': return '#FF6B6B';
            default: return '#999';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading sales details...</Text>
            </SafeAreaView>
        );
    }

    if (!sales) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>Sales Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyTitle}>Sales Not Found</Text>
                    <TouchableOpacity 
                        style={styles.goBackButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.goBackButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const statusConfig = getStatusConfig(sales.orderStatus);
    const isCompleted = sales.orderStatus === 'Completed';
    const isCancelled = sales.orderStatus === 'Cancelled';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Sale #{sales.orderID}</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusConfig.color + '10' }]}>
                    <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
                    <Text style={[styles.statusBannerText, { color: statusConfig.color }]}>
                        {statusConfig.label}
                    </Text>
                    <Text style={styles.statusBannerDate}>
                        {formatDate(sales.orderDate)}
                    </Text>
                </View>

                {/* Sales Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💰 Sales Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Sale Amount</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(sales.totalPrice)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Items Sold</Text>
                        <Text style={styles.summaryValue}>{sales.items.length} items</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Payment Status</Text>
                        <Text style={[styles.summaryValue, { color: getPaymentStatusColor(sales.payment_status) }]}>
                            {sales.payment_status || 'Pending'}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Payment Method</Text>
                        <Text style={styles.summaryValue}>
                            {sales.payment_method === 'COD' ? 'Cash on Delivery' : sales.payment_method}
                        </Text>
                    </View>
                </View>

                {/* Buyer Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👤 Buyer Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{sales.buyer_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Email:</Text>
                        <Text style={styles.detailValue}>{sales.buyer_email}</Text>
                    </View>
                    {sales.buyer_phone && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>{sales.buyer_phone}</Text>
                        </View>
                    )}
                </View>

                {/* Items Sold */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📦 Items Sold</Text>
                    {sales.items.map((item) => (
                        <View key={item.orderItemID} style={styles.orderItem}>
                            <View style={styles.orderItemImage}>
                                {item.image_path ? (
                                    <Image 
                                        source={{ uri: `${imageBaseUrl}${item.image_path}` }} 
                                        style={styles.orderItemImg}
                                    />
                                ) : (
                                    <View style={[styles.orderItemImg, styles.imagePlaceholder]}>
                                        <Ionicons name="image-outline" size={24} color="#ccc" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.orderItemInfo}>
                                <Text style={styles.orderItemName} numberOfLines={2}>
                                    {item.product_name}
                                </Text>
                                <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                            </View>
                            <Text style={styles.orderItemPrice}>
                                ${(item.price_at_purchase * item.quantity).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>{formatCurrency(sales.totalPrice)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Delivery Fee</Text>
                        <Text style={styles.totalValue}>$5.00</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Total</Text>
                        <Text style={styles.grandTotalValue}>{formatCurrency(sales.totalPrice + 5)}</Text>
                    </View>
                </View>

                {/* Shipping Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📍 Shipping Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{sales.shipping_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address:</Text>
                        <Text style={styles.detailValue}>{sales.shipping_address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>City:</Text>
                        <Text style={styles.detailValue}>{sales.shipping_city}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Postal:</Text>
                        <Text style={styles.detailValue}>{sales.shipping_postal_code}</Text>
                    </View>
                    {sales.shipping_phone && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone:</Text>
                            <Text style={styles.detailValue}>{sales.shipping_phone}</Text>
                        </View>
                    )}
                </View>

                {/* Note about revenue */}
                {!isCompleted && !isCancelled && (
                    <View style={styles.noteContainer}>
                        <Ionicons name="information-circle" size={20} color="#3498DB" />
                        <Text style={styles.noteText}>
                            Revenue will be recorded once the order is marked as Completed.
                            Current status: {statusConfig.label}
                        </Text>
                    </View>
                )}

                {isCancelled && (
                    <View style={[styles.noteContainer, styles.cancelledNote]}>
                        <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                        <Text style={[styles.noteText, { color: '#FF6B6B' }]}>
                            This sale was cancelled. No revenue was recorded.
                        </Text>
                    </View>
                )}

                {isCompleted && (
                    <View style={[styles.noteContainer, styles.completedNote]}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={[styles.noteText, { color: '#4CAF50' }]}>
                            ✅ Revenue of {formatCurrency(sales.totalPrice)} has been recorded for this sale.
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 12,
    },
    // Status Banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        marginBottom: 12,
        gap: 8,
    },
    statusBannerText: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    statusBannerDate: {
        fontSize: 12,
        color: '#999',
    },
    // Section
    section: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    // Summary
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    // Order Items
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    orderItemImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginRight: 12,
    },
    orderItemImg: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderItemInfo: {
        flex: 1,
    },
    orderItemName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    orderItemQty: {
        fontSize: 12,
        color: '#999',
    },
    orderItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
    },
    totalValue: {
        fontSize: 14,
        color: '#333',
    },
    grandTotalRow: {
        borderTopWidth: 1,
        borderTopColor: '#e8e8e8',
        paddingTop: 8,
        marginTop: 4,
    },
    grandTotalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    grandTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    // Details
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        width: 70,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    // Note
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f4fd',
        borderRadius: 10,
        padding: 12,
        gap: 8,
        marginTop: 4,
        marginBottom: 12,
    },
    cancelledNote: {
        backgroundColor: '#fff5f5',
    },
    completedNote: {
        backgroundColor: '#f0fff4',
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: '#3498DB',
        lineHeight: 18,
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
    goBackButton: {
        marginTop: 20,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
    },
    goBackButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Seller_Sales_Details;