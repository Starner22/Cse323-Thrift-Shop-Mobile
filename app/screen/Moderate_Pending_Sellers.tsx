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

interface PendingSeller {
    userID: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    business_name: string;
    business_address: string;
    business_phone: string;
    business_email: string;
    tax_id: string;
    bank_account: string;
    created_at: string;
}

const Moderate_Pending_Sellers = ({ navigation }: any) => {
    const { isAuthenticated, user } = useAuth();
    const [sellers, setSellers] = useState<PendingSeller[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState<PendingSeller | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchPendingSellers();
        }
    }, [isAuthenticated]);

    const fetchPendingSellers = async () => {
        try {
            setLoading(true);
            const data = await apiService.getPendingSellers();
            setSellers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching pending sellers:', error);
            Alert.alert('Error', 'Failed to load pending sellers');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPendingSellers();
        setRefreshing(false);
    };

    const handleApprove = (seller: PendingSeller) => {
        Alert.alert(
            'Approve Seller',
            `Are you sure you want to approve "${seller.business_name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            setProcessingId(seller.userID);
                            await apiService.approveSeller(seller.userID);
                            setSellers(prev => prev.filter(s => s.userID !== seller.userID));
                            Alert.alert('Success', 'Seller approved successfully!');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to approve seller');
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleReject = (seller: PendingSeller) => {
        setSelectedSeller(seller);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const submitReject = async () => {
        if (!selectedSeller) return;
        
        if (!rejectReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejection');
            return;
        }

        try {
            setProcessingId(selectedSeller.userID);
            await apiService.rejectSeller(selectedSeller.userID, rejectReason.trim());
            setSellers(prev => prev.filter(s => s.userID !== selectedSeller.userID));
            setShowRejectModal(false);
            Alert.alert('Success', 'Seller rejected');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reject seller');
        } finally {
            setProcessingId(null);
            setSelectedSeller(null);
        }
    };

    const handleViewDetails = (seller: PendingSeller) => {
        setSelectedSeller(seller);
        setShowDetailModal(true);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderSeller = ({ item }: { item: PendingSeller }) => {
        const isProcessing = processingId === item.userID;

        return (
            <View style={styles.sellerCard}>
                <TouchableOpacity 
                    style={styles.cardContent}
                    onPress={() => handleViewDetails(item)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {item.business_name.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.sellerInfo}>
                        <Text style={styles.businessName} numberOfLines={1}>
                            {item.business_name}
                        </Text>
                        <Text style={styles.sellerName}>{item.name}</Text>
                        <View style={styles.sellerMeta}>
                            <Ionicons name="mail-outline" size={14} color="#999" />
                            <Text style={styles.sellerMetaText}>{item.email}</Text>
                        </View>
                        <Text style={styles.sellerDate}>Applied: {formatDate(item.created_at)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={18} color="#fff" />
                                <Text style={styles.actionButtonText}>Approve</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(item)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
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
                <Text style={styles.storeTitle}>Pending Sellers</Text>
                <Text style={styles.countBadge}>{sellers.length}</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading pending sellers...</Text>
                </View>
            ) : sellers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
                    <Text style={styles.emptyTitle}>All Clear! 🎉</Text>
                    <Text style={styles.emptySubtext}>
                        No seller applications pending moderation.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {sellers.map((item) => (
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
                            <Text style={styles.modalTitle}>Seller Application</Text>
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
                                                {selectedSeller.business_name.substring(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.modalBusinessName}>{selectedSeller.business_name}</Text>
                                    <Text style={styles.modalOwnerName}>Owner: {selectedSeller.name}</Text>
                                    
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

                                    <Text style={styles.modalSectionTitle}>Application Date</Text>
                                    <Text style={styles.modalDate}>{formatDate(selectedSeller.created_at)}</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalApproveButton]}
                                onPress={() => {
                                    if (selectedSeller) {
                                        setShowDetailModal(false);
                                        handleApprove(selectedSeller);
                                    }
                                }}
                            >
                                <Ionicons name="checkmark" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalRejectButton]}
                                onPress={() => {
                                    if (selectedSeller) {
                                        setShowDetailModal(false);
                                        handleReject(selectedSeller);
                                    }
                                }}
                            >
                                <Ionicons name="close" size={20} color="#fff" />
                                <Text style={styles.modalButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowRejectModal(false)}
                    />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.rejectModalContent}
                    >
                        <View style={styles.rejectModalInner}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reject Seller</Text>
                                <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.rejectModalSubtitle}>
                                Please provide a reason for rejecting "{selectedSeller?.business_name}":
                            </Text>

                            <TextInput
                                style={styles.rejectInput}
                                placeholder="Enter rejection reason..."
                                placeholderTextColor="#999"
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.rejectModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalCancel]}
                                    onPress={() => setShowRejectModal(false)}
                                >
                                    <Text style={styles.rejectModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.rejectModalButton, styles.rejectModalSubmit]}
                                    onPress={submitReject}
                                >
                                    <Text style={styles.rejectModalSubmitText}>Submit</Text>
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
        backgroundColor: '#FF9F43',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 2,
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    cardContent: {
        flexDirection: 'row',
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
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
    sellerDate: {
        fontSize: 11,
        color: '#bbb',
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        gap: 6,
        minWidth: 90,
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF6B6B',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 22,
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
    modalDate: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
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
    modalApproveButton: {
        backgroundColor: '#4CAF50',
    },
    modalRejectButton: {
        backgroundColor: '#FF6B6B',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    // Reject Modal
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
        backgroundColor: '#FF6B6B',
    },
    rejectModalSubmitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Moderate_Pending_Sellers;