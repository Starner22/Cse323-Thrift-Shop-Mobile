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

interface ModStats {
    pendingProducts: number;
    totalProducts: number;
    rejectedProducts: number;
    pendingSellers: number;
    totalSellers: number;
}

const Moderator_Account_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<ModStats>({
        pendingProducts: 0,
        totalProducts: 0,
        rejectedProducts: 0,
        pendingSellers: 0,
        totalSellers: 0
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchModStats();
        }
    }, [isAuthenticated]);

    const fetchModStats = async () => {
        try {
            setLoading(true);
            // You'll implement these API calls later
            // For now, using placeholder data
            setStats({
                pendingProducts: 5,
                totalProducts: 120,
                rejectedProducts: 8,
                pendingSellers: 3,
                totalSellers: 15
            });
        } catch (error) {
            console.error('Error fetching moderator stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchModStats();
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

    const handlePendingProducts = () => {
        navigation.navigate('ModeratePendingProducts');
    };

    const handleAllProducts = () => {
        Alert.alert('All Products', 'Product management coming soon!');
    };

    const handlePendingSellers = () => {
        Alert.alert('Pending Sellers', 'Seller approval coming soon!');
    };

    const handleModerationHistory = () => {
        Alert.alert('Moderation History', 'History coming soon!');
    };

    const handleReports = () => {
        Alert.alert('Reports', 'Reports coming soon!');
    };

    const handleSettings = () => {
        navigation.navigate('User_Edit_Profile');
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

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.notLoggedInContainer}>
                    <Ionicons name="shield-outline" size={80} color="#ccc" />
                    <Text style={styles.notLoggedInText}>Not Logged In</Text>
                    <Text style={styles.notLoggedInSubtext}>
                        Please login to view your moderator dashboard
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

    // Check if user is moderator or admin
    if (user?.role !== 'Moderator' && user?.role !== 'Admin') {
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
                <Text style={styles.storeTitle}>Moderator Panel</Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleSettings}>
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
                        <View style={[styles.avatar, { backgroundColor: '#6C5CE7' }]}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Ionicons name="shield-checkmark" size={14} color="#fff" />
                            <Text style={styles.roleBadgeText}>{user?.role || 'Moderator'}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Moderator'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
                    <Text style={styles.userSince}>
                        Member since {user?.registration_date ? new Date(user.registration_date).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statCard} onPress={handlePendingProducts}>
                        <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="time-outline" size={24} color="#FF9F43" />
                        </View>
                        <Text style={styles.statNumber}>{stats.pendingProducts}</Text>
                        <Text style={styles.statLabel}>Pending Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleAllProducts}>
                        <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                        <Text style={styles.statLabel}>Total Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleModerationHistory}>
                        <View style={[styles.statIcon, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                        </View>
                        <Text style={styles.statNumber}>{stats.rejectedProducts}</Text>
                        <Text style={styles.statLabel}>Rejected</Text>
                    </TouchableOpacity>
                </View>

                {/* Seller Stats */}
                <View style={styles.sellerStats}>
                    <Text style={styles.sellerStatsTitle}>Seller Management</Text>
                    <View style={styles.sellerStatsRow}>
                        <TouchableOpacity style={styles.sellerStatItem} onPress={handlePendingSellers}>
                            <View style={[styles.sellerStatIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <View>
                                <Text style={styles.sellerStatNumber}>{stats.pendingSellers}</Text>
                                <Text style={styles.sellerStatLabel}>Pending Sellers</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sellerStatItem} onPress={handleAllProducts}>
                            <View style={[styles.sellerStatIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="storefront" size={22} color="#4CAF50" />
                            </View>
                            <View>
                                <Text style={styles.sellerStatNumber}>{stats.totalSellers}</Text>
                                <Text style={styles.sellerStatLabel}>Total Sellers</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Moderation Tools</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handlePendingProducts}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="time-outline" size={22} color="#FF9F43" />
                            </View>
                            <Text style={styles.menuText}>Pending Products</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.pendingProducts > 0 && (
                                <Text style={styles.menuBadge}>{stats.pendingProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleAllProducts}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="cube-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>All Products</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handlePendingSellers}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>Pending Sellers</Text>
                        </View>
                        <View style={styles.menuRight}>
                            {stats.pendingSellers > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleModerationHistory}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="list-outline" size={22} color="#FF6B6B" />
                            </View>
                            <Text style={styles.menuText}>Moderation History</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={handleReports}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="bar-chart-outline" size={22} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>Reports</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Account Settings</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="person-outline" size={22} color="#4CAF50" />
                            </View>
                            <Text style={styles.menuText}>Edit Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UserPasswordEdit')}>
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
        backgroundColor: '#6C5CE7',
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
    // Stats
    statsGrid: {
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
    statIcon: {
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
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
    },
    // Seller Stats
    sellerStats: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sellerStatsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    sellerStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    sellerStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingVertical: 8,
    },
    sellerStatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sellerStatNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sellerStatLabel: {
        fontSize: 12,
        color: '#999',
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
        backgroundColor: '#FF9F43',
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

export default Moderator_Account_Screen;