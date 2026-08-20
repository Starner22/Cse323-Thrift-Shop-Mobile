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
    Alert,
    RefreshControl,
    TextInput,
    Modal
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

interface OrderDetails {
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

const Customer_Order_Details = ({ route, navigation }: any) => {
    const { orderID } = route.params || {};
    const { user, isAuthenticated } = useAuth();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [email, setEmail] = useState('');

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated && orderID) {
            fetchOrderDetails();
        }
    }, [isAuthenticated, orderID]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await apiService.getOrderDetails(orderID);
            if (response && response.success) {
                setOrder(response.data);
            } else {
                Alert.alert('Error', 'Failed to load order details');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Error fetching order details:', error);
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrderDetails();
        setRefreshing(false);
    };

    const handleExportPDF = () => {
        // Show email modal first
        setEmail(user?.email || '');
        setShowEmailModal(true);
    };

    const handleSendPDF = async () => {
        if (!order) return;
        
        if (!email || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        
        try {
            setExporting(true);
            setShowEmailModal(false);
            
            const response = await apiService.exportOrderPDFWithEmail(order.orderID, email);
            
            if (response && response.success) {
                Alert.alert(
                    'PDF Sent',
                    `The invoice has been sent to:\n\n${email}\n\nPlease check your inbox.`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', response?.message || 'Failed to send PDF');
            }
        } catch (error: any) {
            console.error('Export PDF error:', error);
            Alert.alert('Error', error?.message || 'Failed to export PDF');
        } finally {
            setExporting(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Pending':
                return { label: 'Pending', color: '#FF9F43', icon: 'time-outline', step: 0 };
            case 'Processing':
                return { label: 'Processing', color: '#3498DB', icon: 'refresh-outline', step: 1 };
            case 'Shipped':
                return { label: 'Shipped', color: '#6C5CE7', icon: 'cube-outline', step: 2 };
            case 'Completed':
                return { label: 'Completed', color: '#4CAF50', icon: 'checkmark-circle', step: 3 };
            case 'Cancelled':
                return { label: 'Cancelled', color: '#FF6B6B', icon: 'close-circle', step: -1 };
            default:
                return { label: 'Unknown', color: '#999', icon: 'alert-circle', step: -1 };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusSteps = () => {
        if (!order) return [];
        const currentStatus = order.orderStatus;
        const steps = [
            { key: 'Pending', label: 'Order Placed', icon: 'cart-outline' },
            { key: 'Processing', label: 'Processing', icon: 'sync-outline' },
            { key: 'Shipped', label: 'Shipped', icon: 'cube-outline' },
            { key: 'Completed', label: 'Delivered', icon: 'checkmark-circle' }
        ];

        const currentIndex = steps.findIndex(s => s.key === currentStatus);
        
        return steps.map((step, index) => ({
            ...step,
            isCompleted: index <= currentIndex && currentStatus !== 'Cancelled',
            isActive: index === currentIndex && currentStatus !== 'Cancelled',
            isCancelled: currentStatus === 'Cancelled'
        }));
    };

    const renderStatusTimeline = () => {
        const steps = getStatusSteps();
        if (!steps.length || order?.orderStatus === 'Cancelled') {
            return (
                <View style={styles.timelineContainer}>
                    <View style={styles.cancelledContainer}>
                        <Ionicons name="close-circle" size={40} color="#FF6B6B" />
                        <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                        <Text style={styles.cancelledSubtext}>
                            This order has been cancelled. No further updates will be made.
                        </Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.timelineContainer}>
                {steps.map((step, index) => (
                    <View key={step.key} style={styles.timelineStep}>
                        <View style={styles.timelineLeft}>
                            <View style={[
                                styles.timelineDot,
                                step.isCompleted ? styles.timelineDotCompleted : styles.timelineDotIncomplete
                            ]}>
                                {step.isCompleted ? (
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                ) : (
                                    <Ionicons name={step.icon as any} size={16} color="#999" />
                                )}
                            </View>
                            {index < steps.length - 1 && (
                                <View style={[
                                    styles.timelineLine,
                                    step.isCompleted ? styles.timelineLineCompleted : styles.timelineLineIncomplete
                                ]} />
                            )}
                        </View>
                        <View style={styles.timelineRight}>
                            <Text style={[
                                styles.timelineLabel,
                                step.isActive && styles.timelineLabelActive,
                                step.isCompleted && styles.timelineLabelCompleted
                            ]}>
                                {step.label}
                            </Text>
                            {step.isActive && (
                                <View style={styles.timelineCurrentBadge}>
                                    <Text style={styles.timelineCurrentText}>Current</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderEmailModal = () => (
        <Modal
            visible={showEmailModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEmailModal(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    style={styles.modalBackground}
                    onPress={() => setShowEmailModal(false)}
                />
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Send PDF to Email</Text>
                        <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.modalBody}>
                        <Text style={styles.modalLabel}>Email Address</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text style={styles.modalHint}>
                            The invoice will be sent as a PDF attachment.
                        </Text>
                    </View>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.modalCancel]}
                            onPress={() => setShowEmailModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.modalSend]}
                            onPress={handleSendPDF}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.modalSendText}>Send PDF</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading order details...</Text>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>Order Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyTitle}>Order Not Found</Text>
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

    const statusConfig = getStatusConfig(order.orderStatus);

    return (
        <>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>Order #{order.orderID}</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                        <Ionicons name="refresh-outline" size={28} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={[styles.statusBanner, { backgroundColor: statusConfig.color + '10' }]}>
                        <Ionicons name={statusConfig.icon as any} size={24} color={statusConfig.color} />
                        <Text style={[styles.statusBannerText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                        <Text style={styles.statusBannerDate}>
                            {formatDate(order.orderDate)}
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
                        onPress={handleExportPDF}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="mail-outline" size={20} color="#fff" />
                                <Text style={styles.exportButtonText}>Send PDF to Email</Text>
                                <Ionicons name="download-outline" size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>

                    {renderStatusTimeline()}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📦 Order Items</Text>
                        {order.items.map((item) => (
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
                            <Text style={styles.totalValue}>${order.totalPrice.toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Delivery Fee</Text>
                            <Text style={styles.totalValue}>$5.00</Text>
                        </View>
                        <View style={[styles.totalRow, styles.grandTotalRow]}>
                            <Text style={styles.grandTotalLabel}>Total</Text>
                            <Text style={styles.grandTotalValue}>${(order.totalPrice + 5).toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📍 Shipping Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Name:</Text>
                            <Text style={styles.detailValue}>{order.shipping_name}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address:</Text>
                            <Text style={styles.detailValue}>{order.shipping_address}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>City:</Text>
                            <Text style={styles.detailValue}>{order.shipping_city}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Postal Code:</Text>
                            <Text style={styles.detailValue}>{order.shipping_postal_code}</Text>
                        </View>
                        {order.shipping_phone && (
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Phone:</Text>
                                <Text style={styles.detailValue}>{order.shipping_phone}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💳 Payment Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Method:</Text>
                            <Text style={styles.detailValue}>
                                {order.payment_method === 'COD' ? 'Cash on Delivery' : order.payment_method}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Status:</Text>
                            <Text style={[
                                styles.detailValue,
                                { color: order.payment_status === 'Paid' ? '#4CAF50' : '#FF9F43' }
                            ]}>
                                {order.payment_status || 'Pending'}
                            </Text>
                        </View>
                    </View>

                    {order.orderStatus === 'Pending' && (
                        <TouchableOpacity 
                            style={styles.cancelOrderButton}
                            onPress={() => {
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
                                                        navigation.goBack();
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
                            }}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#FF6B6B" />
                            <Text style={styles.cancelOrderText}>Cancel Order</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>

            {renderEmailModal()}
        </>
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
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6C5CE7',
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 12,
        gap: 8,
    },
    exportButtonDisabled: {
        opacity: 0.6,
    },
    exportButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
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
    timelineContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    timelineStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    timelineLeft: {
        width: 30,
        alignItems: 'center',
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    timelineDotCompleted: {
        backgroundColor: '#4CAF50',
    },
    timelineDotIncomplete: {
        backgroundColor: '#e0e0e0',
    },
    timelineLine: {
        width: 2,
        height: 28,
        marginLeft: 13,
        marginVertical: 2,
    },
    timelineLineCompleted: {
        backgroundColor: '#4CAF50',
    },
    timelineLineIncomplete: {
        backgroundColor: '#e0e0e0',
    },
    timelineRight: {
        flex: 1,
        paddingLeft: 12,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timelineLabel: {
        fontSize: 14,
        color: '#999',
    },
    timelineLabelActive: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    timelineLabelCompleted: {
        color: '#4CAF50',
    },
    timelineCurrentBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    timelineCurrentText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    cancelledContainer: {
        alignItems: 'center',
        padding: 20,
    },
    cancelledTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginTop: 8,
    },
    cancelledSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 4,
    },
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
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        width: 80,
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    cancelOrderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff5f5',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FF6B6B',
        marginTop: 4,
        gap: 6,
    },
    cancelOrderText: {
        fontSize: 16,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackground: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
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
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
    },
    modalHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancel: {
        backgroundColor: '#f0f0f0',
    },
    modalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    modalSend: {
        backgroundColor: '#6C5CE7',
    },
    modalSendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Customer_Order_Details;