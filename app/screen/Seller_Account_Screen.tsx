import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

const Seller_Account_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [sellerProfile, setSellerProfile] = useState<any>(null);
    const [sellerStatus, setSellerStatus] = useState<string | null>(null);
    const [isSuspended, setIsSuspended] = useState(false);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [buyerOrderStats, setBuyerOrderStats] = useState({
        pending: 0,
        total: 0,
        completed: 0,
        totalSpent: 0
    });
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalReviews: 0,
        pendingOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalItemsSold: 0
    });
    const [ordersData, setOrdersData] = useState<any[]>([]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'Seller') {
            fetchSellerData();
            fetchWishlistCount();
            fetchCartCount();
            fetchBuyerOrders();
        }
    }, [isAuthenticated]);

    const fetchSellerData = async () => {
        try {
            setLoading(true);
            
            const profile = await apiService.checkSellerStatus();
            if (profile.hasApplied) {
                setSellerStatus(profile.status);
                setIsSuspended(profile.status === 'suspended');
                if (profile.status === 'approved') {
                    setSellerProfile(profile.profile);
                }
            }

            const productsData = await apiService.getMyProducts();
            const activeProducts = productsData.filter(p => p.is_deleted !== 1);

            const salesResponse = await apiService.getSellerOrders();
            let orders = [];
            let orderStats = {
                totalOrders: 0,
                pendingOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                totalRevenue: 0,
                totalItemsSold: 0
            };

            if (salesResponse && salesResponse.success) {
                orders = (salesResponse.data || []).map((order: any) => ({
                    orderID: order.orderID,
                    orderStatus: order.orderStatus,
                    totalPrice: order.totalPrice,
                    orderDate: order.orderDate,
                    buyerName: order.buyer_name || 'Unknown',
                    buyerEmail: order.buyer_email || '',
                    shipping_name: order.shipping_name,
                    shipping_address: order.shipping_address,
                    shipping_city: order.shipping_city,
                    shipping_postal_code: order.shipping_postal_code,
                    items: (order.items || []).map((item: any) => ({
                        orderItemID: item.orderItemID,
                        productID: item.productID,
                        productName: item.product_name || 'Product',
                        quantity: item.quantity || 0,
                        price_at_purchase: item.price_at_purchase || 0,
                        image_path: item.image_path
                    }))
                }));
                
                orderStats.totalOrders = orders.length;
                
                orders.forEach((order: any) => {
                    switch (order.orderStatus) {
                        case 'Pending':
                            orderStats.pendingOrders++;
                            break;
                        case 'Completed':
                            orderStats.completedOrders++;
                            orderStats.totalRevenue += parseFloat(order.totalPrice || 0);
                            if (order.items) {
                                order.items.forEach((item: any) => {
                                    orderStats.totalItemsSold += item.quantity || 0;
                                });
                            }
                            break;
                        case 'Cancelled':
                            orderStats.cancelledOrders++;
                            break;
                    }
                });
            }

            setStats({
                totalProducts: activeProducts.length,
                totalOrders: orderStats.totalOrders,
                totalRevenue: orderStats.totalRevenue,
                totalReviews: 0,
                pendingOrders: orderStats.pendingOrders,
                completedOrders: orderStats.completedOrders,
                cancelledOrders: orderStats.cancelledOrders,
                totalItemsSold: orderStats.totalItemsSold
            });

            setOrdersData(orders);

        } catch (error) {
            console.error('Error fetching seller data:', error);
            setStats({
                totalProducts: 0,
                totalOrders: 0,
                totalRevenue: 0,
                totalReviews: 0,
                pendingOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                totalItemsSold: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchWishlistCount = async () => {
        try {
            const wishlist = await apiService.getWishlist();
            setWishlistCount(Array.isArray(wishlist) ? wishlist.length : 0);
        } catch (error) {
            console.error('Error fetching wishlist count:', error);
            setWishlistCount(0);
        }
    };

    const fetchCartCount = async () => {
        try {
            const cart = await apiService.getCart();
            setCartCount(cart.totalItems || 0);
        } catch (error) {
            console.error('Error fetching cart count:', error);
            setCartCount(0);
        }
    };

    const fetchBuyerOrders = async () => {
        try {
            const response = await apiService.getMyOrders();
            if (response && response.success) {
                const orders = response.data || [];
                const pending = orders.filter((o: any) => o.orderStatus === 'Pending').length;
                const completed = orders.filter((o: any) => o.orderStatus === 'Completed').length;
                
                let totalSpent = 0;
                orders.forEach((order: any) => {
                    if (order.orderStatus === 'Completed') {
                        totalSpent += parseFloat(order.totalPrice || 0);
                    }
                });
                
                setBuyerOrderStats({
                    total: orders.length,
                    pending: pending,
                    completed: completed,
                    totalSpent: totalSpent
                });
            } else {
                setBuyerOrderStats({ total: 0, pending: 0, completed: 0, totalSpent: 0 });
            }
        } catch (error) {
            console.error('Error fetching buyer orders:', error);
            setBuyerOrderStats({ total: 0, pending: 0, completed: 0, totalSpent: 0 });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchSellerData(),
            fetchWishlistCount(),
            fetchCartCount(),
            fetchBuyerOrders()
        ]);
        setRefreshing(false);
    };
    
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        navigation.navigate('Login');
                    }
                }
            ]
        );
    };

    const handleEditBusiness = () => {
        navigation.navigate('Seller_Edit_Business');
    };

    const handleEditProfile = () => {
        navigation.navigate('User_Edit_Profile');
    };

    const handleChangePassword = () => {
        navigation.navigate('UserPasswordEdit');
    };

    const handleAddresses = () => {
        navigation.navigate('CustomerAddress');
    };

    const handleMyOrders = () => {
        navigation.navigate('OrderHistory');
    };

    const handleSales = () => {
        navigation.navigate('SellerSales');
    };

    const handleMyWishlist = () => {
        navigation.navigate('Wishlist');
    };

    const handleMyProducts = () => {
        navigation.navigate('SellerMyProducts');
    };

    const handleMyCart = () => {
        navigation.navigate('Cart');
    };

    const handleSalesAnalytics = () => {
        Alert.alert(
            'Sales Analytics',
            `📊 Your Sales Summary\n\n` +
            `Total Orders: ${stats.totalOrders}\n` +
            `Completed: ${stats.completedOrders}\n` +
            `Pending: ${stats.pendingOrders}\n` +
            `Cancelled: ${stats.cancelledOrders}\n\n` +
            `💰 Total Revenue: $${stats.totalRevenue.toFixed(2)}\n` +
            `📦 Items Sold: ${stats.totalItemsSold}\n` +
            `📝 Products Listed: ${stats.totalProducts}`,
            [{ text: 'OK' }]
        );
    };

    const getUserInitials = () => {
        if (!user?.name) return '?';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return user.name.substring(0, 2).toUpperCase();
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.notLoggedInContainer}>
                    <Ionicons name="storefront-outline" size={80} color="#ccc" />
                    <Text style={styles.notLoggedInText}>Not Logged In</Text>
                    <Text style={styles.notLoggedInSubtext}>
                        Please login to view your seller account
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

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Seller Dashboard</Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleEditProfile}>
                    <Ionicons name="settings-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: '#4CAF50' }]}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Ionicons name="storefront-outline" size={14} color="#fff" />
                            <Text style={styles.roleBadgeText}>Seller ⭐</Text>
                        </View>
                    </View>

                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>

                    {sellerProfile && (
                        <>
                            <View style={styles.storeInfoContainer}>
                                <Ionicons name="business-outline" size={16} color="#4CAF50" />
                                <Text style={styles.storeName}>{sellerProfile.business_name}</Text>
                            </View>
                            {sellerProfile.business_address && (
                                <View style={styles.storeInfoContainer}>
                                    <Ionicons name="location-outline" size={14} color="#888" />
                                    <Text style={styles.storeAddress} numberOfLines={1}>
                                        {sellerProfile.business_address}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={styles.sellerSince}>
                        <Text style={styles.sellerSinceText}>
                            Seller since {user?.registration_date ? new Date(user.registration_date).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>

                    {isSuspended && (
                        <View style={styles.suspendedBanner}>
                            <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                            <Text style={styles.suspendedBannerText}>
                                Your seller account has been suspended. Please contact support.
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handleMyProducts}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handleSales}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handleSalesAnalytics}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="cash-outline" size={22} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
                        <Text style={styles.statLabel}>Revenue</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.quickStatsContainer}>
                    <TouchableOpacity 
                        style={styles.quickStatItem}
                        onPress={() => navigation.navigate('SellerSales', { filter: 'pending' })}
                        activeOpacity={0.7}
                    >
                        <View style={styles.quickStatIconWrapper}>
                            <Ionicons name="time-outline" size={18} color="#FF9800" />
                            <Text style={styles.quickStatNumber}>{stats.pendingOrders}</Text>
                        </View>
                        <Text style={styles.quickStatLabel}>Pending Orders</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.quickStatDivider} />
                    
                    <TouchableOpacity 
                        style={styles.quickStatItem}
                        onPress={handleSales}
                        activeOpacity={0.7}
                    >
                        <View style={styles.quickStatIconWrapper}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                            <Text style={styles.quickStatNumber}>{stats.completedOrders}</Text>
                        </View>
                        <Text style={styles.quickStatLabel}>Sales Completed</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.quickStatDivider} />
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>🛍️ Seller Tools</Text>

                    {!isSuspended ? (
                        <>
                            <TouchableOpacity style={styles.menuItem} onPress={handleMyProducts}>
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                        <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.menuText}>My Products</Text>
                                </View>
                                <View style={styles.menuRight}>
                                    <Text style={styles.menuBadge}>{stats.totalProducts}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleSales}>
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                        <Ionicons name="cash-outline" size={22} color="#4CAF50" />
                                    </View>
                                    <Text style={styles.menuText}>My Sales</Text>
                                </View>
                                <View style={styles.menuRight}>
                                    {stats.totalOrders > 0 && (
                                        <Text style={styles.menuBadge}>{stats.totalOrders}</Text>
                                    )}
                                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleSalesAnalytics}>
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                        <Ionicons name="bar-chart-outline" size={22} color="#FF9800" />
                                    </View>
                                    <Text style={styles.menuText}>Sales Analytics</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.suspendedMessageContainer}>
                            <Ionicons name="ban-outline" size={40} color="#6C5CE7" />
                            <Text style={styles.suspendedMessageText}>
                                Your account is suspended. Seller tools are disabled.
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.buyerStatsContainer}>
                    <View style={styles.buyerStatsTitleContainer}>
                        <Ionicons name="cart-outline" size={18} color="#6C5CE7" />
                        <Text style={styles.buyerStatsTitle}>Your Spending</Text>
                    </View>
                    <View style={styles.buyerStatsRow}>
                        <TouchableOpacity 
                            style={styles.buyerStatItem}
                            onPress={handleMyOrders}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.buyerStatIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#4CAF50" />
                            </View>
                            <View style={styles.buyerStatInfo}>
                                <Text style={styles.buyerStatNumber}>{buyerOrderStats.completed}</Text>
                                <Text style={styles.buyerStatLabel}>Completed Orders</Text>
                            </View>
                        </TouchableOpacity>
                        
                        <View style={styles.buyerStatDivider} />
                        
                        <TouchableOpacity 
                            style={styles.buyerStatItem}
                            onPress={handleMyOrders}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.buyerStatIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="cash-outline" size={22} color="#2196F3" />
                            </View>
                            <View style={styles.buyerStatInfo}>
                                <Text style={styles.buyerStatNumber}>{formatCurrency(buyerOrderStats.totalSpent)}</Text>
                                <Text style={styles.buyerStatLabel}>Total Spent</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>🛒 Buyer Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleMyOrders}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>My Orders</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {buyerOrderStats.pending > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{buyerOrderStats.pending}</Text>
                            )}
                            {buyerOrderStats.total > 0 && (
                                <Text style={styles.menuBadge}>{buyerOrderStats.total}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleMyWishlist}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="heart-outline" size={22} color="#FF6B6B" />
                            </View>
                            <Text style={styles.menuText}>My Wishlist</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {wishlistCount > 0 && (
                                <Text style={styles.menuBadge}>{wishlistCount}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleMyCart}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="cart-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>My Cart</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {cartCount > 0 && (
                                <Text style={styles.menuBadge}>{cartCount}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>⚙️ Account Settings</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="person-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleAddresses}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="location-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>My Addresses</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleEditBusiness}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="storefront-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>Edit Business Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="lock-closed-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Change Password</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#FF6B6B" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
            </ScrollView>
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
    notLoggedInContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    notLoggedInText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    notLoggedInSubtext: {
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
    profileHeader: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    roleBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    roleBadgeText: {
        fontSize: 10,
        color: '#fff',
        marginLeft: 3,
        fontWeight: '600',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    storeInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4CAF50',
        marginLeft: 6,
    },
    storeAddress: {
        fontSize: 13,
        color: '#888',
        marginLeft: 6,
        maxWidth: '80%',
    },
    sellerSince: {
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
    },
    sellerSinceText: {
        fontSize: 11,
        color: '#888',
    },
    suspendedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        marginHorizontal: 16,
        gap: 8,
    },
    suspendedBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#FF6B6B',
        lineHeight: 18,
    },
    suspendedMessageContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    suspendedMessageText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        backgroundColor: '#fff',
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statCard: {
        alignItems: 'center',
        flex: 1,
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
    },
    quickStatsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    quickStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatIconWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickStatNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    quickStatLabel: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: '#e0e0e0',
    },
    menuContainer: {
        backgroundColor: '#fff',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        paddingVertical: 12,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuBadge: {
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 8,
        minWidth: 20,
        textAlign: 'center',
    },
    menuBadgeWarning: {
        backgroundColor: '#FF6B6B',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginTop: 8,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    logoutButtonText: {
        fontSize: 16,
        color: '#FF6B6B',
        fontWeight: '600',
        marginLeft: 8,
    },
    buyerStatsContainer: {
        backgroundColor: '#fff',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    buyerStatsTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    buyerStatsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    buyerStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buyerStatItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    buyerStatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    buyerStatInfo: {
        flex: 1,
    },
    buyerStatNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    buyerStatLabel: {
        fontSize: 11,
        color: '#999',
    },
    buyerStatDivider: {
        width: 1,
        backgroundColor: '#e0e0e0',
        height: 40,
    },
});

export default Seller_Account_Screen;