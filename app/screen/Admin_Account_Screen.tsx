import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface AdminStats {
    totalUsers: number;
    totalSellers: number;
    totalModerators: number;
    totalCategories: number;
    totalProducts: number;
    totalProductsSold: number;
    pendingSellers: number;
    pendingProducts: number;
    ordersDone: number;
    totalRevenue: number;
    totalModerationHistory: number;
    totalAllModerationHistory: number;
    totalDeletedProducts: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    completedOrders: number;
}

const Admin_Account_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalSellers: 0,
        totalModerators: 0,
        totalCategories: 0,
        totalProducts: 0,
        totalProductsSold: 0,
        pendingSellers: 0,
        pendingProducts: 0,
        ordersDone: 0,
        totalRevenue: 0,
        totalModerationHistory: 0,
        totalAllModerationHistory: 0,
        totalDeletedProducts: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        completedOrders: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchAdminStats();
        }
    }, [isAuthenticated]);

    const fetchAdminStats = async () => {
        try {
            setLoading(true);
            
            let totalUsers = 0;
            let totalSellers = 0;
            let totalModerators = 0;
            let totalCategories = 0;
            let totalProducts = 0;
            let totalProductsSold = 0;
            let pendingSellers = 0;
            let pendingProducts = 0;
            let ordersDone = 0;
            let totalRevenue = 0;
            let totalModerationHistory = 0;
            let totalAllModerationHistory = 0;
            let totalDeletedProducts = 0;
            let pendingOrders = 0;
            let processingOrders = 0;
            let shippedOrders = 0;
            let completedOrders = 0;

            try {
                const usersResponse = await apiService.getUsers(1, 1);
                if (usersResponse && usersResponse.success) {
                    totalUsers = usersResponse.pagination?.total || 0;
                }
            } catch (e) {
                console.log('Could not fetch users');
            }

            try {
                const sellersResponse = await apiService.getSellersForAdmin(1, 1);
                if (sellersResponse && sellersResponse.success) {
                    totalSellers = sellersResponse.pagination?.total || 0
                    if (sellersResponse.data) {
                        pendingSellers = sellersResponse.data.filter((s: any) => s.approval_status === 'pending').length;
                    }
                }
            } catch (e) {
                console.log('Could not fetch sellers');
            }

            try {
                const moderatorsResponse = await apiService.getModeratorsForAdmin(1, 1);
                console.log('📋 Moderators Response:', JSON.stringify(moderatorsResponse, null, 2));
                if (moderatorsResponse && moderatorsResponse.success) {
                    totalModerators = moderatorsResponse.pagination?.total || 0;
                }
            } catch (e) {
                console.log('Could not fetch moderators:', e);
            }

    
            try {
                const categoriesResponse = await apiService.getCategoriesForAdmin(1, 1);
                console.log('📋 Categories Response:', JSON.stringify(categoriesResponse, null, 2));
                if (categoriesResponse && categoriesResponse.success) {
                    totalCategories = categoriesResponse.pagination?.total || 0;
                }
            } catch (e) {
                console.log('Could not fetch categories:', e);
            }

            try {
                const productsResponse = await apiService.getProductsForAdmin(1, 1);
                if (productsResponse && productsResponse.success) {
                    totalProducts = productsResponse.pagination?.total || 0;
                    if (productsResponse.data) {
                        pendingProducts = productsResponse.data.filter((p: any) => p.status === 'pending').length;
                    }
                }
            } catch (e) {
                console.log('Could not fetch products');
            }

            try {
                const deletedResponse = await apiService.getDeletedProducts();
                if (deletedResponse && deletedResponse.success) {
                    totalDeletedProducts = deletedResponse.pagination?.total || 0;
                }
            } catch (e) {
                console.log('Could not fetch deleted products');
            }

            try {
                const ordersResponse = await apiService.getAllOrdersForAdmin();
                if (ordersResponse && ordersResponse.success) {
                    const orders = ordersResponse.data || [];
                    pendingOrders = orders.filter((o: any) => o.orderStatus === 'Pending').length;
                    processingOrders = orders.filter((o: any) => o.orderStatus === 'Processing').length;
                    shippedOrders = orders.filter((o: any) => o.orderStatus === 'Shipped').length;
                    completedOrders = orders.filter((o: any) => o.orderStatus === 'Completed').length;
                    ordersDone = completedOrders;
                    orders.forEach((order: any) => {
                        if (order.orderStatus === 'Completed') {
                            totalRevenue += parseFloat(order.totalPrice || 0);
                        }
                    });
                    orders.forEach((order: any) => {
                        if (order.orderStatus === 'Completed' && order.items) {
                            order.items.forEach((item: any) => {
                                totalProductsSold += item.quantity || 0;
                            });
                        }
                    });
                }
            } catch (e) {
                console.log('Could not fetch orders');
            }

            try {
                const personalHistoryResponse = await apiService.getModerationHistory(1, 0);
                if (personalHistoryResponse && personalHistoryResponse.success) {
                    totalModerationHistory = personalHistoryResponse.pagination?.total || 0;
                    console.log('📋 Personal moderation history count:', totalModerationHistory);
                }
            } catch (e) {
                console.log('Could not fetch personal moderation history');
            }
            try {
                const allHistoryResponse = await apiService.getAllModerationHistory();
                if (allHistoryResponse && allHistoryResponse.success) {
                    totalAllModerationHistory = allHistoryResponse.pagination?.total || 0;
                    console.log('📋 ALL moderation history count:', totalAllModerationHistory);
                }
            } catch (e) {
                console.log('Could not fetch all moderation history');
            }


            setStats({
                totalUsers,
                totalSellers,
                totalModerators,
                totalCategories,
                totalProducts,
                totalProductsSold,
                pendingSellers,
                pendingProducts,
                ordersDone,
                totalRevenue,
                totalModerationHistory,
                totalAllModerationHistory,
                totalDeletedProducts,
                pendingOrders,
                processingOrders,
                shippedOrders,
                completedOrders
            });

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };


    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAdminStats();
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

    const handleUserManagement = () => {
        navigation.navigate('AdminUserManagement');
    };

    const handleSellerManagement = () => {
        navigation.navigate('AdminSellerManagement');
    };

    const handleModeratorManagement = () => {
        navigation.navigate('AdminModeratorManagement');
    };

    const handleProductManagement = () => {
        navigation.navigate('AdminProductManagement');
    };

    const handleCategoryManagement = () => {
        navigation.navigate('AdminCategoryManagement');
    };

    const handleOrderManagement = () => {
        navigation.navigate('AdminOrderManagement');
    };

    const handleDeletedProducts = () => {
        navigation.navigate('AdminDeletedProducts');
    };

    const handleAllModerationHistory = () => {
        navigation.navigate('AdminAllModerationHistory');
    };

    const handleApproveSellers = () => {
        navigation.navigate('ModeratePendingSellers');
    };

    const handleApproveProducts = () => {
        navigation.navigate('ModeratePendingProducts');
    };

    const handleViewModerationHistory = () => {
        navigation.navigate('PersonalModerationHistory');
    };

    const handleAnalytics = () => {
        Alert.alert(
            'Admin Analytics',
            `Platform Summary\n\n` +
            `Users: ${stats.totalUsers}\n` +
            `Sellers: ${stats.totalSellers}\n` +
            `Moderators: ${stats.totalModerators}\n` +
            `Products: ${stats.totalProducts}\n` +
            `Categories: ${stats.totalCategories}\n\n` +
            `Orders Summary\n` +
            `├─ Pending: ${stats.pendingOrders}\n` +
            `├─ Processing: ${stats.processingOrders}\n` +
            `├─ Shipped: ${stats.shippedOrders}\n` +
            `└─ Completed: ${stats.completedOrders}\n\n` +
            `Total Revenue: $${stats.totalRevenue.toFixed(2)}\n` +
            `Products Sold: ${stats.totalProductsSold}\n` +
            `Pending Actions: ${stats.pendingProducts + stats.pendingSellers}`,
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
                    <Ionicons name="shield-outline" size={80} color="#ccc" />
                    <Text style={styles.notLoggedInText}>Not Logged In</Text>
                    <Text style={styles.notLoggedInSubtext}>
                        Please login to view your admin dashboard
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

    if (user?.role !== 'Admin') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.notLoggedInContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.notLoggedInText}>Access Denied</Text>
                    <Text style={styles.notLoggedInSubtext}>
                        You don't have permission to view this page.
                    </Text>
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.loginButtonText}>Go to Home</Text>
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
                <Text style={styles.storeTitle}>Admin Panel</Text>
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
                        <View style={[styles.avatar, { backgroundColor: '#DC3545' }]}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#fff" />
                            <Text style={styles.roleBadgeText}>Admin</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <Text style={styles.userSince}>
                        Member since {user?.registration_date ? new Date(user.registration_date).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCard} onPress={handleUserManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="people-outline" size={24} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleSellerManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="storefront-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalSellers}</Text>
                        <Text style={styles.statLabel}>Sellers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleModeratorManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#f3e5f5' }]}>
                            <Ionicons name="shield-outline" size={24} color="#9C27B0" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalModerators}</Text>
                        <Text style={styles.statLabel}>Moderators</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCard} onPress={handleCategoryManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="grid-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalCategories}</Text>
                        <Text style={styles.statLabel}>Categories</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleProductManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleOrderManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="cart-outline" size={24} color="#FF6B6B" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProductsSold}</Text>
                        <Text style={styles.statLabel}>Products Sold</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCard} onPress={handleApproveSellers}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="people-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingSellers}</Text>
                        <Text style={styles.statLabel}>Pending Sellers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleApproveProducts}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="cube-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingProducts}</Text>
                        <Text style={styles.statLabel}>Pending Products</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCard} onPress={handleOrderManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="receipt-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.ordersDone}</Text>
                        <Text style={styles.statLabel}>Orders Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleOrderManagement}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
                        <Text style={styles.statLabel}>Total Revenue</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Admin Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleUserManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>User Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalUsers > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalUsers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleSellerManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="storefront-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Seller Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalSellers > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleModeratorManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="shield-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>Moderator Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalModerators > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalModerators}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleProductManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Product Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalProducts > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleDeletedProducts}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="trash-outline" size={22} color="#6C5CE7" />
                            </View>
                            <Text style={styles.menuText}>Deleted Products</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalDeletedProducts > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.totalDeletedProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleCategoryManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="folder-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Category Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalCategories > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalCategories}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleOrderManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="receipt-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>Order Management</Text>
                        </View>
                        <View style={styles.menuRight}>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.orderStatusBar}>
                        <TouchableOpacity 
                            style={[styles.statusItem, { backgroundColor: '#FFC107' }]} 
                            onPress={() => navigation.navigate('AdminOrderManagement', { filter: 'Pending' })}
                        >
                            <Text style={styles.statusNumber}>{stats.pendingOrders}</Text>
                            <Text style={styles.statusLabel}>Pending</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.statusItem, { backgroundColor: '#00BCD4' }]} 
                            onPress={() => navigation.navigate('AdminOrderManagement', { filter: 'Processing' })}
                        >
                            <Text style={styles.statusNumber}>{stats.processingOrders}</Text>
                            <Text style={styles.statusLabel}>Processing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.statusItem, { backgroundColor: '#9C27B0' }]} 
                            onPress={() => navigation.navigate('AdminOrderManagement', { filter: 'Shipped' })}
                        >
                            <Text style={styles.statusNumber}>{stats.shippedOrders}</Text>
                            <Text style={styles.statusLabel}>Shipped</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.statusItem, { backgroundColor: '#4CAF50' }]} 
                            onPress={() => navigation.navigate('AdminOrderManagement', { filter: 'Completed' })}
                        >
                            <Text style={styles.statusNumber}>{stats.completedOrders}</Text>
                            <Text style={styles.statusLabel}>Completed</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.menuItem} onPress={handleAllModerationHistory}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="document-text-outline" size={22} color="#FF6B6B" />
                            </View>
                            <Text style={styles.menuText}>All Moderation History</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalModerationHistory > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalAllModerationHistory}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleAnalytics}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="bar-chart-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Analytics</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Moderator Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleApproveSellers}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>Approve Sellers</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.pendingSellers > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleApproveProducts}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="cube-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Approve Products</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.pendingProducts > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleViewModerationHistory}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="document-text-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>View Moderation History</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.totalModerationHistory > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalModerationHistory}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
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
        backgroundColor: '#DC3545',
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
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
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
        fontSize: 11,
        fontWeight: 'bold',
        marginRight: 8,
        minWidth: 20,
        textAlign: 'center',
    },
    menuBadgeWarning: {
        backgroundColor: '#FF6B6B',
    },
    
    orderStatusBar: {
        flexDirection: 'row',
        paddingVertical: 8,
        gap: 6,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 6,
        marginHorizontal: 2,
    },
    statusNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusLabel: {
        fontSize: 9,
        color: '#fff',
        marginTop: 1,
        fontWeight: '500',
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

export default Admin_Account_Screen;