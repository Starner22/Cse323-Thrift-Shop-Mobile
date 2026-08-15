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

    const canModerateSellers = user?.permissions?.can_moderate_sellers || false;
    const canModerateProducts = user?.permissions?.can_moderate_products || false;
    const canApproveNewSellers = user?.permissions?.can_approve_new_sellers || false;
    const canApproveNewProducts = user?.permissions?.can_approve_new_products || false;
    const canManageReports = user?.permissions?.can_manage_reports || false;
    const canViewAnalytics = user?.permissions?.can_view_analytics || false;
    const canManageModerators = user?.permissions?.can_manage_moderators || false;
    const isAdmin = user?.role === 'Admin';

    

    useEffect(() => {
        if (isAuthenticated) {
            fetchModStats();
        }
    }, [isAuthenticated]);

    const fetchModStats = async () => {
        try {
            setLoading(true);
            // placeholder
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
        if (!canApproveNewProducts && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to approve products.\n\nPlease contact your administrator.'
            );
            return;
        }
        navigation.navigate('ModeratePendingProducts');
    };

    const handleAllProducts = () => {
        if (!canModerateProducts && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to moderate products.\n\nPlease contact your administrator.'
            );
            return;
        }
        navigation.navigate('ModerateCurrentProducts');
    };

    const handlePendingSellers = () => {
        if (!canApproveNewSellers && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to approve sellers.\n\nPlease contact your administrator.'
            );
            return;
        }
        navigation.navigate('ModeratePendingSellers');
    };

    const handleAllSellers = () => {
        if (!canModerateSellers && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to manage sellers.\n\nPlease contact your administrator.'
            );
            return;
        }
        navigation.navigate('ModerateCurrentSellers');
    };

    const handleModerationHistory = () => {
        if (!canViewAnalytics && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to view moderation history.\n\nPlease contact your administrator.'
            );
            return;
        }
        navigation.navigate('PersonalModerationHistory');
    };

    const handleReports = () => {
        if (!canManageReports && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to manage reports.\n\nPlease contact your administrator.'
            );
            return;
        }
        Alert.alert('Reports', 'Reports coming soon!');
    };

    const handleAnalytics = () => {
        if (!canViewAnalytics && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to view analytics.\n\nPlease contact your administrator.'
            );
            return;
        }
        Alert.alert('Analytics', 'Analytics coming soon!');
    };

    const handleManageModerators = () => {
        if (!canManageModerators && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to manage moderators.\n\nPlease contact your administrator.'
            );
            return;
        }
        Alert.alert('Manage Moderators', 'Moderator management coming soon!');
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
                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handlePendingProducts}
                        disabled={!canModerateProducts && !isAdmin}
                    >
                        <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
                            <Ionicons name="time-outline" size={24} color={canModerateProducts || isAdmin ? '#FF9F43' : '#ccc'} />
                        </View>
                        <Text style={[styles.statNumber, { color: canModerateProducts || isAdmin ? '#333' : '#ccc' }]}>
                            {stats.pendingProducts}
                        </Text>
                        <Text style={[styles.statLabel, { color: canModerateProducts || isAdmin ? '#999' : '#ccc' }]}>
                            Pending Products
                        </Text>
                        {!canModerateProducts && !isAdmin && (
                            <Text style={styles.lockedLabel}>🔒 Locked</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handleAllProducts}
                        disabled={!canModerateProducts && !isAdmin}
                    >
                        <View style={[styles.statIcon, { backgroundColor: '#e8f5e9' }]}>
                            <Ionicons name="cube-outline" size={24} color={canModerateProducts || isAdmin ? '#4CAF50' : '#ccc'} />
                        </View>
                        <Text style={[styles.statNumber, { color: canModerateProducts || isAdmin ? '#333' : '#ccc' }]}>
                            {stats.totalProducts}
                        </Text>
                        <Text style={[styles.statLabel, { color: canModerateProducts || isAdmin ? '#999' : '#ccc' }]}>
                            Total Products
                        </Text>
                        {!canModerateProducts && !isAdmin && (
                            <Text style={styles.lockedLabel}>🔒 Locked</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.statCard} 
                        onPress={handleModerationHistory}
                        disabled={!canViewAnalytics && !isAdmin}
                    >
                        <View style={[styles.statIcon, { backgroundColor: '#fce4ec' }]}>
                            <Ionicons name="close-circle" size={24} color={canViewAnalytics || isAdmin ? '#FF6B6B' : '#ccc'} />
                        </View>
                        <Text style={[styles.statNumber, { color: canViewAnalytics || isAdmin ? '#333' : '#ccc' }]}>
                            {stats.rejectedProducts}
                        </Text>
                        <Text style={[styles.statLabel, { color: canViewAnalytics || isAdmin ? '#999' : '#ccc' }]}>
                            Rejected
                        </Text>
                        {!canViewAnalytics && !isAdmin && (
                            <Text style={styles.lockedLabel}>🔒 Locked</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Seller Stats */}
                <View style={styles.sellerStats}>
                    <Text style={styles.sellerStatsTitle}>Seller Management</Text>
                    <View style={styles.sellerStatsRow}>
                        <TouchableOpacity 
                            style={styles.sellerStatItem} 
                            onPress={handlePendingSellers}
                            disabled={!canApproveNewProducts && !isAdmin}
                        >
                            <View style={[styles.sellerStatIcon, { backgroundColor: canApproveNewProducts || isAdmin ? '#e3f2fd' : '#f0f0f0' }]}>
                                <Ionicons name="people-outline" size={22} color={canApproveNewProducts || isAdmin ? '#2196F3' : '#ccc'} />
                            </View>
                            <View>
                                <Text style={[styles.sellerStatNumber, { color: canApproveNewProducts || isAdmin ? '#333' : '#ccc' }]}>
                                    {stats.pendingSellers}
                                </Text>
                                <Text style={[styles.sellerStatLabel, { color: canApproveNewProducts || isAdmin ? '#999' : '#ccc' }]}>
                                    Pending Sellers
                                </Text>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.sellerStatItem} 
                            onPress={handleAllSellers}
                            disabled={!canModerateSellers && !isAdmin}
                        >
                            <View style={[styles.sellerStatIcon, { backgroundColor: canModerateSellers || isAdmin ? '#e8f5e9' : '#f0f0f0' }]}>
                                <Ionicons name="storefront" size={22} color={canModerateSellers || isAdmin ? '#4CAF50' : '#ccc'} />
                            </View>
                            <View>
                                <Text style={[styles.sellerStatNumber, { color: canModerateSellers || isAdmin ? '#333' : '#ccc' }]}>
                                    {stats.totalSellers}
                                </Text>
                                <Text style={[styles.sellerStatLabel, { color: canModerateSellers || isAdmin ? '#999' : '#ccc' }]}>
                                    Total Sellers
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Moderation Tools</Text>

                    {/* Products Section */}
                    <TouchableOpacity 
                        style={[styles.menuItem, !canModerateProducts && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handlePendingProducts}
                        disabled={!canModerateProducts && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="time-outline" size={22} color={canModerateProducts || isAdmin ? '#FF9F43' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canModerateProducts && !isAdmin && styles.menuTextDisabled]}>
                                Pending Products
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {canModerateProducts && stats.pendingProducts > 0 && (
                                <Text style={styles.menuBadge}>{stats.pendingProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canModerateProducts || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, !canModerateProducts && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handleAllProducts}
                        disabled={!canModerateProducts && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                <Ionicons name="cube-outline" size={22} color={canModerateProducts || isAdmin ? '#4CAF50' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canModerateProducts && !isAdmin && styles.menuTextDisabled]}>
                                All Products
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={canModerateProducts || isAdmin ? '#ccc' : '#e0e0e0'} />
                    </TouchableOpacity>

                    {/* Sellers Section */}
                    <TouchableOpacity 
                        style={[styles.menuItem, !canApproveNewProducts && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handlePendingSellers}
                        disabled={!canApproveNewProducts && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#e3f2fd' }]}>
                                <Ionicons name="people-outline" size={22} color={canApproveNewProducts || isAdmin ? '#2196F3' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canApproveNewProducts && !isAdmin && styles.menuTextDisabled]}>
                                Pending Sellers
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {canApproveNewProducts && stats.pendingSellers > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canApproveNewProducts || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, !canModerateSellers && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handleAllSellers}
                        disabled={!canModerateSellers && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="people-outline" size={22} color={canModerateSellers || isAdmin ? '#FF6B6B' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canModerateSellers && !isAdmin && styles.menuTextDisabled]}>
                                Manage Sellers
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={canModerateSellers || isAdmin ? '#ccc' : '#e0e0e0'} />
                    </TouchableOpacity>

                    {/* Reports Section */}
                    <TouchableOpacity 
                        style={[styles.menuItem, !canManageReports && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handleReports}
                        disabled={!canManageReports && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fff3e0' }]}>
                                <Ionicons name="flag-outline" size={22} color={canManageReports || isAdmin ? '#FF9800' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canManageReports && !isAdmin && styles.menuTextDisabled]}>
                                Reports & Flags
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={canManageReports || isAdmin ? '#ccc' : '#e0e0e0'} />
                    </TouchableOpacity>

                    {/* Analytics Section */}
                    <TouchableOpacity 
                        style={[styles.menuItem, !canViewAnalytics && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handleAnalytics}
                        disabled={!canViewAnalytics && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#f3e5f5' }]}>
                                <Ionicons name="bar-chart-outline" size={22} color={canViewAnalytics || isAdmin ? '#9C27B0' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canViewAnalytics && !isAdmin && styles.menuTextDisabled]}>
                                Analytics
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={canViewAnalytics || isAdmin ? '#ccc' : '#e0e0e0'} />
                    </TouchableOpacity>

                    {/* Moderation History */}
                    <TouchableOpacity 
                        style={[styles.menuItem, !canViewAnalytics && !isAdmin && styles.menuItemDisabled]} 
                        onPress={handleModerationHistory}
                        disabled={!canViewAnalytics && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: '#fce4ec' }]}>
                                <Ionicons name="list-outline" size={22} color={canViewAnalytics || isAdmin ? '#FF6B6B' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, !canViewAnalytics && !isAdmin && styles.menuTextDisabled]}>
                                Moderation History
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={canViewAnalytics || isAdmin ? '#ccc' : '#e0e0e0'} />
                    </TouchableOpacity>

                    {/* Admin Only: Manage Moderators */}
                    {user?.role === 'Admin' && (
                        <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={handleManageModerators}
                        >
                            <View style={styles.menuLeft}>
                                <View style={[styles.menuIcon, { backgroundColor: '#e8f5e9' }]}>
                                    <Ionicons name="shield-outline" size={22} color="#4CAF50" />
                                </View>
                                <Text style={styles.menuText}>Manage Moderators</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
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
    permissionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginTop: 6,
    },
    adminBadge: {
        backgroundColor: '#fff8e1',
    },
    permissionBadgeText: {
        fontSize: 11,
        color: '#3498DB',
        marginLeft: 4,
        fontWeight: '500',
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
    lockedLabel: {
        fontSize: 9,
        color: '#ccc',
        marginTop: 2,
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
    menuItemDisabled: {
        opacity: 0.5,
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
    menuTextDisabled: {
        color: '#ccc',
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