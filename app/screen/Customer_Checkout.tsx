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
    KeyboardAvoidingView,
    Platform,
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

interface Address {
    addressID: number;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
    is_default: number;
}

const User_Checkout = ({ route, navigation }: any) => {
    const { cartItems, totalPrice, totalItems } = route.params || {};
    const { user, isAuthenticated } = useAuth();

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('COD');

    // New address form
    const [newAddress, setNewAddress] = useState({
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Bangladesh',
        phone: '',
        is_default: 0
    });

    const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchAddresses();
        }
    }, [isAuthenticated]);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAddresses();
            if (response && response.success) {
                setAddresses(response.addresses || []);
                // Select default address
                const defaultAddr = response.addresses?.find((a: Address) => a.is_default === 1);
                if (defaultAddr) {
                    setSelectedAddress(defaultAddr);
                } else if (response.addresses?.length > 0) {
                    setSelectedAddress(response.addresses[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            Alert.alert('Error', 'Please select a shipping address');
            return;
        }

        if (!cartItems || cartItems.length === 0) {
            Alert.alert('Error', 'Your cart is empty');
            return;
        }

        setPlacingOrder(true);
        try {
            const orderData = {
                addressID: selectedAddress.addressID,
                shipping_name: user?.name || '',
                shipping_address: selectedAddress.address,
                shipping_city: selectedAddress.city,
                shipping_postal_code: selectedAddress.postal_code,
                shipping_phone: selectedAddress.phone || user?.phone || '',
                payment_method: selectedPayment,
                cartItems: cartItems.map((item: CartItem) => ({
                    productID: item.productID,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            const response = await apiService.createOrder(orderData);
            
            if (response && response.success) {
                Alert.alert(
                    'Order Placed!',
                    `Your order #${response.orderID} has been placed successfully.\n\nTotal: $${response.totalPrice.toFixed(2)}\nPayment: Cash on Delivery`,
                    [
                        { 
                            text: 'View Orders', 
                            onPress: () => {
                                navigation.pop(1);
                                navigation.replace('OrderHistory');
                            }
                        },
                        { 
                            text: 'Continue Shopping', 
                            onPress: () => {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Home' }],
                                });
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', response?.message || 'Failed to place order');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setPlacingOrder(false);
        }
    };

    const renderAddressCard = (address: Address) => {
        const isSelected = selectedAddress?.addressID === address.addressID;

        return (
            <TouchableOpacity
                key={address.addressID}
                style={[
                    styles.addressCard,
                    isSelected && styles.addressCardSelected
                ]}
                onPress={() => setSelectedAddress(address)}
                activeOpacity={0.7}
            >
                <View style={styles.addressRadio}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                </View>
                <View style={styles.addressContent}>
                    <Text style={styles.addressText}>{address.address}</Text>
                    <Text style={styles.addressDetail}>
                        {address.city}, {address.state || ''}
                    </Text>
                    <Text style={styles.addressDetail}>
                        {address.postal_code}, {address.country}
                    </Text>
                    {address.phone && (
                        <Text style={styles.addressPhone}>📱 {address.phone}</Text>
                    )}
                    {address.is_default === 1 && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to checkout
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
                <Text style={styles.storeTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Order Summary */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📦 Order Summary</Text>
                        {cartItems?.map((item: CartItem) => (
                            <View key={item.cartItemID} style={styles.orderItem}>
                                <View style={styles.orderItemImage}>
                                    {item.image ? (
                                        <Image 
                                            source={{ uri: `${imageBaseUrl}${item.image}` }} 
                                            style={styles.orderItemImg}
                                        />
                                    ) : (
                                        <View style={[styles.orderItemImg, styles.imagePlaceholder]}>
                                            <Ionicons name="image-outline" size={20} color="#ccc" />
                                        </View>
                                    )}
                                </View>
                                <View style={styles.orderItemInfo}>
                                    <Text style={styles.orderItemName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.orderItemQty}>×{item.quantity}</Text>
                                </View>
                                <Text style={styles.orderItemPrice}>
                                    ${(item.price * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal ({totalItems} items)</Text>
                            <Text style={styles.totalValue}>${totalPrice?.toFixed(2) || '0.00'}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Delivery Fee</Text>
                            <Text style={styles.totalValue}>$5.00</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.grandTotalLabel}>Total</Text>
                            <Text style={styles.grandTotalValue}>
                                ${((totalPrice || 0) + 5).toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {/* Shipping Address */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>📍 Shipping Address</Text>
                            <TouchableOpacity onPress={() => setShowAddressForm(!showAddressForm)}>
                                <Text style={styles.addNewLink}>
                                    {showAddressForm ? 'Cancel' : '+ Add New'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                        ) : addresses.length === 0 && !showAddressForm ? (
                            <TouchableOpacity 
                                style={styles.noAddressContainer}
                                onPress={() => setShowAddressForm(true)}
                            >
                                <Ionicons name="location-outline" size={40} color="#ccc" />
                                <Text style={styles.noAddressText}>No Addresses Saved</Text>
                                <Text style={styles.noAddressSubtext}>Add a new address to continue</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {addresses.map((address) => renderAddressCard(address))}
                            </>
                        )}

                        {/* Add New Address Form */}
                        {showAddressForm && (
                            <View style={styles.addressForm}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Address *"
                                    value={newAddress.address}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, address: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="City *"
                                    value={newAddress.city}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="State / Division"
                                    value={newAddress.state}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, state: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Postal Code *"
                                    value={newAddress.postal_code}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, postal_code: text })}
                                    keyboardType="number-pad"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Country"
                                    value={newAddress.country}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, country: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number"
                                    value={newAddress.phone}
                                    onChangeText={(text) => setNewAddress({ ...newAddress, phone: text })}
                                    keyboardType="phone-pad"
                                />
                                <TouchableOpacity 
                                    style={styles.addAddressButton}
                                    onPress={async () => {
                                        if (!newAddress.address || !newAddress.city || !newAddress.postal_code) {
                                            Alert.alert('Error', 'Please fill in all required fields');
                                            return;
                                        }
                                        try {
                                            const response = await apiService.addAddress(newAddress);
                                            if (response && response.success) {
                                                await fetchAddresses();
                                                setShowAddressForm(false);
                                                setNewAddress({
                                                    address: '',
                                                    city: '',
                                                    state: '',
                                                    postal_code: '',
                                                    country: 'Bangladesh',
                                                    phone: '',
                                                    is_default: 0
                                                });
                                                Alert.alert('Success', 'Address added successfully');
                                            }
                                        } catch (error) {
                                            Alert.alert('Error', 'Failed to add address');
                                        }
                                    }}
                                >
                                    <Text style={styles.addAddressButtonText}>Save Address</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Payment Method */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💳 Payment Method</Text>
                        <TouchableOpacity 
                            style={[
                                styles.paymentOption,
                                selectedPayment === 'COD' && styles.paymentOptionSelected
                            ]}
                            onPress={() => setSelectedPayment('COD')}
                        >
                            <View style={styles.paymentRadio}>
                                <View style={[styles.radioOuter, selectedPayment === 'COD' && styles.radioOuterSelected]}>
                                    {selectedPayment === 'COD' && <View style={styles.radioInner} />}
                                </View>
                            </View>
                            <View style={styles.paymentInfo}>
                                <Text style={styles.paymentName}>Cash on Delivery</Text>
                                <Text style={styles.paymentDesc}>Pay when you receive the item</Text>
                            </View>
                            <Ionicons name="cash-outline" size={24} color="#4CAF50" />
                        </TouchableOpacity>
                    </View>

                    {/* Place Order Button */}
                    <TouchableOpacity 
                        style={[styles.placeOrderButton, placingOrder && styles.placeOrderDisabled]}
                        onPress={handlePlaceOrder}
                        disabled={placingOrder}
                    >
                        {placingOrder ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.placeOrderText}>Place Order</Text>
                                <Text style={styles.placeOrderTotal}>
                                    ${((totalPrice || 0) + 5).toFixed(2)}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 12,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    addNewLink: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    orderItemImage: {
        width: 50,
        height: 50,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginRight: 10,
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
    addressCard: {
        flexDirection: 'row',
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fafafa',
    },
    addressCardSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#f0fff4',
    },
    addressRadio: {
        marginRight: 10,
        justifyContent: 'center',
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: '#4CAF50',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4CAF50',
    },
    addressContent: {
        flex: 1,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    addressDetail: {
        fontSize: 12,
        color: '#666',
    },
    addressPhone: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    defaultBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    defaultBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    noAddressContainer: {
        alignItems: 'center',
        padding: 20,
    },
    noAddressText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
        marginTop: 8,
    },
    noAddressSubtext: {
        fontSize: 13,
        color: '#999',
    },
    addressForm: {
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    addAddressButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    addAddressButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
    },
    paymentOptionSelected: {
        borderColor: '#4CAF50',
        backgroundColor: '#f0fff4',
    },
    paymentRadio: {
        marginRight: 10,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    paymentDesc: {
        fontSize: 12,
        color: '#999',
    },
    placeOrderButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 20,
    },
    placeOrderDisabled: {
        opacity: 0.7,
    },
    placeOrderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeOrderTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
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

export default User_Checkout;