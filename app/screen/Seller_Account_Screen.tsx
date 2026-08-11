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
    Alert,
    RefreshControl
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
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalSales: 0,
        totalReviews: 0,
        pendingOrders: 0
    });

    useEffect(() => {
        if (isAuthenticated && user?.role === 'Seller') {
            fetchSellerData();
        }
    }, [isAuthenticated]);

    const fetchSellerData = async () => {
        try {
            setLoading(true);
            // Fetch seller profile
            const profile = await apiService.checkSellerStatus();
            if (profile.hasApplied) {
                setSellerStatus(profile.status);
                setIsSuspended(profile.status === 'suspended');
                if (profile.status === 'approved') {
                    setSellerProfile(profile.profile);
                }
            }

            // Fetch seller stats
            const productsData = await apiService.getMyProducts();
            setStats({
                totalProducts: productsData.length || 12,
                totalOrders: 45,
                totalSales: 7890,
                totalReviews: 23,
                pendingOrders: productsData.filter(p => p.status === 'pending').length || 3
            });
        } catch (error) {
            console.error('Error fetching seller data:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSellerData();
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
        Alert.alert('My Orders', 'Orders page coming soon!');
    };

    const handleMyWishlist = () => {
        navigation.navigate('Wishlist');
    };

    const handleMyProducts = () => {
        navigation.navigate('SellerMyProducts');
    };

    const handleSalesAnalytics = () => {
        Alert.alert('Sales Analytics', 'Analytics dashboard coming soon!');
    };

    const handleStoreSettings = () => {
        Alert.alert('Store Settings', 'Store settings coming soon!');
    };

    // Get user initials for avatar
    const getUserInitials = () => {
        if (!user?.name) return '?';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return user.name.substring(0, 2).toUpperCase();
    };

    // Format currency
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

            {/* Top Bar */}
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
                {/* Profile Header */}
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

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalOrders}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="cash-outline" size={22} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{formatCurrency(stats.totalSales)}</Text>
                        <Text style={styles.statLabel}>Sales</Text>
                    </View>
                </View>

                {/* Quick Stats Row */}
                <View style={styles.quickStatsContainer}>
                    <View style={styles.quickStatItem}>
                        <Text style={styles.quickStatNumber}>{stats.pendingOrders}</Text>
                        <Text style={styles.quickStatLabel}>Pending Orders</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatItem}>
                        <Text style={styles.quickStatNumber}>{stats.totalReviews}</Text>
                        <Text style={styles.quickStatLabel}>Reviews</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStatItem}>
                        <Text style={styles.quickStatNumber}>
                            {stats.totalProducts > 0 ? Math.round((stats.totalOrders / stats.totalProducts) * 10) / 10 : 0}
                        </Text>
                        <Text style={styles.quickStatLabel}>Avg Sales/Product</Text>
                    </View>
                </View>

                {/* Seller Menu - Conditional based on suspension */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Seller Tools</Text>

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

                            <TouchableOpacity style={styles.menuItem} onPress={handleMyOrders}>
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                        <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                                    </View>
                                    <Text style={styles.menuText}>My Orders</Text>
                                </View>
                                <View style={styles.menuRight}>
                                    {stats.pendingOrders > 0 && (
                                        <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingOrders}</Text>
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
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
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

                            <TouchableOpacity style={styles.menuItem} onPress={handleStoreSettings}>
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                        <Ionicons name="settings-outline" size={22} color="#9C27B0" />
                                    </View>
                                    <Text style={styles.menuText}>Store Settings</Text>
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

                {/* Account Settings */}
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
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="storefront-outline" size={22} color="#2196F3" />
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

                {/* Logout Button */}
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
    // Not logged in
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
    // Profile Header
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
    // Stats
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
    // Quick Stats
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
    // Menu
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
    // Logout
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

export default Seller_Account_Screen;