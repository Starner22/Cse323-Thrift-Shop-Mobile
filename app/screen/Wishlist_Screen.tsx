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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';
// import AuthGuard from '../component/AuthGuard';

interface WishlistItem {
    wishlistItemID: number;
    productID: number;
    name: string;
    price: number;
    condition: string;
    quantity: number;
    image: string;
}

const WishlistScreen = ({ navigation }: any) => {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { isAuthenticated } = useAuth();

    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        if (isAuthenticated) {
            fetchWishlist();
        }
    }, [isAuthenticated]);

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            const data = await apiService.getWishlist();
            setWishlistItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            Alert.alert('Error', 'Failed to load wishlist');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchWishlist();
        setRefreshing(false);
    };

    const handleRemoveFromWishlist = (wishlistItemId: number, productName: string) => {
        Alert.alert(
            'Remove from Wishlist',
            `Are you sure you want to remove "${productName}" from your wishlist?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.removeFromWishlist(wishlistItemId);
                            // Remove from local state
                            setWishlistItems(prev => 
                                prev.filter(item => item.wishlistItemID !== wishlistItemId)
                            );
                            Alert.alert('Removed', 'Item removed from wishlist');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove from wishlist');
                        }
                    }
                }
            ]
        );
    };

    const handleAddToCart = (productId: number, productName: string) => {
        Alert.alert(
            'Add to Cart',
            `Add "${productName}" to your cart?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Add to Cart',
                    onPress: async () => {
                        // You'll implement actual cart logic here
                        Alert.alert('Success', `${productName} added to cart!`);
                    }
                }
            ]
        );
    };

    const handleProductPress = (productId: number) => {
        navigation.navigate('ProductDetail', { productId });
    };

    const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
        const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;

        return (
            <View style={styles.wishlistCard}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => handleProductPress(item.productID)}
                    activeOpacity={0.7}
                >
                    {/* Product Image */}
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.productImage} />
                        ) : (
                            <View style={[styles.productImage, styles.imagePlaceholder]}>
                                <Ionicons name="image-outline" size={30} color="#ccc" />
                            </View>
                        )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                            {item.name || 'Product'}
                        </Text>
                        <Text style={styles.productPrice}>
                            ${item.price?.toFixed(2) || '0.00'}
                        </Text>
                        <View style={styles.productMeta}>
                            <Text style={styles.productCondition}>
                                {item.condition || 'Normal'}
                            </Text>
                            <Text style={styles.productQuantity}>
                                Qty: {item.quantity || 0}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() => handleRemoveFromWishlist(item.wishlistItemID, item.name)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                        <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.cartButton]}
                        onPress={() => handleAddToCart(item.productID, item.name)}
                    >
                        <Ionicons name="cart-outline" size={18} color="#fff" />
                        <Text style={styles.cartButtonText}>Add to Cart</Text>
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
                    <Ionicons name="heart-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to view your wishlist
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
                <Text style={styles.storeTitle}>My Wishlist</Text>
                <View style={styles.wishlistCount}>
                    <Text style={styles.countText}>{wishlistItems.length}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading wishlist...</Text>
                </View>
            ) : wishlistItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                    <Text style={styles.emptySubtext}>
                        Start adding items you love!
                    </Text>
                    <TouchableOpacity 
                        style={styles.browseButton}
                        onPress={() => navigation.navigate('BrowseAll')}
                    >
                        <Text style={styles.browseButtonText}>Browse Products</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {wishlistItems.map((item) => (
                        <View key={item.wishlistItemID}>
                            {renderWishlistItem({ item })}
                        </View>
                    ))}
                    <View style={{ height: 20 }} />
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
    },
    wishlistCount: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        minWidth: 24,
        alignItems: 'center',
    },
    countText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    },
    wishlistCard: {
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
    cardContent: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    imageContainer: {
        width: 100,
        height: 100,
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
        justifyContent: 'space-between',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    productPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 4,
    },
    productMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    productCondition: {
        fontSize: 11,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    productQuantity: {
        fontSize: 11,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
    },
    removeButton: {
        backgroundColor: '#fff5f5',
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#ffe0e0',
    },
    removeButtonText: {
        fontSize: 13,
        color: '#FF6B6B',
        marginLeft: 4,
        fontWeight: '500',
    },
    cartButton: {
        backgroundColor: '#4CAF50',
        marginLeft: 6,
    },
    cartButtonText: {
        fontSize: 13,
        color: '#fff',
        marginLeft: 4,
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

export default WishlistScreen;