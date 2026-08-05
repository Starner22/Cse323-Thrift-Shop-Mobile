import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const BuyerAccountScreen = ({ navigation }: any) => {
    const { user, isAuthenticated, logout } = useAuth();

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

    const handleBecomeSeller = () => {
        navigation.navigate('BecomeSeller');
    };

    const handleOrders = () => {
        Alert.alert('My Orders', 'Orders page coming soon!');
    };

    const handleWishlist = () => {
        navigation.navigate('Wishlist');
    };

    const handleCart = () => {
        navigation.navigate('Cart');
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

    // Get role color
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Admin': return '#FF6B6B';
            case 'Moderator': return '#FF9F43';
            case 'Seller': return '#4CAF50';
            case 'Buyer': return '#3498DB';
            default: return '#999';
        }
    };

    // Get role icon
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return 'shield-checkmark-outline';
            case 'Moderator': return 'people-outline';
            case 'Seller': return 'storefront-outline';
            case 'Buyer': return 'person-outline';
            default: return 'person-outline';
        }
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

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>My Account</Text>
                <TouchableOpacity style={styles.iconButton} onPress={handleEditProfile}>
                    <Ionicons name="settings-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
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

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <TouchableOpacity style={styles.statCard} onPress={handleOrders}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="cube-outline" size={24} color="#4CAF50" />
                        </View>
                        <Text style={styles.statLabel}>Orders</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleWishlist}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
                        </View>
                        <Text style={styles.statLabel}>Wishlist</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard} onPress={handleCart}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="cart-outline" size={24} color="#3498DB" />
                        </View>
                        <Text style={styles.statLabel}>Cart Items</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <View style={styles.settingsContainer}>
                    <Text style={styles.settingsTitle}>Account Settings</Text>

                    <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="person-outline" size={22} color="#555" />
                            <Text style={styles.settingText}>Edit Profile</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="lock-closed-outline" size={22} color="#555" />
                            <Text style={styles.settingText}>Change Password</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleBecomeSeller}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="storefront-outline" size={22} color="#555" />
                            <Text style={styles.settingText}>Become a Seller</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleOrders}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="receipt-outline" size={22} color="#555" />
                            <Text style={styles.settingText}>My Orders</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={handleWishlist}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="heart-outline" size={22} color="#555" />
                            <Text style={styles.settingText}>My Wishlist</Text>
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
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f0f0f0',
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
    // Settings
    settingsContainer: {
        backgroundColor: '#fff',
        marginTop: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    settingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        paddingVertical: 12,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
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

export default BuyerAccountScreen;