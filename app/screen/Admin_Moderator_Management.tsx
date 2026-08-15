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
    FlatList,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface Moderator {
    userID: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    registration_date: string;
    permissions: {
        can_moderate_sellers: number;
        can_moderate_products: number;
        can_approve_new_sellers: number;
        can_approve_new_products: number;
        can_manage_reports: number;
        can_view_analytics: number;
    };
    total_actions: number;
    last_action: string | null;
}

interface Permission {
    key: string;
    label: string;
    description: string;
}

const Admin_Moderator_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [moderators, setModerators] = useState<Moderator[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [permissionFilter, setPermissionFilter] = useState<string>('');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
    const [editDetailsForm, setEditDetailsForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalModerators, setTotalModerators] = useState(0);
    const limit = 15;

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [expandedPermissions, setExpandedPermissions] = useState<{ [key: number]: boolean }>({});


    // Add Moderator Form
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        permissions: {
            can_moderate_sellers: false,
            can_moderate_products: false,
            can_approve_new_sellers: false,
            can_approve_new_products: false,
            can_manage_reports: false,
            can_view_analytics: false
        }
    });

    const handleEditDetails = (moderator: Moderator) => {
        setSelectedModerator(moderator);
        setEditDetailsForm({
            name: moderator.name || '',
            email: moderator.email || '',
            phone: moderator.phone || '',
            password: '',
            confirmPassword: ''
        });
        setShowEditDetailsModal(true);
    };


    const togglePermissions = (userID: number) => {
        setExpandedPermissions(prev => ({
            ...prev,
            [userID]: !prev[userID]
        }));
    };

    // Edit Permissions Form
    const [editPermissions, setEditPermissions] = useState({
        can_moderate_sellers: false,
        can_moderate_products: false,
        can_approve_new_sellers: false,
        can_approve_new_products: false,
        can_manage_reports: false,
        can_view_analytics: false
    });

    const permissionList: Permission[] = [
        { key: 'can_moderate_products', label: 'Moderate Products', description: 'Approve/reject products' },
        { key: 'can_moderate_sellers', label: 'Moderate Sellers', description: 'Suspend/restore sellers' },
        { key: 'can_approve_new_products', label: 'Approve New Products', description: 'Approve product listings' },
        { key: 'can_approve_new_sellers', label: 'Approve New Sellers', description: 'Approve seller applications' },
        { key: 'can_manage_reports', label: 'View Moderation History', description: 'View all moderation logs' },
        { key: 'can_view_analytics', label: 'Generate Report', description: 'View analytics and reports' },
    ];

    useEffect(() => {
        if (isAuthenticated) {
            fetchModerators();
        }
    }, [isAuthenticated, page, permissionFilter]);

    const fetchModerators = async () => {
        try {
            setLoading(true);
            const response = await apiService.getModeratorsForAdmin(page, limit, searchQuery, permissionFilter);
            if (response && response.success) {
                setModerators(response.data || []);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalModerators(response.pagination?.total || 0);
            } else {
                setModerators([]);
            }
        } catch (error) {
            console.error('Error fetching moderators:', error);
            Alert.alert('Error', 'Failed to load moderators');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchModerators();
        setRefreshing(false);
    };

    const handleSearch = () => {
        setPage(1);
        fetchModerators();
    };

    const handleAddModerator = async () => {
        if (!addForm.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!addForm.email.trim() || !addForm.email.includes('@')) {
            Alert.alert('Error', 'Valid email is required');
            return;
        }
        if (!addForm.password || addForm.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (addForm.password !== addForm.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        try {
            setProcessingId(-1);
            await apiService.addModerator({
                name: addForm.name.trim(),
                email: addForm.email.trim(),
                password: addForm.password,
                permissions: addForm.permissions
            });
            Alert.alert('Success', 'Moderator added successfully');
            setShowAddModal(false);
            resetAddForm();
            await fetchModerators();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add moderator');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveDetails = async () => {
        if (!selectedModerator) return;
        
        if (!editDetailsForm.name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }
        if (!editDetailsForm.email.trim() || !editDetailsForm.email.includes('@')) {
            Alert.alert('Error', 'Valid email is required');
            return;
        }
        if (editDetailsForm.password && editDetailsForm.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (editDetailsForm.password !== editDetailsForm.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        try {
            setProcessingId(selectedModerator.userID);
            await apiService.updateModeratorDetails(selectedModerator.userID, {
                name: editDetailsForm.name.trim(),
                email: editDetailsForm.email.trim(),
                phone: editDetailsForm.phone.trim(),
                password: editDetailsForm.password || undefined
            });
            Alert.alert('Success', 'Moderator details updated successfully');
            setShowEditDetailsModal(false);
            await fetchModerators();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update moderator');
        } finally {
            setProcessingId(null);
            setSelectedModerator(null);
        }
    };


    const handleUpdatePermissions = async () => {
        if (!selectedModerator) return;

        try {
            setProcessingId(selectedModerator.userID);
            await apiService.updateModeratorPermissions(selectedModerator.userID, {
                permissions: editPermissions
            });
            Alert.alert('Success', 'Permissions updated successfully');
            setShowPermissionsModal(false);
            await fetchModerators();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update permissions');
        } finally {
            setProcessingId(null);
            setSelectedModerator(null);
        }
    };

    const handleRemoveModerator = (moderator: Moderator) => {
        Alert.alert(
            'Remove Moderator',
            `Are you sure you want to permanently remove "${moderator.name}" as a moderator?\n\nThis will permanently delete their work account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingId(moderator.userID);
                            await apiService.removeModerator(moderator.userID);
                            Alert.alert('Success', 'Moderator removed successfully');
                            await fetchModerators();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to remove moderator');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };


    const handleViewModerator = async (userID: number) => {
        try {
            const response = await apiService.getModeratorDetails(userID);
            if (response && response.success) {
                setSelectedModerator(response.data);
                setShowViewModal(true);
            } else {
                Alert.alert('Error', 'Failed to load moderator details');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load moderator details');
        }
    };

    const handleEditPermissions = (moderator: Moderator) => {
        setSelectedModerator(moderator);
        setEditPermissions({
            can_moderate_sellers: moderator.permissions.can_moderate_sellers === 1,
            can_moderate_products: moderator.permissions.can_moderate_products === 1,
            can_approve_new_sellers: moderator.permissions.can_approve_new_sellers === 1,
            can_approve_new_products: moderator.permissions.can_approve_new_products === 1,
            can_manage_reports: moderator.permissions.can_manage_reports === 1,
            can_view_analytics: moderator.permissions.can_view_analytics === 1
        });
        setShowPermissionsModal(true);
    };

    const resetAddForm = () => {
        setAddForm({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            permissions: {
                can_moderate_sellers: false,
                can_moderate_products: false,
                can_approve_new_sellers: false,
                can_approve_new_products: false,
                can_manage_reports: false,
                can_view_analytics: false
            }
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getPermissionLabel = (key: string) => {
        const found = permissionList.find(p => p.key === key);
        return found ? found.label : key;
    };

    const renderLED = (value: number) => {
        const isOn = value === 1;
        return (
            <View style={[styles.ledContainer, isOn && styles.ledOn]}>
                <View style={[styles.ledDot, isOn ? styles.ledDotOn : styles.ledDotOff]} />
                <View style={[styles.ledGlow, isOn ? styles.ledGlowOn : styles.ledGlowOff]} />
            </View>
        );
    };

    const renderModeratorCard = ({ item }: { item: Moderator }) => {
        const isProcessing = processingId === item.userID;
        const isExpanded = expandedPermissions[item.userID] || false;
        const entries = Object.entries(item.permissions);
        const visibleEntries = entries.slice(0, 0);
        const hiddenEntries = entries.slice(0);

        return (
            <View style={styles.moderatorCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {item.name.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.moderatorName}>{item.name}</Text>
                            <Text style={styles.moderatorEmail}>{item.email}</Text>
                            <View style={styles.moderatorStats}>
                                <Text style={styles.statsText}>🛡️ {item.total_actions || 0} actions</Text>
                                {item.last_action && (
                                    <Text style={styles.statsText}>📅 Last: {formatTime(item.last_action)}</Text>
                                )}
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardRight}>
                        <Text style={styles.joinedDate}>Joined: {formatDate(item.registration_date)}</Text>
                    </View>
                </View>

                <View style={styles.permissionSection}>
                    {visibleEntries.map(([key, value]) => (
                        <View key={key} style={styles.permissionRow}>
                            <View style={styles.permissionLeft}>
                                {renderLED(value)}
                                <Text style={[styles.permissionText, value === 1 && styles.permissionTextActive]}>
                                    {getPermissionLabel(key)}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {hiddenEntries.length > 0 && (
                        <View style={styles.permissionDropdown}>
                            <TouchableOpacity 
                                style={styles.permissionDropdownHeader}
                                onPress={() => togglePermissions(item.userID)}
                            >
                                <Text style={styles.permissionDropdownText}>
                                    {isExpanded ? '▼ Hide Permissions' : `▶ Show Permissions`}
                                </Text>
                            </TouchableOpacity>

                            {isExpanded && hiddenEntries.map(([key, value]) => (
                                <View key={key} style={[styles.permissionRow, styles.permissionRowDropdown]}>
                                    <View style={styles.permissionLeft}>
                                        {renderLED(value)}
                                        <Text style={[styles.permissionText, value === 1 && styles.permissionTextActive]}>
                                            {getPermissionLabel(key)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewModerator(item.userID)}
                    >
                        <Ionicons name="eye-outline" size={14} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editDetailsButton]}
                        onPress={() => handleEditDetails(item)}
                    >
                        <Ionicons name="person-outline" size={14} color="#FF9800" />
                        <Text style={styles.editDetailsButtonText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditPermissions(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                        ) : (
                            <>
                                <Ionicons name="create-outline" size={14} color="#4CAF50" />
                                <Text style={styles.editButtonText}>Perms</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() => handleRemoveModerator(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <>
                                <Ionicons name="person-remove-outline" size={14} color="#FF6B6B" />
                                <Text style={styles.removeButtonText}>Remove</Text>
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
                pages.push(-1);
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
                        return <Text key={`sep-${index}`} style={styles.pageSeparator}>...</Text>;
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

    // PERMISSION TOGGLE ROW (for modals)
    const renderPermissionToggle = (
        key: keyof typeof editPermissions,
        label: string,
        description: string,
        isEdit: boolean = true
    ) => {
        const value = isEdit ? editPermissions[key] : addForm.permissions[key];
        const setValue = isEdit 
            ? (val: boolean) => setEditPermissions({ ...editPermissions, [key]: val })
            : (val: boolean) => setAddForm({ ...addForm, permissions: { ...addForm.permissions, [key]: val } });

        return (
            <View style={styles.permissionToggleRow}>
                <View style={styles.permissionToggleInfo}>
                    <Text style={styles.permissionToggleLabel}>{label}</Text>
                    <Text style={styles.permissionToggleDesc}>{description}</Text>
                </View>
                <Switch
                    value={value}
                    onValueChange={setValue}
                    trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
                    thumbColor={value ? '#fff' : '#f4f3f4'}
                />
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
                <Text style={styles.storeTitle}>Moderator Management</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                        resetAddForm();
                        setShowAddModal(true);
                    }}
                >
                    <Ionicons name="add" size={28} color="#DC3545" />
                </TouchableOpacity>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search moderators..."
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
                        onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                    >
                        <Ionicons name="options-outline" size={18} color="#555" />
                        <Text style={styles.filterButtonText}>
                            {permissionFilter ? getPermissionLabel(permissionFilter) : 'All'}
                        </Text>
                        <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#555" />
                    </TouchableOpacity>

                    {showFilterDropdown && (
                        <View style={styles.filterDropdown}>
                            <TouchableOpacity
                                style={[
                                    styles.filterDropdownItem,
                                    !permissionFilter && styles.filterDropdownItemActive
                                ]}
                                onPress={() => {
                                    setPermissionFilter('');
                                    setShowFilterDropdown(false);
                                    setPage(1);
                                }}
                            >
                                <Text style={[styles.filterDropdownText, !permissionFilter && styles.filterDropdownTextActive]}>
                                    All
                                </Text>
                                {!permissionFilter && (
                                    <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                )}
                            </TouchableOpacity>
                            {permissionList.map((perm) => (
                                <TouchableOpacity
                                    key={perm.key}
                                    style={[
                                        styles.filterDropdownItem,
                                        permissionFilter === perm.key && styles.filterDropdownItemActive
                                    ]}
                                    onPress={() => {
                                        setPermissionFilter(perm.key);
                                        setShowFilterDropdown(false);
                                        setPage(1);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterDropdownText,
                                        permissionFilter === perm.key && styles.filterDropdownTextActive
                                    ]}>
                                        {perm.label}
                                    </Text>
                                    {permissionFilter === perm.key && (
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
                    <Text style={styles.loadingText}>Loading moderators...</Text>
                </View>
            ) : moderators.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="shield-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Moderators Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No moderators match your search.' 
                            : 'No moderators have been added yet.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={moderators}
                        renderItem={renderModeratorCard}
                        keyExtractor={(item) => item.userID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
            )}

            {/* View Moderator Modal */}
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
                    <View style={styles.viewModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Moderator Details</Text>
                            <TouchableOpacity onPress={() => setShowViewModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.viewModalScrollContent}
                        >
                            {selectedModerator ? (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalAvatar}>
                                        <View style={[styles.modalAvatarCircle, { backgroundColor: '#6C5CE7' }]}>
                                            <Text style={styles.modalAvatarText}>
                                                {selectedModerator.name ? selectedModerator.name.substring(0, 2).toUpperCase() : '??'}
                                            </Text>
                                        </View>
                                        <Text style={styles.modalName}>{selectedModerator.name || 'N/A'}</Text>
                                        <Text style={styles.modalEmail}>{selectedModerator.email || 'N/A'}</Text>
                                        <Text style={styles.modalPhone}>{selectedModerator.phone || 'No phone number'}</Text>
                                        <View style={styles.modalStats}>
                                            <View style={styles.modalStatItem}>
                                                <Text style={styles.modalStatNumber}>{selectedModerator.total_actions || 0}</Text>
                                                <Text style={styles.modalStatLabel}>Actions</Text>
                                            </View>
                                            <View style={styles.modalStatItem}>
                                                <Text style={styles.modalStatNumber}>
                                                    {selectedModerator.last_action ? formatDate(selectedModerator.last_action) : 'N/A'}
                                                </Text>
                                                <Text style={styles.modalStatLabel}>Last Action</Text>
                                            </View>
                                            <View style={styles.modalStatItem}>
                                                <Text style={styles.modalStatNumber}>{selectedModerator.registration_date ? formatDate(selectedModerator.registration_date) : 'N/A'}</Text>
                                                <Text style={styles.modalStatLabel}>Joined</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Permissions</Text>
                                    {selectedModerator.permissions ? (
                                        permissionList.map((perm) => {
                                            const value = selectedModerator.permissions?.[perm.key as keyof typeof selectedModerator.permissions];
                                            return (
                                                <View key={perm.key} style={styles.modalPermissionRow}>
                                                    <View style={styles.modalPermissionInfo}>
                                                        <Text style={styles.modalPermissionLabel}>{perm.label}</Text>
                                                        <Text style={styles.modalPermissionDesc}>{perm.description}</Text>
                                                    </View>
                                                    {renderLED(value !== undefined ? value : 0)}
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <Text style={styles.modalNoPermissions}>No permissions data available</Text>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color="#6C5CE7" />
                                    <Text style={styles.modalLoadingText}>Loading details...</Text>
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


            {/* Add Moderator Modal */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowAddModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.addModalContent}
                    >
                        <View style={styles.addModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Moderator</Text>
                                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.addForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Full Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={addForm.name}
                                            onChangeText={(text) => setAddForm({ ...addForm, name: text })}
                                            placeholder="Enter full name"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Email *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={addForm.email}
                                            onChangeText={(text) => setAddForm({ ...addForm, email: text })}
                                            placeholder="Enter email address"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Password *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={addForm.password}
                                            onChangeText={(text) => setAddForm({ ...addForm, password: text })}
                                            placeholder="Min 6 characters"
                                            secureTextEntry
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={addForm.confirmPassword}
                                            onChangeText={(text) => setAddForm({ ...addForm, confirmPassword: text })}
                                            placeholder="Confirm password"
                                            secureTextEntry
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    <Text style={styles.sectionLabel}>Permissions</Text>
                                    <Text style={styles.sectionSubtext}>Grant permissions to the moderator</Text>

                                    {permissionList.map((perm) => {
                                        const key = perm.key as keyof typeof addForm.permissions;
                                        return (
                                            <View key={perm.key} style={styles.permissionToggleRow}>
                                                <View style={styles.permissionToggleInfo}>
                                                    <Text style={styles.permissionToggleLabel}>{perm.label}</Text>
                                                    <Text style={styles.permissionToggleDesc}>{perm.description}</Text>
                                                </View>
                                                <Switch
                                                    value={addForm.permissions[key]}
                                                    onValueChange={(val) => setAddForm({
                                                        ...addForm,
                                                        permissions: { ...addForm.permissions, [key]: val }
                                                    })}
                                                    trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
                                                    thumbColor={addForm.permissions[key] ? '#fff' : '#f4f3f4'}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            <View style={styles.addModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.addModalButton, styles.addModalCancel]}
                                    onPress={() => setShowAddModal(false)}
                                >
                                    <Text style={styles.addModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.addModalButton, styles.addModalSubmit]}
                                    onPress={handleAddModerator}
                                    disabled={processingId === -1}
                                >
                                    {processingId === -1 ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.addModalSubmitText}>Add Moderator</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Edit Details Modal */}
            <Modal
                visible={showEditDetailsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEditDetailsModal(false)}
            >
                <View style={styles.addModalOverlay}>
                    <TouchableOpacity 
                        style={styles.addModalBackground}
                        onPress={() => setShowEditDetailsModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.editDetailsModalContainer}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                    >
                        <View style={styles.editDetailsModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Moderator Details</Text>
                                <TouchableOpacity onPress={() => setShowEditDetailsModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ flexGrow: 1 }}
                                keyboardShouldPersistTaps="handled"
                            >
                                <View style={styles.editDetailsForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Full Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editDetailsForm.name}
                                            onChangeText={(text) => setEditDetailsForm({ ...editDetailsForm, name: text })}
                                            placeholder="Enter full name"
                                            returnKeyType="next"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Email *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editDetailsForm.email}
                                            onChangeText={(text) => setEditDetailsForm({ ...editDetailsForm, email: text })}
                                            placeholder="Enter email address"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            returnKeyType="next"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editDetailsForm.phone}
                                            onChangeText={(text) => setEditDetailsForm({ ...editDetailsForm, phone: text })}
                                            placeholder="Enter phone number"
                                            keyboardType="phone-pad"
                                            returnKeyType="next"
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    <Text style={styles.sectionSubtext}>Leave password fields empty to keep current password</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>New Password</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editDetailsForm.password}
                                            onChangeText={(text) => setEditDetailsForm({ ...editDetailsForm, password: text })}
                                            placeholder="Enter new password (optional)"
                                            secureTextEntry
                                            returnKeyType="next"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm New Password</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editDetailsForm.confirmPassword}
                                            onChangeText={(text) => setEditDetailsForm({ ...editDetailsForm, confirmPassword: text })}
                                            placeholder="Confirm new password"
                                            secureTextEntry
                                            returnKeyType="done"
                                        />
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.editDetailsFooter}>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editDetailsCancel]}
                                    onPress={() => setShowEditDetailsModal(false)}
                                >
                                    <Text style={styles.editDetailsCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.editModalButton, styles.editDetailsSave]}
                                    onPress={handleSaveDetails}
                                    disabled={processingId === selectedModerator?.userID}
                                >
                                    {processingId === selectedModerator?.userID ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.editDetailsSaveText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Edit Permissions Modal */}
            <Modal
                visible={showPermissionsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPermissionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowPermissionsModal(false)}
                    />
                    <View style={styles.permissionsModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Permissions</Text>
                            <TouchableOpacity onPress={() => setShowPermissionsModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.permissionsForm}>
                                {selectedModerator && (
                                    <View style={styles.permissionsUserInfo}>
                                        <Text style={styles.permissionsUserName}>{selectedModerator.name}</Text>
                                        <Text style={styles.permissionsUserEmail}>{selectedModerator.email}</Text>
                                    </View>
                                )}

                                <View style={styles.divider} />

                                {permissionList.map((perm) => {
                                    const key = perm.key as keyof typeof editPermissions;
                                    return (
                                        <View key={perm.key} style={styles.permissionToggleRow}>
                                            <View style={styles.permissionToggleInfo}>
                                                <Text style={styles.permissionToggleLabel}>{perm.label}</Text>
                                                <Text style={styles.permissionToggleDesc}>{perm.description}</Text>
                                            </View>
                                            <Switch
                                                value={editPermissions[key]}
                                                onValueChange={(val) => setEditPermissions({ ...editPermissions, [key]: val })}
                                                trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
                                                thumbColor={editPermissions[key] ? '#fff' : '#f4f3f4'}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        <View style={styles.permissionsModalFooter}>
                            <TouchableOpacity 
                                style={[styles.permissionsModalButton, styles.permissionsModalCancel]}
                                onPress={() => setShowPermissionsModal(false)}
                            >
                                <Text style={styles.permissionsModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.permissionsModalButton, styles.permissionsModalSave]}
                                onPress={handleUpdatePermissions}
                                disabled={processingId === selectedModerator?.userID}
                            >
                                {processingId === selectedModerator?.userID ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.permissionsModalSaveText}>Save Permissions</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
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
    addButton: {
        padding: 4,
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
        minWidth: 180,
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
    
    // MODERATOR CARD STYLES
    moderatorCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardInfo: {
        flex: 1,
    },
    moderatorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    moderatorEmail: {
        fontSize: 13,
        color: '#666',
    },
    moderatorStats: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    statsText: {
        fontSize: 11,
        color: '#999',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    joinedDate: {
        fontSize: 11,
        color: '#999',
    },
    permissionSection: {
        marginBottom: 10,
        gap: 4,
    },
    permissionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 4,
    },
    permissionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    permissionText: {
        fontSize: 12,
        color: '#999',
    },
    permissionTextActive: {
        color: '#333',
        fontWeight: '500',
    },

    // LED STYLES
    ledContainer: {
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    ledOn: {
        opacity: 1,
    },
    ledDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        position: 'absolute',
    },
    ledDotOn: {
        backgroundColor: '#4CAF50',
    },
    ledDotOff: {
        backgroundColor: '#FF6B6B',
    },
    ledGlow: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'transparent',
        position: 'absolute',
    },
    ledGlowOn: {
        backgroundColor: 'rgba(76, 175, 80, 0.25)',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 4,
    },
    ledGlowOff: {
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },

    // ACTION BUTTONS 
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 5,
        gap: 5,
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 10,
        color: '#3498DB',
        fontWeight: '500',
    },
    editDetailsButton: {
        backgroundColor: '#fff3e0',
        borderWidth: 1,
        borderColor: '#FF9800',
    },
    editModalButton:{
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },

    editDetailsButtonText: {
        fontSize: 10,
        color: '#FF9800',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    editButtonText: {
        fontSize: 10,
        color: '#4CAF50',
        fontWeight: '500',
    },
    removeButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    removeButtonText: {
        fontSize: 10,
        color: '#FF6B6B',
        fontWeight: '500',
    },
    actionButtonText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '500',
    },
    // EMPTY STATE

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

    // PAGINATION
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

    // VIEW MODAL - FULL SCREEN
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

    viewModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%', 
        paddingBottom: 20,
    },
    viewModalScrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
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
    modalName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalEmail: {
        fontSize: 14,
        color: '#666',
    },
    modalStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 12,
    },
    modalStatItem: {
        alignItems: 'center',
    },
    modalStatNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalStatLabel: {
        fontSize: 11,
        color: '#999',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 12,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalPermissionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalPermissionInfo: {
        flex: 1,
        marginRight: 10,
    },
    modalPermissionLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    modalPermissionDesc: {
        fontSize: 11,
        color: '#999',
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
    modalNoPermissions: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        padding: 20,
    },
    modalPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    // ADD MODERATOR MODAL
    addModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    addModalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    addModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    addModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%',  // 88% of screen height
        paddingBottom: 20,
    },
    addModalScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexGrow: 1,
    },
    addForm: {
        marginTop: 8,
        paddingBottom: 20,
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
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    divider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 12,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    sectionSubtext: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    permissionToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    permissionToggleInfo: {
        flex: 1,
        marginRight: 10,
    },
    permissionToggleLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    permissionToggleDesc: {
        fontSize: 11,
        color: '#999',
    },
    addModalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    addModalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    addModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    addModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    addModalSubmit: {
        backgroundColor: '#DC3545',
    },
    addModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    addModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
        maxHeight: '90%',
    },
    // ============================================================
    // EDIT PERMISSIONS MODAL
    // ============================================================
    permissionsModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    permissionsForm: {
        padding: 20,
    },
    permissionsUserInfo: {
        alignItems: 'center',
        marginBottom: 12,
    },
    permissionsUserName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    permissionsUserEmail: {
        fontSize: 14,
        color: '#666',
    },
    permissionsModalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    permissionsModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    permissionsModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    permissionsModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    permissionsModalSave: {
        backgroundColor: '#DC3545',
    },
    permissionsModalSaveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    permissionChipsWrapper: {
        flexDirection: 'column',
        gap: 4,
    },
    permissionChipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    permissionChipLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    permissionChipText: {
        fontSize: 12,
        color: '#999',
    },
    permissionChipTextActive: {
        color: '#333',
        fontWeight: '500',
    },
    permissionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    permissionDotOn: {
        backgroundColor: '#4CAF50',
    },
    permissionDotOff: {
        backgroundColor: '#e0e0e0',
    },
    permissionDropdown: {
        marginTop: 2,
    },
    permissionDropdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 2,
    },
    permissionDropdownText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    permissionRowDropdown: {
        paddingLeft: 20,
    },

    // EDIT DETAILS MODAL - FULL HEIGHT
    editDetailsModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    editDetailsModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '88%',
        paddingBottom: 20,
    },
    editDetailsForm: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexGrow: 1,
    },
    editDetailsFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10,
    },
    editDetailsCancel: {
        backgroundColor: '#f0f0f0',
    },
    editDetailsCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    editDetailsSave: {
        backgroundColor: '#DC3545',
    },
    editDetailsSaveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // VIEW MODAL LOADING
    modalLoading: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalLoadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },

});

export default Admin_Moderator_Management;