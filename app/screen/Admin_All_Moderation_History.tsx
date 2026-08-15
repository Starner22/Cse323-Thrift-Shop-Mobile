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
    FlatList,
    Modal,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface HistoryEntry {
    historyID: number;
    action: string;
    action_category: string;
    details: string | null;
    ip_address: string | null;
    created_at: string;
    moderatorID?: number;
    moderator_name?: string;
    moderator_role?: string;
    moderator?: {
        userID: number;
        name: string;
        role: string;
    };
    targetUserID?: number;
    target_user_name?: string;
    target_user_role?: string;
    target_user?: {
        userID: number;
        name: string;
        role: string;
    } | null;
    targetProductID?: number;
    target_product_name?: string;
    target_product?: {
        productID: number;
        name: string;
    } | null;
}

// ============================================================
// HELPER: Format details for display
// ============================================================
const formatDetails = (details: string | null, action: string): string | null => {
    if (!details) return null;
    
    try {
        const data = JSON.parse(details);
        
        // If there's a summary, use it
        if (data.summary) {
            return data.summary;
        }
        
        // Handle edit actions
        if (action.startsWith('edit_')) {
            if (data.updated_fields) {
                return 'Updated: ' + data.updated_fields.join(', ');
            }
        }
        
        // Handle reject/suspend with reason
        if (['reject_seller', 'reject_product', 'suspend_seller'].includes(action)) {
            if (data.reason) {
                return 'Reason: ' + data.reason;
            }
            // If data is a string (legacy format)
            if (typeof data === 'string') {
                return 'Reason: ' + data;
            }
            // If details is a plain string
            if (typeof details === 'string' && !details.startsWith('{')) {
                return 'Reason: ' + details;
            }
        }
        
        // Handle restore
        if (action === 'restore_seller' || action === 'restore_user') {
            return null; // No details needed for restore
        }
        
        // Handle add_note
        if (action === 'add_note') {
            if (data.note) return 'Note: ' + data.note;
            if (typeof data === 'string') return 'Note: ' + data;
        }
        
        // Handle delete_user
        if (action === 'delete_user') {
            if (data.deleted_user) {
                let msg = 'Deleted user: ' + data.deleted_user;
                if (data.role) msg += ' (' + data.role + ')';
                if (data.had_products) msg += ' - had products';
                if (data.had_orders) msg += ' - had orders';
                return msg;
            }
        }
        
        // Handle remove_moderator
        if (action === 'remove_moderator') {
            if (data.deleted_moderator) {
                return 'Removed moderator: ' + data.deleted_moderator;
            }
            if (typeof data === 'string') {
                return data;
            }
        }
        
        // Handle add_moderator
        if (action === 'add_moderator') {
            if (data.added_moderator) {
                return 'Added moderator: ' + data.added_moderator;
            }
            if (typeof data === 'string') {
                return data;
            }
        }
        
        // Handle update_permissions
        if (action === 'update_permissions') {
            return 'Updated permissions';
        }
        
        return null;
    } catch (e) {
        // Not JSON, return as is if it looks like a reason
        if (details && details.length < 200) {
            return details;
        }
        return null;
    }
};

const Admin_All_Moderation_History = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    
    // Date filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchHistory();
        }
    }, [isAuthenticated]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAllModerationHistory(fromDate, toDate);
            console.log('📡 History response:', JSON.stringify(response, null, 2));
            if (response && response.success) {
                const rawData = response.data || [];
                const formattedData = rawData.map((item: any) => {
                    if (item.moderator) {
                        return item;
                    }
                    return {
                        ...item,
                        moderator: {
                            userID: item.moderatorID || null,
                            name: item.moderator_name || 'Unknown',
                            role: item.moderator_role || 'Unknown'
                        },
                        target_user: item.target_user || (item.targetUserID ? {
                            userID: item.targetUserID,
                            name: item.target_user_name || 'Deleted User',
                            role: item.target_user_role || 'Unknown'
                        } : null),
                        target_product: item.target_product || (item.targetProductID ? {
                            productID: item.targetProductID,
                            name: item.target_product_name || 'Deleted Product'
                        } : null)
                    };
                });
                setHistory(formattedData);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Error fetching all moderation history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchHistory();
        setRefreshing(false);
    };

    const handleApplyFilters = () => {
        fetchHistory();
    };

    const handleClearFilters = () => {
        setFromDate('');
        setToDate('');
        setFilter('all');
        fetchHistory();
    };

    const handleViewDetails = (entry: HistoryEntry) => {
        setSelectedEntry(entry);
        setShowDetailModal(true);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'seller': return 'people-outline';
            case 'product': return 'cube-outline';
            case 'user': return 'person-outline';
            case 'moderator': return 'shield-outline';
            default: return 'document-text-outline';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'seller': return '#FF9800';
            case 'product': return '#4CAF50';
            case 'user': return '#3498DB';
            case 'moderator': return '#6C5CE7';
            default: return '#999';
        }
    };

    const getActionColor = (action: string) => {
        const approveActions = ['approve_seller', 'approve_product', 'add_moderator', 'restore_seller', 'restore_user', 'show_product'];
        const rejectActions = ['reject_seller', 'reject_product', 'delete_seller', 'delete_product', 'delete_user', 'remove_moderator', 'suspend_seller', 'suspend_user', 'hide_product'];
        const editActions = ['edit_seller', 'edit_product', 'edit_user', 'edit_moderator', 'update_permissions'];
        
        if (approveActions.includes(action)) return '#4CAF50';
        if (rejectActions.includes(action)) return '#FF6B6B';
        if (editActions.includes(action)) return '#3498DB';
        if (action === 'add_note') return '#9C27B0';
        return '#999';
    };

    const getActionLabel = (action: string) => {
        const labels: { [key: string]: string } = {
            'approve_seller': 'Approved Seller',
            'reject_seller': 'Rejected Seller',
            'suspend_seller': 'Suspended Seller',
            'restore_seller': 'Restored Seller',
            'delete_seller': 'Deleted Seller',
            'edit_seller': 'Edited Seller',
            'approve_product': 'Approved Product',
            'reject_product': 'Rejected Product',
            'hide_product': 'Hidden Product',
            'show_product': 'Showed Product',
            'delete_product': 'Deleted Product',
            'edit_product': 'Edited Product',
            'add_note': 'Added Note',
            'delete_user': 'Deleted User',
            'edit_user': 'Edited User',
            'suspend_user': 'Suspended User',
            'restore_user': 'Restored User',
            'add_moderator': 'Added Moderator',
            'remove_moderator': 'Removed Moderator',
            'edit_moderator': 'Edited Moderator',
            'update_permissions': 'Updated Permissions'
        };
        return labels[action] || action.replace('_', ' ');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredHistory = filter === 'all' 
        ? history 
        : history.filter(h => h.action_category === filter);

    const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {
        const actionColor = getActionColor(item.action);
        const categoryColor = getCategoryColor(item.action_category);
        const categoryIcon = getCategoryIcon(item.action_category);
        
        const moderatorName = item.moderator?.name || item.moderator_name || 'Unknown';
        const targetName = item.target_user?.name || item.target_user_name || null;
        const targetRole = item.target_user?.role || item.target_user_role || null;
        const productName = item.target_product?.name || item.target_product_name || null;

        return (
            <TouchableOpacity 
                style={[styles.historyCard, { borderLeftColor: actionColor, borderLeftWidth: 4 }]}
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
                            <Ionicons name={categoryIcon} size={20} color={categoryColor} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.moderatorName}>{moderatorName}</Text>
                            <View style={styles.actionContainer}>
                                <View style={[styles.actionDot, { backgroundColor: actionColor }]} />
                                <Text style={[styles.actionText, { fontWeight: 'bold' }]}>
                                    {getActionLabel(item.action)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                <View style={styles.cardBody}>
                    {targetName && (
                        <View style={styles.targetContainer}>
                            <Text style={styles.targetName} numberOfLines={1}>
                                {targetName}
                            </Text>
                            {targetRole && targetRole !== 'Unknown' && targetRole !== 'N/A' && (
                                <Text style={styles.targetRole}>({targetRole})</Text>
                            )}
                        </View>
                    )}
                    {productName && (
                        <View style={styles.targetContainer}>
                            <Text style={styles.targetName} numberOfLines={1}>
                                {productName}
                            </Text>
                        </View>
                    )}
                    {/* REMOVED: details preview - only show in modal */}
                </View>
            </TouchableOpacity>
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
                        You need admin privileges to view all moderation history.
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
                <Text style={styles.storeTitle}>All Moderation History</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                <View style={styles.filterRow}>
                    <View style={styles.filterInputGroup}>
                        <Text style={styles.filterLabel}>From:</Text>
                        <TextInput
                            style={styles.filterInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#999"
                            value={fromDate}
                            onChangeText={setFromDate}
                        />
                    </View>
                    <View style={styles.filterInputGroup}>
                        <Text style={styles.filterLabel}>To:</Text>
                        <TextInput
                            style={styles.filterInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#999"
                            value={toDate}
                            onChangeText={setToDate}
                        />
                    </View>
                </View>

                <View style={styles.filterActions}>
                    <TouchableOpacity 
                        style={[styles.filterActionButton, styles.applyButton]}
                        onPress={handleApplyFilters}
                    >
                        <Ionicons name="search" size={16} color="#fff" />
                        <Text style={styles.filterActionText}>Apply</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterActionButton, styles.clearButton]}
                        onPress={handleClearFilters}
                    >
                        <Ionicons name="refresh" size={16} color="#666" />
                        <Text style={[styles.filterActionText, { color: '#666' }]}>Clear</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Category Filter Tabs */}
            <View style={styles.filterContainer}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'seller', label: 'Sellers' },
                    { key: 'product', label: 'Products' },
                    { key: 'user', label: 'Users' },
                    { key: 'moderator', label: 'Moderators' },
                ].map((filterItem) => {
                    const isActive = filter === filterItem.key;
                    return (
                        <TouchableOpacity
                            key={filterItem.key}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setFilter(filterItem.key)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {filterItem.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading history...</Text>
                </View>
            ) : filteredHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No History Found</Text>
                    <Text style={styles.emptySubtext}>
                        {filter === 'all' 
                            ? 'No moderation actions have been logged yet.' 
                            : `No ${filter} actions found.`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredHistory}
                    renderItem={renderHistoryItem}
                    keyExtractor={(item) => item.historyID?.toString() || Math.random().toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
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
                            <Text style={styles.modalTitle}>Action Details</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedEntry && (
                                <View style={styles.modalBody}>
                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Action:</Text>
                                        <Text style={[styles.modalValue, { color: getActionColor(selectedEntry.action), fontWeight: 'bold' }]}>
                                            {getActionLabel(selectedEntry.action)}
                                        </Text>
                                    </View>

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Category:</Text>
                                        <Text style={styles.modalValue}>
                                            {selectedEntry.action_category?.charAt(0).toUpperCase() + selectedEntry.action_category?.slice(1) || 'N/A'}
                                        </Text>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Moderator:</Text>
                                        <Text style={styles.modalValue}>
                                            {selectedEntry.moderator?.name || selectedEntry.moderator_name || 'Unknown'}
                                            {selectedEntry.moderator?.role ? ` (${selectedEntry.moderator.role})` : ''}
                                        </Text>
                                    </View>

                                    {selectedEntry.target_user && (
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Target User:</Text>
                                            <Text style={[styles.modalValue, { fontWeight: 'bold' }]}>
                                                {selectedEntry.target_user.name}
                                            </Text>
                                            <Text style={[styles.modalValue, { color: '#999', fontSize: 12 }]}>
                                                #{selectedEntry.target_user.userID}
                                            </Text>
                                        </View>
                                    )}

                                    {selectedEntry.target_product && (
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>Target Product:</Text>
                                            <Text style={[styles.modalValue, { fontWeight: 'bold' }]}>
                                                {selectedEntry.target_product.name}
                                            </Text>
                                            <Text style={[styles.modalValue, { color: '#999', fontSize: 12 }]}>
                                                #{selectedEntry.target_product.productID}
                                            </Text>
                                        </View>
                                    )}

                                    {selectedEntry.details && (
                                        <>
                                            <View style={styles.modalDivider} />
                                            <Text style={styles.modalLabel}>Reason/Details:</Text>
                                            <Text style={styles.modalDetails}>
                                                {formatDetails(selectedEntry.details, selectedEntry.action)}
                                            </Text>
                                        </>
                                    )}

                                    <View style={styles.modalDivider} />

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Time:</Text>
                                        <Text style={styles.modalValue}>
                                            {formatDate(selectedEntry.created_at)}
                                        </Text>
                                    </View>

                                    {selectedEntry.ip_address && (
                                        <View style={styles.modalRow}>
                                            <Text style={styles.modalLabel}>IP Address:</Text>
                                            <Text style={styles.modalValue}>
                                                {selectedEntry.ip_address}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowDetailModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
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
    // Filter Section
    filterSection: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
    },
    filterInputGroup: {
        flex: 1,
    },
    filterLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 13,
        color: '#333',
        backgroundColor: '#f8f9fa',
    },
    filterActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    filterActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    applyButton: {
        backgroundColor: '#DC3545',
    },
    clearButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    filterActionText: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 6,
        flexWrap: 'wrap',
    },
    filterTab: {
        paddingHorizontal: 14,
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
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
    },
    historyCard: {
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
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardInfo: {
        flex: 1,
    },
    moderatorName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    actionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    actionText: {
        fontSize: 13,
        color: '#333',
    },
    dateText: {
        fontSize: 11,
        color: '#999',
    },
    cardBody: {
        paddingLeft: 46,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    targetContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    targetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    targetRole: {
        fontSize: 12,
        color: '#666',
    },
    detailsPreview: {
        fontSize: 12,
        color: '#9C27B0',
        fontStyle: 'italic',
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
        maxHeight: '80%',
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
    modalRow: {
        flexDirection: 'row',
        marginTop: 4,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    modalLabel: {
        fontSize: 14,
        color: '#666',
        width: 90,
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
    modalDetails: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    modalCloseButton: {
        backgroundColor: '#6C5CE7',
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
});

export default Admin_All_Moderation_History;