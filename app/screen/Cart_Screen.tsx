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

interface CartItem {
    cartItemID: number;
    productID: number;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    image: string;
    condition: string;
    stock: number;
    inStock: boolean;
}

const Cart_Screen = ({ navigation }: any) => {
    const { isAuthenticated } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);
    const [updatingItem, setUpdatingItem] = useState<number | null>(null);

    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchCart();
        }
    }, [isAuthenticated]);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const response = await apiService.getCart();
            if (response && response.success !== false) {
                setCartItems(response.items || []);
                setTotalItems(response.totalItems || 0);
                setTotalPrice(response.totalPrice || 0);
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
            Alert.alert('Error', 'Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCart();
        setRefreshing(false);
    };

    const handleUpdateQuantity = async (cartItemID: number, newQuantity: number) => {
        if (newQuantity < 0) return;
        
        // Find the item
        const item = cartItems.find(i => i.cartItemID === cartItemID);
        if (!item) return;
        
        // If quantity is 0, confirm removal
        if (newQuantity === 0) {
            Alert.alert(
                'Remove Item',
                `Are you sure you want to remove "${item.name}" from your cart?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Remove', 
                        style: 'destructive',
                        onPress: () => updateCartQuantity(cartItemID, newQuantity)
                    }
                ]
            );
            return;
        }
        
        // Check stock
        if (newQuantity > item.stock) {
            Alert.alert('Not Enough Stock', `Only ${item.stock} items available`);
            return;
        }
        
        updateCartQuantity(cartItemID, newQuantity);
    };

    const updateCartQuantity = async (cartItemID: number, newQuantity: number) => {
        try {
            setUpdatingItem(cartItemID);
            
            const response = await apiService.updateCartItem(cartItemID, newQuantity);
            
            if (response.success) {
                // Refresh cart
                await fetchCart();
            } else {
                Alert.alert('Error', response.message || 'Failed to update cart');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setUpdatingItem(null);
        }
    };

    const handleRemoveItem = (cartItemID: number, itemName: string) => {
        Alert.alert(
            'Remove Item',
            `Are you sure you want to remove "${itemName}" from your cart?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setUpdatingItem(cartItemID);
                            await apiService.removeFromCart(cartItemID);
                            await fetchCart();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to remove item');
                        } finally {
                            setUpdatingItem(null);
                        }
                    }
                }
            ]
        );
    };

    const handleClearCart = () => {
        if (cartItems.length === 0) return;
        
        Alert.alert(
            'Clear Cart',
            'Are you sure you want to remove all items from your cart?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Clear All', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiService.clearCart();
                            await fetchCart();
                            Alert.alert('Success', 'Cart cleared');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to clear cart');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            Alert.alert('Empty Cart', 'Add some items to your cart first');
            return;
        }
        Alert.alert('Checkout', 'Checkout functionality coming soon!');
    };

    const handleProductPress = (productID: number) => {
        navigation.navigate('ProductDetail', { productId: productID });
    };

    const renderCartItem = ({ item }: { item: CartItem }) => {
        const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;
        const isUpdating = updatingItem === item.cartItemID;

        return (
            <View style={styles.cartItem}>
                <TouchableOpacity 
                    style={styles.itemContent}
                    onPress={() => handleProductPress(item.productID)}
                    activeOpacity={0.7}
                >
                    {/* Product Image */}
                    <View style={styles.itemImageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                        ) : (
                            <View style={[styles.itemImage, styles.imagePlaceholder]}>
                                <Ionicons name="image-outline" size={30} color="#ccc" />
                            </View>
                        )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                        </Text>
                        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                        <View style={styles.itemMeta}>
                            <Text style={styles.itemCondition}>{item.condition}</Text>
                            {!item.inStock && (
                                <Text style={styles.outOfStockText}>Out of Stock</Text>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Quantity Controls */}
                <View style={styles.itemActions}>
                    <View style={styles.quantityContainer}>
                        <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => handleUpdateQuantity(item.cartItemID, item.quantity - 1)}
                            disabled={isUpdating}
                        >
                            <Ionicons name="remove" size={18} color="#333" />
                        </TouchableOpacity>
                        
                        {isUpdating ? (
                            <ActivityIndicator size="small" color="#4CAF50" style={styles.quantityText} />
                        ) : (
                            <Text style={styles.quantityText}>{item.quantity}</Text>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => handleUpdateQuantity(item.cartItemID, item.quantity + 1)}
                            disabled={isUpdating}
                        >
                            <Ionicons name="add" size={18} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
                    
                    <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(item.cartItemID, item.name)}
                        disabled={isUpdating}
                    >
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="cart-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to view your cart
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
                <Text style={styles.storeTitle}>My Cart</Text>
                {cartItems.length > 0 && (
                    <TouchableOpacity onPress={handleClearCart} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading cart...</Text>
                </View>
            ) : cartItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtext}>
                        Start shopping to add items to your cart!
                    </Text>
                    <TouchableOpacity 
                        style={styles.browseButton}
                        onPress={() => navigation.navigate('BrowseAll')}
                    >
                        <Text style={styles.browseButtonText}>Browse Products</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {cartItems.map((item) => (
                            <View key={item.cartItemID}>
                                {renderCartItem({ item })}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Bottom Summary */}
                    <View style={styles.bottomBar}>
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Items</Text>
                                <Text style={styles.summaryValue}>{totalItems}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Price</Text>
                                <Text style={styles.summaryTotal}>${totalPrice.toFixed(2)}</Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={[styles.checkoutButton, cartItems.length === 0 && styles.checkoutButtonDisabled]}
                            onPress={handleCheckout}
                            disabled={cartItems.length === 0}
                        >
                            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
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
        paddingTop: 16,
        paddingBottom: 120,
    },
    // Cart Item
    cartItem: {
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
    itemContent: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    itemImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 2,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    itemCondition: {
        fontSize: 11,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    outOfStockText: {
        fontSize: 11,
        color: '#FF6B6B',
        marginLeft: 6,
        fontWeight: '600',
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    quantityButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    quantityText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        paddingHorizontal: 10,
        minWidth: 30,
        textAlign: 'center',
    },
    itemSubtotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    removeButton: {
        padding: 6,
    },
    // Empty State
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
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    browseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Auth Required
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
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    summaryContainer: {
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
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
    summaryTotal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    checkoutButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    checkoutButtonDisabled: {
        opacity: 0.5,
    },
    checkoutButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default Cart_Screen;