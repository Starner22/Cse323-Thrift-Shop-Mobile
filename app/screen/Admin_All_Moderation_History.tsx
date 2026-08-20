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
    TextInput,
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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

const formatDetails = (details: string | null, action: string): string | null => {
    if (!details) return null;
   
    try {
        const data = JSON.parse(details);

        if (data.summary) {
            return data.summary;
        }
       
        if (action.startsWith('edit_')) {
            if (data.updated_fields) {
                return 'Updated: ' + data.updated_fields.join(', ');
            }
        }
       
        if (['reject_seller', 'reject_product', 'suspend_seller'].includes(action)) {
            if (data.reason) {
                return 'Reason: ' + data.reason;
            }
            if (typeof data === 'string') {
                return 'Reason: ' + data;
            }
            if (typeof details === 'string' && !details.startsWith('{')) {
                return 'Reason: ' + details;
            }
        }
       
        if (action === 'restore_seller' || action === 'restore_user') {
            return null;
        }
       
        if (action === 'add_note') {
            if (data.note) return 'Note: ' + data.note;
            if (typeof data === 'string') return 'Note: ' + data;
        }
    
        if (action === 'delete_user') {
            if (data.deleted_user) {
                let msg = 'Deleted user: ' + data.deleted_user;
                if (data.role) msg += ' (' + data.role + ')';
                if (data.had_products) msg += ' - had products';
                if (data.had_orders) msg += ' - had orders';
                return msg;
            }
        }
        if (action === 'remove_moderator') {
            if (data.deleted_moderator) {
                return 'Removed moderator: ' + data.deleted_moderator;
            }
            if (typeof data === 'string') {
                return data;
            }
        }
        if (action === 'add_moderator') {
            if (data.added_moderator) {
                return 'Added moderator: ' + data.added_moderator;
            }
            if (typeof data === 'string') {
                return data;
            }
        }
        if (action === 'update_permissions') {
            return 'Updated permissions';
        }
       
        return null;
    } catch (e) {
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
    
    // ✅ Date picker states
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    
    // Export modal states
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportEmail, setExportEmail] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchHistory();
            setExportEmail(user?.email || '');
        }
    }, [isAuthenticated]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            // ✅ Convert dates to YYYY-MM-DD for API
            const fromDateStr = fromDate ? formatDateToAPI(fromDate) : '';
            const toDateStr = toDate ? formatDateToAPI(toDate) : '';
            
            const response = await apiService.getAllModerationHistory(fromDateStr, toDateStr);
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

    // ✅ Helper: Format date to YYYY-MM-DD for API
    const formatDateToAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // ✅ Helper: Format date for display (e.g., "Aug 20, 2026")
    const formatDateDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
        setFromDate(null);
        setToDate(null);
        setFilter('all');
        fetchHistory();
    };

    const handleViewDetails = (entry: HistoryEntry) => {
        setSelectedEntry(entry);
        setShowDetailModal(true);
    };

    const handleExportPDF = async () => {
        if (!exportEmail || !exportEmail.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }
        
        try {
            setExporting(true);
            const actionFilter = filter === 'all' ? '' : filter;
            const fromDateStr = fromDate ? formatDateToAPI(fromDate) : '';
            const toDateStr = toDate ? formatDateToAPI(toDate) : '';
            
            const response = await apiService.exportModerationHistory(
                exportEmail,
                fromDateStr,
                toDateStr,
                actionFilter
            );
            
            if (response && response.success) {
                Alert.alert(
                    '✅ Report Sent',
                    `Moderation history report has been sent to:\n\n${exportEmail}`,
                    [{ text: 'OK' }]
                );
                setShowExportModal(false);
            } else {
                Alert.alert('Error', response?.message || 'Failed to generate report');
            }
        } catch (error: any) {
            console.error('Export error:', error);
            Alert.alert('Error', error?.message || 'Failed to export moderation history');
        } finally {
            setExporting(false);
        }
    };

    // ✅ Date Picker Handlers
    const onFromDateChange = (event: any, selectedDate?: Date) => {
        setShowFromPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setFromDate(selectedDate);
        }
    };

    const onToDateChange = (event: any, selectedDate?: Date) => {
        setShowToPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setToDate(selectedDate);
        }
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

    const renderExportModal = () => (
        <Modal
            visible={showExportModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowExportModal(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity 
                    style={styles.modalBackground}
                    onPress={() => setShowExportModal(false)}
                />
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Export Moderation History</Text>
                        <TouchableOpacity onPress={() => setShowExportModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.modalBody}>
                        <Text style={styles.modalLabel}>Email Address</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={exportEmail}
                            onChangeText={setExportEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        
                        <Text style={[styles.modalLabel, { marginTop: 12 }]}>Report Details</Text>
                        <View style={styles.exportSummary}>
                            <View style={styles.exportSummaryRow}>
                                <Text style={styles.exportSummaryLabel}>Total Records:</Text>
                                <Text style={styles.exportSummaryValue}>{filteredHistory.length}</Text>
                            </View>
                            <View style={styles.exportSummaryRow}>
                                <Text style={styles.exportSummaryLabel}>Filter:</Text>
                                <Text style={styles.exportSummaryValue}>{filter === 'all' ? 'All Categories' : filter}</Text>
                            </View>
                            <View style={styles.exportSummaryRow}>
                                <Text style={styles.exportSummaryLabel}>Date Range:</Text>
                                <Text style={styles.exportSummaryValue}>
                                    {fromDate ? formatDateDisplay(fromDate) : 'All'} to {toDate ? formatDateDisplay(toDate) : 'All'}
                                </Text>
                            </View>
                        </View>
                        
                        <Text style={styles.modalHint}>
                            The report will be sent as a PDF attachment with all moderation actions.
                        </Text>
                    </View>
                    
                    <View style={styles.modalFooter}>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.modalCancel]}
                            onPress={() => setShowExportModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.modalButton, styles.modalSend]}
                            onPress={handleExportPDF}
                            disabled={exporting}
                        >
                            {exporting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.modalSendText}>Send Report</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

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
        <>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />

                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>All Moderation History</Text>
                    <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={() => {
                            setExportEmail(user?.email || '');
                            setShowExportModal(true);
                        }}
                    >
                        <Ionicons name="document-text-outline" size={28} color="#6C5CE7" />
                    </TouchableOpacity>
                </View>

                {/* ✅ Updated: Date Picker Section */}
                <View style={styles.filterSection}>
                    <View style={styles.filterRow}>
                        <View style={styles.filterInputGroup}>
                            <Text style={styles.filterLabel}>From</Text>
                            <TouchableOpacity 
                                style={styles.dateButton}
                                onPress={() => setShowFromPicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#666" />
                                <Text style={styles.dateButtonText}>
                                    {fromDate ? formatDateDisplay(fromDate) : 'Select Start Date'}
                                </Text>
                            </TouchableOpacity>
                            {showFromPicker && (
                                <DateTimePicker
                                    value={fromDate || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onFromDateChange}
                                    maximumDate={toDate || new Date()}
                                />
                            )}
                        </View>

                        <View style={styles.filterInputGroup}>
                            <Text style={styles.filterLabel}>To</Text>
                            <TouchableOpacity 
                                style={styles.dateButton}
                                onPress={() => setShowToPicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#666" />
                                <Text style={styles.dateButtonText}>
                                    {toDate ? formatDateDisplay(toDate) : 'Select End Date'}
                                </Text>
                            </TouchableOpacity>
                            {showToPicker && (
                                <DateTimePicker
                                    value={toDate || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onToDateChange}
                                    minimumDate={fromDate || undefined}
                                    maximumDate={new Date()}
                                />
                            )}
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

            {renderExportModal()}
        </>
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
        marginBottom: 4,
        fontWeight: '500',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#f8f9fa',
        gap: 8,
    },
    dateButtonText: {
        fontSize: 13,
        color: '#333',
        flex: 1,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackground: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
        maxHeight: '80%',
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
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#f8f9fa',
    },
    modalHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancel: {
        backgroundColor: '#f0f0f0',
    },
    modalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    modalSend: {
        backgroundColor: '#6C5CE7',
    },
    modalSendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 10,
    },
    modalRow: {
        flexDirection: 'row',
        marginTop: 4,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    modalValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
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
    exportSummary: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginTop: 4,
    },
    exportSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
    },
    exportSummaryLabel: {
        fontSize: 13,
        color: '#666',
    },
    exportSummaryValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
});

export default Admin_All_Moderation_History;