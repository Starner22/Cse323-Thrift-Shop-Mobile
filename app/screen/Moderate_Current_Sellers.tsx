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
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';
import Moderate_Current_Products from './Moderate_Current_Products';

interface Seller {
    userID: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    role: string;
    business_name: string;
    business_address: string;
    business_phone: string;
    business_email: string;
    tax_id: string;
    bank_account: string;
    approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
    rejected_reason?: string;
    created_at: string;
    updated_at: string;
    product_count: number;
    total_sales: number;
    total_orders?: number;
    total_revenue?: number; 
}

const Moderate_Current_Sellers = ({ navigation }: any) => {
    const { isAuthenticated, user } = useAuth();
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [suspendReason, setSuspendReason] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchSellers();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        filterSellers();
    }, [sellers, activeFilter, searchQuery]);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllSellersForManagement();
            setSellers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching sellers:', error);
            Alert.alert('Error', 'Failed to load sellers');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSellers();
        setRefreshing(false);
    };

    const filterSellers = () => {
        let filtered = [...sellers];
        
        // Apply status filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(s => s.approval_status === activeFilter);
        }
        
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query) ||
                s.business_name.toLowerCase().includes(query)
            );
        }
        
        setFilteredSellers(filtered);
    };

    const handleViewDetails = (seller: Seller) => {
        setSelectedSeller(seller);
        setShowDetailModal(true);
    };

    const handleSuspend = (seller: Seller) => {
        setSelectedSeller(seller);
        setSuspendReason('');
        setShowSuspendModal(true);
    };

    const submitSuspend = async () => {
        if (!selectedSeller) return;
        
        if (!suspendReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for suspension');
            return;
        }

        try {
            setProcessingId(selectedSeller.userID);
            await apiService.suspendSeller(selectedSeller.userID, suspendReason.trim());
            await fetchSellers();
            setShowSuspendModal(false);
            Alert.alert('Success', 'Seller suspended successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to suspend seller');
        } finally {
            setProcessingId(null);
            setSelectedSeller(null);
        }
    };

    const handleRestore = (seller: Seller) => {
        Alert.alert(
            'Restore Seller',
            `Are you sure you want to restore "${seller.business_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        try {
                            setProcessingId(seller.userID);
                            await apiService.restoreSeller(seller.userID);
                            await fetchSellers();
                            Alert.alert('Success', 'Seller restored successfully');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to restore seller');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Approved', color: '#4CAF50', icon: 'checkmark-circle' };
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderSeller = ({ item }: { item: Seller }) => {
        const status = getStatusConfig(item.approval_status);
        const isProcessing = processingId === item.userID;
        const isSuspended = item.approval_status === 'suspended';

        return (
            <View style={[styles.sellerCard, isSuspended && styles.suspendedCard]}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => handleViewDetails(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: isSuspended ? '#6C5CE7' : '#4CAF50' }]}>
                            <Text style={styles.avatarText}>
                                {item.business_name ? item.business_name.substring(0, 2).toUpperCase() : '??'}
                            </Text>
                        </View>
                        {isSuspended && (
                            <View style={styles.suspendedBadge}>
                                <Ionicons name="ban" size={12} color="#fff" />
                            </View>
                        )}
                    </View>

                    <View style={styles.sellerInfo}>
                        <Text style={styles.businessName} numberOfLines={1}>
                            {item.business_name || 'Unnamed Business'}
                        </Text>
                        <Text style={styles.sellerName}>{item.name || 'Unknown Seller'}</Text>
                        <View style={styles.sellerMeta}>
                            <Ionicons name="mail-outline" size={14} color="#999" />
                            <Text style={styles.sellerMetaText}>{item.email || 'No email'}</Text>
                        </View>
                        <View style={styles.sellerStats}>
                            <Text style={styles.statText}>📦 {item.product_count || 0} products</Text>
                            <Text style={styles.statText}>📋 {item.total_orders || 0} orders</Text>
                            <Text style={[styles.statText, styles.revenueText]}>
                                💰 ${item.total_revenue?.toFixed(2) || '0.00'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <View style={styles.statusBadge}>
                        <Ionicons name={status.icon as any} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>
                            {status.label}
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.viewButton]}
                        onPress={() => handleViewDetails(item)}
                    >
                        <Ionicons name="eye-outline" size={18} color="#3498DB" />
                        <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>

                    {item.approval_status === 'suspended' ? (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.restoreButton]}
                            onPress={() => handleRestore(item)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Restore</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.suspendButton]}
                            onPress={() => handleSuspend(item)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="ban-outline" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>Suspend</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };


    if (!isAuthenticated || (user?.role !== 'Moderator' && user?.role !== 'Admin')) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="lock-closed-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Access Denied</Text>
                    <Text style={styles.authRequiredSubtext}>
                        You need moderator privileges to view this page.
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
                <Text style={styles.countBadge}>{filteredSellers.length}</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search sellers..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'approved', label: 'Approved' },
                    { key: 'rejected', label: 'Rejected' },
                    { key: 'suspended', label: 'Suspended' },
                ].map((filter) => {
                    const isActive = activeFilter === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setActiveFilter(filter.key)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading sellers...</Text>
                </View>
            ) : filteredSellers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Sellers Found</Text>
                    <Text style={styles.emptySubtext}>
                        {searchQuery.trim() 
                            ? 'No sellers match your search.' 
                            : activeFilter === 'all' 
                                ? 'No sellers registered yet.' 
                                : `No ${activeFilter} sellers.`}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {filteredSellers.map((item) => (
                        <View key={item.userID}>
                            {renderSeller({ item })}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowDetailModal(false)}
                    />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Seller Details</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedSeller && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalAvatarContainer}>
                                        <View style={[styles.modalAvatar, { backgroundColor: '#4CAF50' }]}>
                                            <Text style={styles.modalAvatarText}>
                                                {selectedSeller.business_name ? selectedSeller.business_name.substring(0, 2).toUpperCase() : '??'}
                                            </Text>
                                        </View>
                                        <Text style={styles.modalBusinessName}>{selectedSeller.business_name}</Text>
                                        <Text style={styles.modalOwnerName}>{selectedSeller.name}</Text>
                                        <View style={styles.modalStatusContainer}>
                                            <Ionicons 
                                                name={getStatusConfig(selectedSeller.approval_status).icon as any} 
                                                size={16} 
                                                color={getStatusConfig(selectedSeller.approval_status).color} 
                                            />
                                            <Text style={[
                                                styles.modalStatusText,
                                                { color: getStatusConfig(selectedSeller.approval_status).color }
                                            ]}>
                                                {getStatusConfig(selectedSeller.approval_status).label}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Contact Information</Text>
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
                                            <Text style={styles.modalStatNumber}>{selectedSeller.product_count || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Products</Text>
                                        </View>
                                        <View style={styles.modalStatItem}>
                                            <Text style={styles.modalStatNumber}>${selectedSeller.total_revenue || 0}</Text>
                                            <Text style={styles.modalStatLabel}>Total Sales</Text>
                                        </View>
                                    </View>

                                    {selectedSeller.rejected_reason && (
                                        <>
                                            <View style={styles.modalDivider} />
                                            <Text style={styles.modalSectionTitle}>Rejection Reason</Text>
                                            <Text style={styles.modalDescription}>
                                                {selectedSeller.rejected_reason}
                                            </Text>
                                        </>
                                    )}

                                    <View style={styles.modalDivider} />

                                    <Text style={styles.modalSectionTitle}>Joined</Text>
                                    <Text style={styles.modalDate}>{formatDate(selectedSeller.created_at)}</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {selectedSeller?.approval_status === 'suspended' ? (
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalRestoreButton]}
                                    onPress={() => {
                                        if (selectedSeller) {
                                            setShowDetailModal(false);
                                            handleRestore(selectedSeller);
                                        }
                                    }}
                                >
                                    <Ionicons name="refresh-outline" size={20} color="#fff" />
                                    <Text style={styles.modalButtonText}>Restore</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.modalButton, styles.modalSuspendButton]}
                                    onPress={() => {
                                        if (selectedSeller) {
                                            setShowDetailModal(false);
                                            handleSuspend(selectedSeller);
                                        }
                                    }}
                                >
                                    <Ionicons name="ban-outline" size={20} color="#fff" />
                                    <Text style={styles.modalButtonText}>Suspend</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalCloseButton]}
                                onPress={() => setShowDetailModal(false)}
                            >
                                <Text style={styles.modalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Suspend Modal */}
            <Modal
                visible={showSuspendModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSuspendModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowSuspendModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.rejectModalContent}
                    >
                        <View style={styles.rejectModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Suspend Seller</Text>
                                <TouchableOpacity onPress={() => setShowSuspendModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.rejectModalSubtitle}>
                                Please provide a reason for suspending "{selectedSeller?.business_name}":
                            </Text>

                            <TextInput
                                style={styles.rejectInput}
                                placeholder="Enter suspension reason..."
                                placeholderTextColor="#999"
                                value={suspendReason}
                                onChangeText={setSuspendReason}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.rejectModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalCancel]}
                                    onPress={() => setShowSuspendModal(false)}
                                >
                                    <Text style={styles.rejectModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalSubmit]}
                                    onPress={submitSuspend}
                                >
                                    <Text style={styles.rejectModalSubmitText}>Suspend</Text>
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
        backgroundColor: '#6C5CE7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchBar: {
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 6,
    },
    filterTab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: '#6C5CE7',
        borderColor: '#6C5CE7',
    },
    filterText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
    },
    sellerCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    suspendedCard: {
        borderColor: '#6C5CE7',
        borderWidth: 2,
    },
    cardContent: {
        flexDirection: 'row',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    suspendedBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#6C5CE7',
        borderRadius: 10,
        padding: 2,
    },
    sellerInfo: {
        flex: 1,
    },
    businessName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    sellerName: {
        fontSize: 13,
        color: '#666',
        marginTop: 1,
    },
    sellerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    sellerMetaText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 4,
    },
    sellerStats: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 12,
    },
    statText: {
        fontSize: 11,
        color: '#888',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
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
    suspendButton: {
        backgroundColor: '#6C5CE7',
        borderWidth: 1,
        borderColor: '#6C5CE7',
    },
    restoreButton: {
        backgroundColor: '#4CAF50',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    actionButtonText: {
        fontSize: 12,
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
    // Detail Modal
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
        maxHeight: '90%',
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
    modalAvatarContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    modalBusinessName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    modalOwnerName: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginTop: 2,
    },
    modalStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        gap: 4,
    },
    modalStatusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 14,
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        width: 110,
    },
    modalValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    modalStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
    },
    modalStatItem: {
        alignItems: 'center',
    },
    modalStatNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    modalStatLabel: {
        fontSize: 12,
        color: '#999',
    },
    modalDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    modalDescription: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    modalSuspendButton: {
        backgroundColor: '#6C5CE7',
    },
    modalRestoreButton: {
        backgroundColor: '#4CAF50',
    },
    modalCloseButton: {
        backgroundColor: '#f0f0f0',
        flex: 0.5,
    },
    modalCloseText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '500',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    // Suspend Modal
    rejectModalContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    rejectModalInner: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 34,
    },
    rejectModalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        marginBottom: 12,
    },
    rejectInput: {
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
    rejectModalFooter: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 8,
    },
    rejectModalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    rejectModalCancel: {
        backgroundColor: '#f0f0f0',
    },
    rejectModalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    rejectModalSubmit: {
        backgroundColor: '#6C5CE7',
    },
    rejectModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    revenueText: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
});

export default Moderate_Current_Sellers;