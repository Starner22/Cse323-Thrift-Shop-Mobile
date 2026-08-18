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
    pendingSellers: number;
    totalSellers: number;
    moderationHistory: number;
}

const Moderator_Account_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<ModStats>({
        pendingProducts: 0,
        totalProducts: 0,
        pendingSellers: 0,
        totalSellers: 0,
        moderationHistory: 0
    });

    const canModerateSellers = user?.permissions?.can_moderate_sellers || false;
    const canModerateProducts = user?.permissions?.can_moderate_products || false;
    const canApproveNewSellers = user?.permissions?.can_approve_new_sellers || false;
    const canApproveNewProducts = user?.permissions?.can_approve_new_products || false;
    const canViewAnalytics = user?.permissions?.can_view_analytics || false;
    const isAdmin = user?.role === 'Admin';

    useEffect(() => {
        if (isAuthenticated) {
            fetchModStats();
        }
    }, [isAuthenticated]);

    const fetchModStats = async () => {
        try {
            setLoading(true);
            let pendingProducts = 0;
            let totalProducts = 0;
            let pendingSellers = 0;
            let totalSellers = 0;
            let moderationHistory = 0;

            if (canApproveNewProducts || isAdmin) {
                    const pendingProductsData = await apiService.getPendingProducts();
                    pendingProducts = Array.isArray(pendingProductsData) ? pendingProductsData.length : 0;

            }
            if (canModerateProducts || isAdmin) {
                    const allProductsData = await apiService.getAllProductsForModeration();
                    totalProducts = Array.isArray(allProductsData) ? allProductsData.length : 0;

            }
            if (canApproveNewSellers || isAdmin) {
                    const pendingSellersData = await apiService.getPendingSellers();
                    pendingSellers = Array.isArray(pendingSellersData) ? pendingSellersData.length : 0;
            }
            if (canModerateSellers || isAdmin) {
                    const allSellersData = await apiService.getAllSellersForManagement();
                    totalSellers = Array.isArray(allSellersData) ? allSellersData.length : 0;
            }
            if (canViewAnalytics || isAdmin) {
                    const historyData = await apiService.getModerationHistory(1, 0);

                    moderationHistory = historyData?.pagination?.total || 0;

            }

            setStats({
                pendingProducts,
                totalProducts,
                pendingSellers,
                totalSellers,
                moderationHistory
            });

        } catch (error) {
            console.error('❌ Error fetching moderator stats:', error);
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
                'You don\'t have permission to approve products.'
            );
            return;
        }
        navigation.navigate('ModeratePendingProducts');
    };

    const handleAllProducts = () => {
        if (!canModerateProducts && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to moderate products.'
            );
            return;
        }
        navigation.navigate('ModerateCurrentProducts');
    };

    const handlePendingSellers = () => {
        if (!canApproveNewSellers && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to approve sellers.'
            );
            return;
        }
        navigation.navigate('ModeratePendingSellers');
    };

    const handleAllSellers = () => {
        if (!canModerateSellers && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to manage sellers.'
            );
            return;
        }
        navigation.navigate('ModerateCurrentSellers');
    };

    const handleModerationHistory = () => {
        if (!canViewAnalytics && !isAdmin) {
            Alert.alert(
                'Access Denied',
                'You don\'t have permission to view moderation history.'
            );
            return;
        }
        navigation.navigate('PersonalModerationHistory');
    };

    const handleSettings = () => {
        navigation.navigate('User_Edit_Profile');
    };

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
                <View style={styles.statsGrid}>
                    <Text style={styles.sectionTitle}>Product Management</Text>
                    <View style={styles.statsRow}>
                        <TouchableOpacity 
                            style={[styles.statCard, (!canApproveNewProducts && !isAdmin) && styles.statCardDisabled]} 
                            onPress={handlePendingProducts}
                            disabled={!canApproveNewProducts && !isAdmin}
                        >
                            <View style={[styles.statIcon, { backgroundColor: canApproveNewProducts || isAdmin ? '#fff3e0' : '#f5f5f5' }]}>
                                <Ionicons name="hourglass-outline" size={24} color={canApproveNewProducts || isAdmin ? '#FF9F43' : '#ccc'} />
                            </View>
                            <Text style={[styles.statNumber, (!canApproveNewProducts && !isAdmin) && styles.statNumberDisabled]}>
                                {canApproveNewProducts || isAdmin ? stats.pendingProducts : '🔒'}
                            </Text>
                            <Text style={[styles.statLabel, (!canApproveNewProducts && !isAdmin) && styles.statLabelDisabled]}>
                                Pending Products
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.statCard, (!canModerateProducts && !isAdmin) && styles.statCardDisabled]} 
                            onPress={handleAllProducts}
                            disabled={!canModerateProducts && !isAdmin}
                        >
                            <View style={[styles.statIcon, { backgroundColor: canModerateProducts || isAdmin ? '#e8f5e9' : '#f5f5f5' }]}>
                                <Ionicons name="grid-outline" size={24} color={canModerateProducts || isAdmin ? '#4CAF50' : '#ccc'} />
                            </View>
                            <Text style={[styles.statNumber, (!canModerateProducts && !isAdmin) && styles.statNumberDisabled]}>
                                {canModerateProducts || isAdmin ? stats.totalProducts : '🔒'}
                            </Text>
                            <Text style={[styles.statLabel, (!canModerateProducts && !isAdmin) && styles.statLabelDisabled]}>
                                Total Products
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sellerStats}>
                    <Text style={styles.sectionTitle}>Seller Management</Text>
                    <View style={styles.sellerStatsRow}>
                        <TouchableOpacity 
                            style={[styles.sellerStatItem, (!canApproveNewSellers && !isAdmin) && styles.sellerStatItemDisabled]} 
                            onPress={handlePendingSellers}
                            disabled={!canApproveNewSellers && !isAdmin}
                        >
                            <View style={[styles.sellerStatIcon, { backgroundColor: canApproveNewSellers || isAdmin ? '#e3f2fd' : '#f5f5f5' }]}>
                                <Ionicons name="person-add-outline" size={22} color={canApproveNewSellers || isAdmin ? '#2196F3' : '#ccc'} />
                            </View>
                            <View>
                                <Text style={[styles.sellerStatNumber, (!canApproveNewSellers && !isAdmin) && styles.sellerStatNumberDisabled]}>
                                    {canApproveNewSellers || isAdmin ? stats.pendingSellers : '🔒'}
                                </Text>
                                <Text style={[styles.sellerStatLabel, (!canApproveNewSellers && !isAdmin) && styles.sellerStatLabelDisabled]}>
                                    Pending Sellers
                                </Text>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.sellerStatItem, (!canModerateSellers && !isAdmin) && styles.sellerStatItemDisabled]} 
                            onPress={handleAllSellers}
                            disabled={!canModerateSellers && !isAdmin}
                        >
                            <View style={[styles.sellerStatIcon, { backgroundColor: canModerateSellers || isAdmin ? '#e8f5e9' : '#f5f5f5' }]}>
                                <Ionicons name="people-outline" size={22} color={canModerateSellers || isAdmin ? '#4CAF50' : '#ccc'} />
                            </View>
                            <View>
                                <Text style={[styles.sellerStatNumber, (!canModerateSellers && !isAdmin) && styles.sellerStatNumberDisabled]}>
                                    {canModerateSellers || isAdmin ? stats.totalSellers : '🔒'}
                                </Text>
                                <Text style={[styles.sellerStatLabel, (!canModerateSellers && !isAdmin) && styles.sellerStatLabelDisabled]}>
                                    Total Sellers
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>Moderation Tools</Text>

                    <TouchableOpacity 
                        style={[styles.menuItem, (!canApproveNewProducts && !isAdmin) && styles.menuItemDisabled]} 
                        onPress={handlePendingProducts}
                        disabled={!canApproveNewProducts && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: canApproveNewProducts || isAdmin ? '#fff3e0' : '#f5f5f5' }]}>
                                <Ionicons name="hourglass-outline" size={22} color={canApproveNewProducts || isAdmin ? '#FF9F43' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, (!canApproveNewProducts && !isAdmin) && styles.menuTextDisabled]}>
                                Pending Products
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {(canApproveNewProducts || isAdmin) && stats.pendingProducts > 0 && (
                                <Text style={styles.menuBadge}>{stats.pendingProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canApproveNewProducts || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.menuItem, (!canModerateProducts && !isAdmin) && styles.menuItemDisabled]} 
                        onPress={handleAllProducts}
                        disabled={!canModerateProducts && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: canModerateProducts || isAdmin ? '#e8f5e9' : '#f5f5f5' }]}>
                                <Ionicons name="grid-outline" size={22} color={canModerateProducts || isAdmin ? '#4CAF50' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, (!canModerateProducts && !isAdmin) && styles.menuTextDisabled]}>
                                All Products
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {(canModerateProducts || isAdmin) && stats.totalProducts > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalProducts}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canModerateProducts || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, (!canApproveNewSellers && !isAdmin) && styles.menuItemDisabled]} 
                        onPress={handlePendingSellers}
                        disabled={!canApproveNewSellers && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: canApproveNewSellers || isAdmin ? '#e3f2fd' : '#f5f5f5' }]}>
                                <Ionicons name="person-add-outline" size={22} color={canApproveNewSellers || isAdmin ? '#2196F3' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, (!canApproveNewSellers && !isAdmin) && styles.menuTextDisabled]}>
                                Pending Sellers
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {(canApproveNewSellers || isAdmin) && stats.pendingSellers > 0 && (
                                <Text style={[styles.menuBadge, styles.menuBadgeWarning]}>{stats.pendingSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canApproveNewSellers || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, (!canModerateSellers && !isAdmin) && styles.menuItemDisabled]} 
                        onPress={handleAllSellers}
                        disabled={!canModerateSellers && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: canModerateSellers || isAdmin ? '#fce4ec' : '#f5f5f5' }]}>
                                <Ionicons name="people-outline" size={22} color={canModerateSellers || isAdmin ? '#FF6B6B' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, (!canModerateSellers && !isAdmin) && styles.menuTextDisabled]}>
                                Manage Sellers
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {(canModerateSellers || isAdmin) && stats.totalSellers > 0 && (
                                <Text style={styles.menuBadge}>{stats.totalSellers}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canModerateSellers || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.menuItem, (!canViewAnalytics && !isAdmin) && styles.menuItemDisabled]} 
                        onPress={handleModerationHistory}
                        disabled={!canViewAnalytics && !isAdmin}
                    >
                        <View style={styles.menuLeft}>
                            <View style={[styles.menuIcon, { backgroundColor: canViewAnalytics || isAdmin ? '#f3e5f5' : '#f5f5f5' }]}>
                                <Ionicons name="document-text-outline" size={22} color={canViewAnalytics || isAdmin ? '#9C27B0' : '#ccc'} />
                            </View>
                            <Text style={[styles.menuText, (!canViewAnalytics && !isAdmin) && styles.menuTextDisabled]}>
                                Moderation History
                            </Text>
                        </View>
                        <View style={styles.menuRight}>
                            {(canViewAnalytics || isAdmin) && stats.moderationHistory > 0 && (
                                <Text style={styles.menuBadge}>{stats.moderationHistory}</Text>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={canViewAnalytics || isAdmin ? '#ccc' : '#e0e0e0'} />
                        </View>
                    </TouchableOpacity>
                </View>

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

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
        paddingHorizontal: 4,
    },

    statsGrid: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statCard: {
        alignItems: 'center',
        flex: 1,
    },
    statCardDisabled: {
        opacity: 0.5,
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
    statNumberDisabled: {
        color: '#ccc',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
    },
    statLabelDisabled: {
        color: '#ccc',
    },

    sellerStats: {
        backgroundColor: '#fff',
        padding: 16,
        marginTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
    sellerStatItemDisabled: {
        opacity: 0.5,
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
    sellerStatNumberDisabled: {
        color: '#ccc',
    },
    sellerStatLabel: {
        fontSize: 12,
        color: '#999',
    },
    sellerStatLabelDisabled: {
        color: '#ccc',
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