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
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

const Buyer_Account_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [orderStats, setOrderStats] = useState({
        total: 0,
        pending: 0,
        completed: 0,
        totalSpent: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchCounts();
        }
    }, [isAuthenticated]);

    const fetchCounts = async () => {
        try {
            const wishlist = await apiService.getWishlist();
            setWishlistCount(Array.isArray(wishlist) ? wishlist.length : 0);

            const cart = await apiService.getCart();
            setCartCount(cart.totalItems || 0);

            const ordersResponse = await apiService.getMyOrders();
            if (ordersResponse && ordersResponse.success) {
                const orders = ordersResponse.data || [];
                const pending = orders.filter((o: any) => o.orderStatus === 'Pending').length;
                const completed = orders.filter((o: any) => o.orderStatus === 'Completed').length;
                let totalSpent = 0;
                orders.forEach((order: any) => {
                    if (order.orderStatus === 'Completed') {
                        totalSpent += parseFloat(order.totalPrice || 0);
                    }
                });
                
                setOrderStats({
                    total: orders.length,
                    pending: pending,
                    completed: completed,
                    totalSpent: totalSpent
                });
            }
        } catch (error) {
            console.error('Error fetching counts:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCounts();
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

    const handleEditProfile = () => {
        navigation.navigate('User_Edit_Profile');
    };

    const handleChangePassword = () => {
        navigation.navigate('UserPasswordEdit');
    };

    const handleAddresses = () => {
        navigation.navigate('CustomerAddress');
    };

    const handleBecomeSeller = () => {
        navigation.navigate('BecomeSeller');
    };

    const handleOrders = () => {
        navigation.navigate('OrderHistory');
    };

    const handleWishlist = () => {
        navigation.navigate('Wishlist');
    };

    const handleCart = () => {
        navigation.navigate('Cart');
    };

    const getUserInitials = () => {
        if (!user?.name) return '?';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return user.name.substring(0, 2).toUpperCase();
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Admin': return '#FF6B6B';
            case 'Moderator': return '#FF9F43';
            case 'Seller': return '#4CAF50';
            case 'Buyer': return '#3498DB';
            default: return '#999';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return 'shield-checkmark-outline';
            case 'Moderator': return 'people-outline';
            case 'Seller': return 'storefront-outline';
            case 'Buyer': return 'person-outline';
            default: return 'person-outline';
        }
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)}`;
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.notLoggedInContainer}>
                    <Ionicons name="person-outline" size={80} color="#ccc" />
                    <Text style={styles.notLoggedInText}>Not Logged In</Text>
                    <Text style={styles.notLoggedInSubtext}>
                        Please login to view your account
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
                <Text style={styles.storeTitle}>My Account</Text>
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
                        <View style={[styles.avatar, { backgroundColor: getRoleColor(user?.role) }]}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Ionicons name={getRoleIcon(user?.role)} size={14} color="#fff" />
                            <Text style={styles.roleBadgeText}>{user?.role || 'User'}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <Text style={styles.userSince}>
                        Member since {user?.registration_date ? new Date(user.registration_date).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>

                <View style={styles.statsContainer}>
                    <TouchableOpacity style={styles.statCard} onPress={handleOrders}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="receipt-outline" size={24} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{orderStats.total}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                        {orderStats.pending > 0 && (
                            <View style={styles.statBadge}>
                                <Text style={styles.statBadgeText}>{orderStats.pending} pending</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleWishlist}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                        </View>
                        <Text style={styles.statNumber}>{wishlistCount}</Text>
                        <Text style={styles.statLabel}>Wishlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleCart}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="cart-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{cartCount}</Text>
                        <Text style={styles.statLabel}>Cart Items</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.spentContainer}>
                    <TouchableOpacity 
                        style={styles.spentCard}
                        onPress={handleOrders}
                        activeOpacity={0.7}
                    >
                        <View style={styles.spentIconContainer}>
                            <Ionicons name="cash-outline" size={28} color="#fff" />
                        </View>
                        <View style={styles.spentInfo}>
                            <Text style={styles.spentLabel}>Total Spent</Text>
                            <Text style={styles.spentAmount}>{formatCurrency(orderStats.totalSpent)}</Text>
                            <Text style={styles.spentSubtext}>
                                {orderStats.completed} completed {orderStats.completed === 1 ? 'order' : 'orders'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Buyer Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleOrders}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>My Orders</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {orderStats.pending > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{orderStats.pending}</Text>
                            )}
                            {orderStats.total > 0 && (
                                <Text style={styles.menuBadge}>{orderStats.total}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleWishlist}>
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

                    <TouchableOpacity style={styles.menuItem} onPress={handleCart}>
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

                    <TouchableOpacity style={styles.menuItem} onPress={handleBecomeSeller}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="storefront-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Become a Seller</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Account Settings</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="person-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Edit Profile</Text>
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

                    <TouchableOpacity style={styles.menuItem} onPress={handleAddresses}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="location-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>My Addresses</Text>
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
        backgroundColor: '#333',
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
    userSince: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
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
        position: 'relative',
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
        textAlign: 'center',
    },
    statBadge: {
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        marginTop: 2,
    },
    statBadgeText: {
        fontSize: 9,
        color: '#fff',
        fontWeight: '600',
    },
    spentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    spentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    spentIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    spentInfo: {
        flex: 1,
    },
    spentLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    spentAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 1,
    },
    spentSubtext: {
        fontSize: 11,
        color: '#999',
        marginTop: 1,
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
});

export default Buyer_Account_Screen;