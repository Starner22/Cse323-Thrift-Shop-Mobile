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
    Modal
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
    moderator: {
        userID: number;
        name: string;
        role: string;
    };
    target_user: {
        userID: number;
        name: string;
        role: string;
    } | null;
    target_product: {
        productID: number;
        name: string;
    } | null;
}

const Moderation_History_Screen = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchHistory();
        }
    }, [isAuthenticated]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await apiService.getModerationHistory();
            if (response && response.success) {
                setHistory(response.data || []);
                setIsAdmin(response.isAdmin || false);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Error fetching moderation history:', error);
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
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get the target name and ID based on category
    const getTargetInfo = (entry: HistoryEntry) => {
        if (entry.target_user) {
            return {
                name: entry.target_user.name,
                id: entry.target_user.userID,
                role: entry.target_user.role,
                type: 'user'
            };
        }
        if (entry.target_product) {
            return {
                name: entry.target_product.name,
                id: entry.target_product.productID,
                role: null,
                type: 'product'
            };
        }
        return null;
    };

    const filteredHistory = filter === 'all' 
        ? history 
        : history.filter(h => h.action_category === filter);

    const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {
        const actionColor = getActionColor(item.action);
        const categoryColor = getCategoryColor(item.action_category);
        const categoryIcon = getCategoryIcon(item.action_category);
        
        // Determine target info based on what's available
        let targetName = '';
        let targetID = '';
        let targetType = '';
        
        if (item.target_user) {
            targetName = item.target_user.name;
            targetID = item.target_user.userID.toString();
            targetType = 'User';
        } else if (item.target_product) {
            targetName = item.target_product.name;
            targetID = item.target_product.productID.toString();
            targetType = 'Product';
        }

        return (
            <TouchableOpacity 
                style={[
                    styles.historyCard,
                    { borderLeftColor: actionColor, borderLeftWidth: 4 }
                ]}
                onPress={() => handleViewDetails(item)}
                activeOpacity={0.7}
            >
                {/* Row 1: Icon + Target Name/User Name/Seller Name in Bold */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.categoryIcon, { backgroundColor: categoryColor + '20' }]}>
                            <Ionicons name={categoryIcon} size={20} color={categoryColor} />
                        </View>
                        <View style={styles.cardInfo}>
                            {isAdmin && (
                                <Text style={styles.moderatorName}>👤 {item.moderator.name}</Text>
                            )}
                            <Text style={styles.targetName} numberOfLines={1}>
                                {targetType}: {targetName || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                {/* Row 2: ID */}
                {targetID && (
                    <View style={styles.idRow}>
                        <Text style={styles.idText}>
                            ID: #{targetID}
                        </Text>
                    </View>
                )}

                {/* Row 3: Action with color */}
                <View style={styles.actionRow}>
                    <View style={[styles.actionDot, { backgroundColor: actionColor }]} />
                    <Text style={[styles.actionText, { fontWeight: 'bold' }]}>
                        {getActionLabel(item.action)}
                    </Text>
                </View>
            </TouchableOpacity>
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
                <Text style={styles.storeTitle}>Moderation History</Text>
                <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
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
                    keyExtractor={(item) => item.historyID.toString()}
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
                                            {selectedEntry.action_category.charAt(0).toUpperCase() + selectedEntry.action_category.slice(1)}
                                        </Text>
                                    </View>

                                    <View style={styles.modalDivider} />

                                    <View style={styles.modalRow}>
                                        <Text style={styles.modalLabel}>Moderator:</Text>
                                        <Text style={styles.modalValue}>
                                            {selectedEntry.moderator.name} ({selectedEntry.moderator.role})
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
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
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
        gap: 6,
    },
    targetId: {
        fontSize: 12,
        color: '#999',
    },
    roleBadge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    roleBadgeText: {
        fontSize: 10,
        color: '#666',
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

    idRow: {
        paddingLeft: 46,
        marginTop: 2,
        marginBottom: 2,
    },
    idText: {
        fontSize: 12,
        color: '#999',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 46,
        marginTop: 4,
    },
    actionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    actionText: {
        fontSize: 13,
        color: '#333',
    },
    targetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
},
});

export default Moderation_History_Screen;