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
        totalRevenue: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchAdminStats();
        }
    }, [isAuthenticated]);

    const fetchAdminStats = async () => {
        try {
            setLoading(true);
            // You'll implement these API calls later
            // For now, using placeholder data
            setStats({
                totalUsers: 150,
                totalSellers: 45,
                totalModerators: 3,
                totalCategories: 20,
                totalProducts: 120,
                totalProductsSold: 89,
                pendingSellers: 5,
                pendingProducts: 8,
                ordersDone: 89,
                totalRevenue: 12450
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


    const handleViewModerationHistory = () => {
        navigation.navigate('PersonalModerationHistory');
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

    const handleAnalytics = () => {
        Alert.alert('Analytics', 'Coming soon!');
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

    // Check if user is admin
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

            {/* Top Bar */}
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
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: '#DC3545' }]}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#fff" />
                            <Text style={styles.roleBadgeText}>Admin 🛡️</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Admin'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <Text style={styles.userSince}>
                        Member since {user?.registration_date ? new Date(user.registration_date).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>

                {/* Stats Row 1: Users, Sellers, Moderators */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                            <Ionicons name="people-outline" size={24} color="#2196F3" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Users</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="storefront-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalSellers}</Text>
                        <Text style={styles.statLabel}>Sellers</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#f3e5f5' }]}>
                            <Ionicons name="shield-outline" size={24} color="#9C27B0" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalModerators}</Text>
                        <Text style={styles.statLabel}>Moderators</Text>
                    </View>
                </View>

                {/* Stats Row 2: Categories, Products, Products Sold */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="grid-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalCategories}</Text>
                        <Text style={styles.statLabel}>Categories</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Products</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="cart-outline" size={24} color="#FF6B6B" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProductsSold}</Text>
                        <Text style={styles.statLabel}>Products Sold</Text>
                    </View>
                </View>

                {/* Stats Row 3: Pending Sellers, Pending Products */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="people-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingSellers}</Text>
                        <Text style={styles.statLabel}>Pending Sellers</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="cube-outline" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingProducts}</Text>
                        <Text style={styles.statLabel}>Pending Products</Text>
                    </View>

                </View>

                {/* Stats Row 4: Orders Done, Total Revenue */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="receipt-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.ordersDone}</Text>
                        <Text style={styles.statLabel}>Orders Done</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="trending-up-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
                        <Text style={styles.statLabel}>Total Revenue</Text>
                    </View>
                </View>

                {/* Admin Tools */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Admin Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleUserManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>User Management</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleSellerManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="storefront-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Seller Management</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleModeratorManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="shield-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>Moderator Management</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleProductManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Product Management</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleCategoryManagement}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="folder-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Category Management</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleAllModerationHistory}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="document-text-outline" size={22} color="#FF6B6B" />
                            </View>
                            <Text style={styles.menuText}>All Moderation History</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
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

                {/* Moderator Tools */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>🛡️ Moderator Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleApproveSellers}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>Approve Sellers</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleApproveProducts}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="cube-outline" size={22} color="#FF9800" />
                            </View>
                            <Text style={styles.menuText}>Approve Products</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleViewModerationHistory}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="document-text-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>View Moderation History</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
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