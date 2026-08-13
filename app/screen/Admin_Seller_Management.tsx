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

interface Seller {
    userID: number;
    name: string;
    email: string;
    phone: string;
    business_name: string;
    approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
    total_products: number;
    total_orders: number;
    created_at: string;
}

interface SellerDetails extends Seller {
    business_address: string;
    business_phone: string;
    business_email: string;
    tax_id: string;
    bank_account: string;
    approved_products: number;
    pending_products: number;
    rejected_products: number;
    rejected_reason?: string;
    approved_at?: string;
}

const Admin_Seller_Management = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSellers, setTotalSellers] = useState(0);
    const limit = 15;

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        suspended: 0
    });

    // Modals
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<SellerDetails | null>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'restore' | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [editForm, setEditForm] = useState({
        business_name: '',
        business_address: '',
        business_phone: '',
        business_email: '',
        phone: ''
    });
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSellers();
        }
    }, [isAuthenticated, page, statusFilter]);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const response = await apiService.getSellersForAdmin(page, limit, searchQuery, statusFilter);
            if (response && response.success) {
                setSellers(response.data || []);
                setTotalPages(response.pagination?.totalPages || 1);
                setTotalSellers(response.pagination?.total || 0);
            } else {
                setSellers([]);
            }
        } catch (error) {
            console.error('Error fetching sellers:', error);
            Alert.alert('Error', 'Failed to load sellers');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            // Get counts for each status
            const statuses = ['pending', 'approved', 'rejected', 'suspended'];
            const counts: any = { total: 0 };
            for (const status of statuses) {
                const response = await apiService.getSellersForAdmin(1, 1, '', status);
                if (response && response.success) {
                    counts[status] = response.pagination?.total || 0;
                    counts.total += counts[status];
                }
            }
            setStats({
                total: counts.total,
                pending: counts.pending || 0,
                approved: counts.approved || 0,
                rejected: counts.rejected || 0,
                suspended: counts.suspended || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchSellers(), fetchStats()]);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleSearch = () => {
        setPage(1);
        fetchSellers();
    };

    const handleViewSeller = async (userID: number) => {
        try {
            const response = await apiService.getSellerDetailsForAdmin(userID);
            if (response && response.success) {
                setSelectedSeller(response.data);
                setShowViewModal(true);
            } else {
                Alert.alert('Error', 'Failed to load seller details');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load seller details');
        }
    };

    const handleAction = (seller: Seller, action: 'approve' | 'reject' | 'suspend' | 'restore') => {
        setSelectedSeller(seller as SellerDetails);
        setActionType(action);
        setActionReason('');
        if (action === 'approve' || action === 'restore') {
            // No reason needed for approve/restore
            confirmAction();
        } else {
            setShowActionModal(true);
        }
    };

    const confirmAction = async () => {
        if (!selectedSeller || !actionType) return;

        const actionNames = {
            approve: 'approve',
            reject: 'reject',
            suspend: 'suspend',
            restore: 'restore'
        };

        const confirmMessages = {
            approve: `Approve "${selectedSeller.business_name}" as a seller?`,
            reject: `Reject "${selectedSeller.business_name}"?`,
            suspend: `Suspend "${selectedSeller.business_name}"?`,
            restore: `Restore "${selectedSeller.business_name}"?`
        };

        Alert.alert(
            'Confirm Action',
            confirmMessages[actionType],
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionType.charAt(0).toUpperCase() + actionType.slice(1),
                    onPress: async () => {
                        try {
                            setProcessingId(selectedSeller.userID);
                            const payload: any = {
                                userID: selectedSeller.userID,
                                action: actionType
                            };
                            if (actionType === 'reject' || actionType === 'suspend') {
                                payload.reason = actionReason;
                            }
                            await apiService.adminSellerAction(payload);
                            Alert.alert('Success', `Seller ${actionType}d successfully`);
                            setShowActionModal(false);
                            await Promise.all([fetchSellers(), fetchStats()]);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || `Failed to ${actionType} seller`);
                        } finally {
                            setProcessingId(null);
                            setSelectedSeller(null);
                            setActionType(null);
                        }
                    }
                }
            ]
        );
    };

    const handleEditSeller = (seller: Seller) => {
        setSelectedSeller(seller as SellerDetails);
        setEditForm({
            business_name: seller.business_name || '',
            business_address: (seller as SellerDetails).business_address || '',
            business_phone: (seller as SellerDetails).business_phone || '',
            business_email: (seller as SellerDetails).business_email || '',
            phone: seller.phone || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedSeller) return;
        
        if (!editForm.business_name.trim()) {
            Alert.alert('Error', 'Business name is required');
            return;
        }

        try {
            await apiService.adminUpdateSeller(selectedSeller.userID, {
                business_name: editForm.business_name.trim(),
                business_address: editForm.business_address.trim(),
                business_phone: editForm.business_phone.trim(),
                business_email: editForm.business_email.trim(),
                phone: editForm.phone.trim()
            });
            Alert.alert('Success', 'Seller updated successfully');
            setShowEditModal(false);
            await Promise.all([fetchSellers(), fetchStats()]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update seller');
        }
    };

    const handleDeleteSeller = (seller: Seller) => {
        Alert.alert(
            'Delete Seller',
            `Are you sure you want to delete "${seller.business_name}"?\n\n⚠️ This will also remove all products and orders associated with this seller.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessingId(seller.userID);
                            await apiService.adminDeleteSeller(seller.userID);
                            Alert.alert('Success', 'Seller deleted successfully');
                            await Promise.all([fetchSellers(), fetchStats()]);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete seller');
                        } finally {
                            setProcessingId(null);
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

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Active', color: '#4CAF50', icon: 'checkmark-circle' };
            case 'pending':
                return { label: 'Pending', color: '#FF9F43', icon: 'time-outline' };
            case 'rejected':
                return { label: 'Rejected', color: '#FF6B6B', icon: 'close-circle' };
            case 'suspended':
                return { label: 'Suspended', color: '#6C5CE7', icon: 'ban-outline' };
            default:
                return { label: 'Unknown', color: '#999', icon: 'alert-circle' };
        }
    };

    const renderStatsCard = () => (
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#FF9F43' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={[styles.statNumber, { color: '#6C5CE7' }]}>{stats.suspended}</Text>
                <Text style={styles.statLabel}>Suspended</Text>
            </View>
        </View>
    );

    const renderSellerCard = ({ item }: { item: Seller }) => {
        const statusConfig = getStatusConfig(item.approval_status);
        const isProcessing = processingId === item.userID;

        return (
            <View style={[styles.sellerCard, { borderLeftColor: statusConfig.color, borderLeftWidth: 4 }]}>
                <View style={styles.sellerInfo}>
                    <View style={styles.sellerHeader}>
                        <View style={styles.nameContainer}>
                            <Ionicons name="storefront-outline" size={18} color="#4CAF50" />
                            <Text style={styles.sellerName}>{item.business_name}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
                            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.sellerEmail}>{item.email}</Text>
                    <View style={styles.sellerMeta}>
                        <Text style={styles.sellerMetaText}>👤 {item.name}</Text>
                        <Text style={styles.sellerMetaText}>📦 {item.total_products || 0} products</Text>
                        <Text style={styles.sellerMetaText}>📋 {item.total_orders || 0} orders</Text>
                        <Text style={styles.sellerMetaText}>📅 {formatDate(item.created_at)}</Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewSeller(item.userID)}
                    >
                        <Ionicons name="eye-outline" size={16} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => handleEditSeller(item)}
                    >
                        <Ionicons name="create-outline" size={16} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    {item.approval_status === 'pending' && (
                        <>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.approveButton]}
                                onPress={() => handleAction(item, 'approve')}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                        <Text style={styles.actionButtonText}>Approve</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => handleAction(item, 'reject')}
                                disabled={isProcessing}
                            >
                                <Ionicons name="close" size={16} color="#fff" />
                                <Text style={styles.actionButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {item.approval_status === 'suspended' && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.restoreButton]}
                            onPress={() => handleAction(item, 'restore')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="refresh-outline" size={16} color="#fff" />
                                    <Text style={styles.actionButtonText}>Restore</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {item.approval_status === 'approved' && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.suspendButton]}
                            onPress={() => handleAction(item, 'suspend')}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="ban-outline" size={16} color="#fff" />
                                    <Text style={styles.actionButtonText}>Suspend</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteSeller(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
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
                <Text style={styles.storeTitle}>Seller Management</Text>
                <Text style={styles.countBadge}>{totalSellers}</Text>
            </View>

            {/* Stats */}
            {renderStatsCard()}

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search sellers..."
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
                            {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                        </Text>
                        <Ionicons name={showFilterDropdown ? "chevron-up" : "chevron-down"} size={16} color="#555" />
                    </TouchableOpacity>

                    {showFilterDropdown && (
                        <View style={styles.filterDropdown}>
                            {['all', 'pending', 'approved', 'rejected', 'suspended'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.filterDropdownItem,
                                        statusFilter === status && styles.filterDropdownItemActive
                                    ]}
                                    onPress={() => {
                                        setStatusFilter(status);
                                        setShowFilterDropdown(false);
                                        setPage(1);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterDropdownText,
                                        statusFilter === status && styles.filterDropdownTextActive
                                    ]}>
                                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Text>
                                    {statusFilter === status && (
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
                    <Text style={styles.loadingText}>Loading sellers...</Text>
                </View>
            ) : sellers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="storefront-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Sellers Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No sellers match your search.' 
                            : 'No sellers registered yet.'}
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={sellers}
                        renderItem={renderSellerCard}
                        keyExtractor={(item) => item.userID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                    {renderPagination()}
                </>
            )}

            {/* View Modal */}
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
                            <Text style={styles.modalTitle}>Seller Details</Text>
                            <TouchableOpacity onPress={() => setShowViewModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedSeller && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalAvatar}>
                                        <View style={[styles.modalAvatarCircle, { backgroundColor: getStatusConfig(selectedSeller.approval_status).color }]}>
                                            <Text style={styles.modalAvatarText}>
                                                {selectedSeller.business_name?.substring(0, 2).toUpperCase() || '??'}
                                            </Text>
                                        </View>
                                        <Text style={styles.modalBusinessName}>{selectedSeller.business_name}</Text>
                                        <View style={[styles.modalStatusBadge, { backgroundColor: getStatusConfig(selectedSeller.approval_status).color + '20' }]}>
                                            <Ionicons name={getStatusConfig(selectedSeller.approval_status).icon as any} size={14} color={getStatusConfig(selectedSeller.approval_status).color} />
                                            <Text style={[styles.modalStatusText, { color: getStatusConfig(selectedSeller.approval_status).color }]}>
                                                {getStatusConfig(selectedSeller.approval_status).label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Owner:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.name}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Email:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.email}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Phone:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.business_phone || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Address:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.business_address || 'N/A'}</Text>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Business Details</Text>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Business Email:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.business_email || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Tax ID:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.tax_id || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Bank Account:</Text>
                                        <Text style={styles.modalValue}>{selectedSeller.bank_account || 'N/A'}</Text>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Store Statistics</Text>
                                    <View style={styles.modalStatsRow}>
                                        <View style={styles.modalStatItem}>
                                            <Text style={styles.modalStatNumber}>{selectedSeller.approved_products || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Approved</Text>
                                        </View>
                                        <View style={styles.modalStatItem}>
                                            <Text style={styles.modalStatNumber}>{selectedSeller.pending_products || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Pending</Text>
                                        </View>
                                        <View style={styles.modalStatItem}>
                                            <Text style={styles.modalStatNumber}>{selectedSeller.rejected_products || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Rejected</Text>
                                        </View>
                                    </View>
                                    <View style={styles.modalStatsRow}>
                                        <View style={styles.modalStatItem}>
                                            <Text style={styles.modalStatNumber}>{selectedSeller.total_orders || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Orders</Text>
                                        </View>
                                    </View>

                                    {selectedSeller.rejected_reason && (
                                        <>
                                            <View style={styles.modalDivider} />
                                            <Text style={styles.modalSectionTitle}>Rejection Reason</Text>
                                            <Text style={styles.modalDescription}>{selectedSeller.rejected_reason}</Text>
                                        </>
                                    )}

                                    <View style={styles.modalDivider} />
                                    <Text style={styles.modalSectionTitle}>Joined</Text>
                                    <Text style={styles.modalDate}>{formatDate(selectedSeller.created_at)}</Text>
                                    {selectedSeller.approved_at && (
                                        <Text style={styles.modalDate}>Approved: {formatDate(selectedSeller.approved_at)}</Text>
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

            {/* Edit Modal */}
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
                                <Text style={styles.modalTitle}>Edit Seller</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.editForm}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Business Name *</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.business_name}
                                            onChangeText={(text) => setEditForm({ ...editForm, business_name: text })}
                                            placeholder="Business name"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Business Address</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            value={editForm.business_address}
                                            onChangeText={(text) => setEditForm({ ...editForm, business_address: text })}
                                            placeholder="Business address"
                                            multiline
                                            numberOfLines={2}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Business Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.business_phone}
                                            onChangeText={(text) => setEditForm({ ...editForm, business_phone: text })}
                                            placeholder="Business phone"
                                            keyboardType="phone-pad"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Business Email</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.business_email}
                                            onChangeText={(text) => setEditForm({ ...editForm, business_email: text })}
                                            placeholder="Business email"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Owner Phone</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={editForm.phone}
                                            onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                                            placeholder="Owner phone"
                                            keyboardType="phone-pad"
                                        />
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

            {/* Action Modal (Reject/Suspend Reason) */}
            <Modal
                visible={showActionModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowActionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowActionModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.actionModalContent}
                    >
                        <View style={styles.actionModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {actionType === 'reject' ? 'Reject Seller' : 'Suspend Seller'}
                                </Text>
                                <TouchableOpacity onPress={() => setShowActionModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.actionModalSubtitle}>
                                Please provide a reason for {actionType === 'reject' ? 'rejecting' : 'suspending'} "{selectedSeller?.business_name}":
                            </Text>

                            <TextInput
                                style={styles.actionInput}
                                placeholder="Enter reason..."
                                placeholderTextColor="#999"
                                value={actionReason}
                                onChangeText={setActionReason}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.actionModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.actionModalButton, styles.actionModalCancel]}
                                    onPress={() => setShowActionModal(false)}
                                >
                                    <Text style={styles.actionModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionModalButton, styles.actionModalSubmit]}
                                    onPress={confirmAction}
                                >
                                    <Text style={styles.actionModalSubmitText}>
                                        {actionType === 'reject' ? 'Reject' : 'Suspend'}
                                    </Text>
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
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
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
    sellerCard: {
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
    sellerInfo: {
        marginBottom: 10,
    },
    sellerHeader: {
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
    sellerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    sellerEmail: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    sellerMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 2,
    },
    sellerMetaText: {
        fontSize: 11,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        gap: 4,
    },
    viewButton: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    viewButtonText: {
        fontSize: 11,
        color: '#3498DB',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    editButtonText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '500',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF6B6B',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    restoreButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    suspendButton: {
        backgroundColor: '#6C5CE7',
        borderWidth: 1,
        borderColor: '#6C5CE7',
    },
    deleteButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
        paddingHorizontal: 8,
    },
    actionButtonText: {
        fontSize: 11,
        color: '#fff',
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
    // Modals
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
    modalBusinessName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    modalStatusText: {
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
        width: 100,
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
    modalStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 4,
    },
    modalStatItem: {
        alignItems: 'center',
    },
    modalStatNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalStatLabel: {
        fontSize: 12,
        color: '#999',
    },
    modalDescription: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginTop: 4,
    },
    modalDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
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
    textArea: {
        minHeight: 60,
        textAlignVertical: 'top',
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
    // Action Modal
    actionModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    actionModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
    },
    actionModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 12,
    },
    actionInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#f8f9fa',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    actionModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    actionModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    actionModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    actionModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    actionModalSubmit: {
        backgroundColor: '#DC3545',
    },
    actionModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Seller_Management;