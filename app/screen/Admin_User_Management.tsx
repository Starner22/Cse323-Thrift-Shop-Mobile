import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface User {
    userID: number;
    name: string;
    email: string;
    phone: string;
    role: 'Buyer' | 'Seller';
    registration_date: string;
    product_count?: number;
    order_count?: number;
}

interface UserDetails extends User {
    address?: string;
    default_address?: string;
}

const Admin_User_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const limit = 15;

    // Modals
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Buyer'
    });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchUsers();
        }
    }, [isAuthenticated, page, roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiService.getUsers(page, limit, searchQuery, roleFilter);
            if (response && response.success) {
                setUsers(response.data || []);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalUsers(response.pagination?.total || 0);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

    const handleSearch = () => {
        setPage(1);
        fetchUsers();
    };

    const handleViewUser = async (userID: number) => {
        try {
            const response = await apiService.getUserDetails(userID);
            if (response && response.success) {
                setSelectedUser(response.data);
                setShowViewModal(true);
            } else {
                Alert.alert('Error', 'Failed to load user details');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load user details');
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Buyer'
        });
        setEditingId(user.userID);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        
        if (!editForm.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!editForm.email.trim() || !editForm.email.includes('@')) {
            Alert.alert('Error', 'Valid email is required');
            return;
        }

        try {
            await apiService.adminUpdateUser(editingId, {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                phone: editForm.phone.trim(),
                role: editForm.role
            });
            Alert.alert('Success', 'User updated successfully');
            setShowEditModal(false);
            await fetchUsers();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update user');
        }
    };

    const handleDeleteUser = (user: User) => {
        const isSeller = user.role === 'Seller';
        const warningMsg = isSeller 
            ? `WARNING: "${user.name}" is a SELLER with ${user.product_count || 0} products and ${user.order_count || 0} orders. Deleting this user will also remove all their products and orders. Are you sure you want to proceed?`
            : `Are you sure you want to delete "${user.name}"? This action cannot be undone.`;

        Alert.alert(
            'Delete User',
            warningMsg,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeletingId(user.userID);
                            const response = await apiService.adminDeleteUser(user.userID);
                            Alert.alert(
                                'Success',
                                `User "${user.name}" has been deleted.${response.was_seller ? ' (This user was a seller)' : ''}`,
                                [{ text: 'OK' }]
                            );
                            await fetchUsers();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete user');
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const getRoleColor = (role: string) => {
        return role === 'Seller' ? '#4CAF50' : '#3498DB';
    };

    const getRoleIcon = (role: string) => {
        return role === 'Seller' ? 'storefront-outline' : 'person-outline';
    };

    const renderUserCard = ({ item }: { item: User }) => {
        const isDeleting = deletingId === item.userID;
        const roleColor = getRoleColor(item.role);
        const roleIcon = getRoleIcon(item.role);

        return (
            <View style={[styles.userCard, { borderLeftColor: roleColor, borderLeftWidth: 4 }]}>
                <View style={styles.userInfo}>
                    <View style={styles.userHeader}>
                        <View style={styles.nameContainer}>
                            <Ionicons name={roleIcon} size={18} color={roleColor} />
                            <Text style={styles.userName}>{item.name}</Text>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                                {item.role}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <View style={styles.userMeta}>
                        <Text style={styles.userMetaText}>Joined: {formatDate(item.registration_date)}</Text>
                        {item.role === 'Seller' && (
                            <Text style={styles.userMetaText}> {item.product_count || 0} products</Text>
                        )}
                        <Text style={styles.userMetaText}> {item.order_count || 0} orders</Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewUser(item.userID)}
                    >
                        <Ionicons name="eye-outline" size={18} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditUser(item)}
                    >
                        <Ionicons name="create-outline" size={18} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteUser(item)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                pages.push(i);
            } else if (i === page - 2 || i === page + 2) {
                pages.push(-1); // separator
            }
        }

        return (
            <View style={styles.paginationContainer}>
                <TouchableOpacity 
                    style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                    onPress={() => page > 1 && setPage(page - 1)}
                    disabled={page === 1}
                >
                    <Ionicons name="chevron-back" size={20} color={page === 1 ? '#ccc' : '#333'} />
                </TouchableOpacity>

                {pages.map((p, index) => {
                    if (p === -1) {
                        return (
                            <Text key={`sep-${index}`} style={styles.pageSeparator}>...</Text>
                        );
                    }
                    return (
                        <TouchableOpacity
                            key={p}
                            style={[styles.pageButton, page === p && styles.pageButtonActive]}
                            onPress={() => setPage(p)}
                        >
                            <Text style={[styles.pageButtonText, page === p && styles.pageButtonTextActive]}>
                                {p}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity 
                    style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                    onPress={() => page < totalPages && setPage(page + 1)}
                    disabled={page === totalPages}
                >
                    <Ionicons name="chevron-forward" size={20} color={page === totalPages ? '#ccc' : '#333'} />
                </TouchableOpacity>
            </View>
        );
    };

    if (!isAuthenticated || user?.role !== 'Admin') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Access Denied</Text>
                    <Text style={styles.authRequiredSubtext}>
                        You need admin privileges to view this page.
                    </Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.loginButtonText}>Go Back</Text>
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
                <Text style={styles.storeTitle}>User Management</Text>
                <Text style={styles.countBadge}>{totalUsers}</Text>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            handleSearch();
                        }}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterContainer}>
                    <TouchableOpacity 
                        style={styles.filterButton}
                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                    >
                        <Ionicons name="options-outline" size={18} color="#555" />
                        <Text style={styles.filterButtonText}>
                            {roleFilter === 'all' ? 'All Roles' : roleFilter}
                        </Text>
                        <Ionicons name={showRoleDropdown ? "chevron-up" : "chevron-down"} size={16} color="#555" />
                    </TouchableOpacity>

                    {showRoleDropdown && (
                        <View style={styles.filterDropdown}>
                            {['all', 'Buyer', 'Seller'].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.filterDropdownItem,
                                        roleFilter === role && styles.filterDropdownItemActive
                                    ]}
                                    onPress={() => {
                                        setRoleFilter(role);
                                        setShowRoleDropdown(false);
                                        setPage(1);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterDropdownText,
                                        roleFilter === role && styles.filterDropdownTextActive
                                    ]}>
                                        {role === 'all' ? 'All Roles' : role}
                                    </Text>
                                    {roleFilter === role && (
                                        <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading users...</Text>
                </View>
            ) : users.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Users Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No users match your search.' 
                            : 'No users registered yet.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={users}
                        renderItem={renderUserCard}
                        keyExtractor={(item) => item.userID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
            )}

            {/* View User Modal */}
            <Modal
                visible={showViewModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowViewModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowViewModal(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Details</Text>
                            <TouchableOpacity onPress={() => setShowViewModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedUser && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalAvatar}>
                                        <View style={[styles.modalAvatarCircle, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                                            <Text style={styles.modalAvatarText}>
                                                {selectedUser.name?.substring(0, 2).toUpperCase() || '??'}
                                            </Text>
                                        </View>
                                        <View style={[styles.modalRoleBadge, { backgroundColor: getRoleColor(selectedUser.role) + '20' }]}>
                                            <Text style={[styles.modalRoleBadgeText, { color: getRoleColor(selectedUser.role) }]}>
                                                {selectedUser.role}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>User ID:</Text>
                                        <Text style={styles.modalValue}>#{selectedUser.userID}</Text>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Name:</Text>
                                        <Text style={styles.modalValue}>{selectedUser.name}</Text>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Email:</Text>
                                        <Text style={styles.modalValue}>{selectedUser.email}</Text>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Phone:</Text>
                                        <Text style={styles.modalValue}>{selectedUser.phone || 'N/A'}</Text>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Joined:</Text>
                                        <Text style={styles.modalValue}>{formatDate(selectedUser.registration_date)}</Text>
                                    </View>

                                    {selectedUser.default_address && (
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Address:</Text>
                                            <Text style={styles.modalValue}>{selectedUser.default_address}</Text>
                                        </View>
                                    )}

                                    {selectedUser.role === 'Seller' && (
                                        <>
                                            <View style={styles.modalDivider} />
                                            <Text style={styles.modalSectionTitle}>Seller Stats</Text>
                                            <View style={styles.modalRow}>
                                                <Text style={styles.modalLabel}>Products:</Text>
                                                <Text style={styles.modalValue}>{selectedUser.product_count || 0}</Text>
                                            </View>
                                            <View style={styles.modalRow}>
                                                <Text style={styles.modalLabel}>Orders:</Text>
                                                <Text style={styles.modalValue}>{selectedUser.order_count || 0}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowViewModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                visible={showEditModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowEditModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.editModalContent}
                    >
                        <View style={styles.editModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit User</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.editForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.name}
                                            onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                                            placeholder="Full name"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Email *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.email}
                                            onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                                            placeholder="email@example.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.phone}
                                            onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                                            placeholder="+8801234567890"
                                            keyboardType="phone-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Role</Text>
                                        <View style={styles.roleSelector}>
                                            {['Buyer', 'Seller'].map((role) => (
                                                <TouchableOpacity
                                                    key={role}
                                                    style={[
                                                        styles.roleChip,
                                                        editForm.role === role && styles.roleChipActive
                                                    ]}
                                                    onPress={() => setEditForm({ ...editForm, role: role as 'Buyer' | 'Seller' })}
                                                >
                                                    <Text style={[
                                                        styles.roleChipText,
                                                        editForm.role === role && styles.roleChipTextActive
                                                    ]}>
                                                        {role}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.editModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editModalCancel]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={styles.editModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editModalSave]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={styles.editModalSaveText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
    countBadge: {
        backgroundColor: '#DC3545',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8,
        alignItems: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#333',
        paddingVertical: 4,
    },
    filterContainer: {
        position: 'relative',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 4,
    },
    filterButtonText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    filterDropdown: {
        position: 'absolute',
        top: 44,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        minWidth: 150,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    filterDropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterDropdownItemActive: {
        backgroundColor: '#e8f5e9',
    },
    filterDropdownText: {
        fontSize: 14,
        color: '#333',
    },
    filterDropdownTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
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
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    userCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    userInfo: {
        marginBottom: 10,
    },
    userHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    userMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    userMetaText: {
        fontSize: 11,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 12,
        color: '#3498DB',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    editButtonText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    deleteButtonText: {
        fontSize: 12,
        color: '#FF6B6B',
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
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 4,
        flexWrap: 'wrap',
    },
    pageButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        minWidth: 36,
        alignItems: 'center',
    },
    pageButtonActive: {
        backgroundColor: '#DC3545',
    },
    pageButtonDisabled: {
        opacity: 0.5,
    },
    pageButtonText: {
        fontSize: 14,
        color: '#333',
    },
    pageButtonTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    pageSeparator: {
        paddingHorizontal: 4,
        color: '#999',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackground: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalBody: {
        padding: 20,
    },
    modalAvatar: {
        alignItems: 'center',
        marginBottom: 16,
    },
    modalAvatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalRoleBadge: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 12,
    },
    modalRoleBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalRow: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        width: 80,
        fontWeight: '500',
    },
    modalValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 10,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    modalCloseButton: {
        backgroundColor: '#DC3545',
        marginHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Edit Modal
    editModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    editModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
        maxHeight: '80%',
    },
    editForm: {
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    roleSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    roleChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleChipActive: {
        backgroundColor: '#e8f5e9',
        borderColor: '#4CAF50',
    },
    roleChipText: {
        fontSize: 14,
        color: '#666',
    },
    roleChipTextActive: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    editModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    editModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    editModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    editModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    editModalSave: {
        backgroundColor: '#DC3545',
    },
    editModalSaveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_User_Management;