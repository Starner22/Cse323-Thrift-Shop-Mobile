import React, { useState, useEffect, useCallback } from 'react';
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
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

interface Address {
    addressID: number;
    userID: number;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string;
    is_default: number;
    created_at: string;
}

const Customer_Address = ({ navigation }: any) => {
    const { isAuthenticated } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAddresses();
        }
    }, [isAuthenticated]);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await apiService.getAddresses();
            if (response.success) {
                setAddresses(response.addresses || []);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
            Alert.alert('Error', 'Failed to load addresses');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAddresses();
        setRefreshing(false);
    };

    const handleDeleteAddress = (address: Address) => {
        setSelectedAddress(address);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedAddress) return;
        
        try {
            setDeletingId(selectedAddress.addressID);
            await apiService.deleteAddress(selectedAddress.addressID);
            await fetchAddresses();
            setShowDeleteModal(false);
            Alert.alert('Success', 'Address deleted successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete address');
        } finally {
            setDeletingId(null);
            setSelectedAddress(null);
        }
    };

    const handleSetDefault = async (address: Address) => {
        if (address.is_default === 1) {
            Alert.alert('Info', 'This is already your default address');
            return;
        }

        Alert.alert(
            'Set as Default',
            `Set "${address.address}" as your default address?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Set as Default',
                    onPress: async () => {
                        try {
                            await apiService.updateAddress(address.addressID, {
                                ...address,
                                is_default: 1
                            });
                            await fetchAddresses();
                            Alert.alert('Success', 'Default address updated');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to set default address');
                        }
                    }
                }
            ]
        );
    };

    const getDefaultAddress = () => {
        return addresses.find(addr => addr.is_default === 1);
    };

    const getOtherAddresses = () => {
        return addresses.filter(addr => addr.is_default === 0);
    };

    const renderAddressCard = (address: Address, isDefault: boolean) => {
        const isDeleting = deletingId === address.addressID;

        return (
            <View style={[styles.addressCard, isDefault && styles.defaultCard]}>
                <View style={styles.addressContent}>
                    <View style={styles.addressHeader}>
                        <Text style={styles.addressText}>{address.address}</Text>
                        {isDefault && (
                            <View style={styles.defaultBadge}>
                                <Ionicons name="star" size={14} color="#fff" />
                                <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.addressDetail}>
                        {address.city}, {address.state || ''}
                    </Text>
                    <Text style={styles.addressDetail}>
                        {address.postal_code}, {address.country}
                    </Text>
                    {address.phone && (
                        <Text style={styles.addressPhone}>
                            📱 {address.phone}
                        </Text>
                    )}
                </View>

                <View style={styles.addressActions}>
                    {!isDefault && (
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.defaultAction]}
                            onPress={() => handleSetDefault(address)}
                        >
                            <Ionicons name="star-outline" size={18} color="#4CAF50" />
                            <Text style={styles.defaultActionText}>Set Default</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.editAction]}
                        onPress={() => navigation.navigate('CustomerEditAddress', { address })}
                    >
                        <Ionicons name="create-outline" size={18} color="#3498DB" />
                        <Text style={styles.editActionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.deleteAction]}
                        onPress={() => handleDeleteAddress(address)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#FF6B6B" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                                <Text style={styles.deleteActionText}>Delete</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="location-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to manage your addresses
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

    const defaultAddress = getDefaultAddress();
    const otherAddresses = getOtherAddresses();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>My Addresses</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => navigation.navigate('CustomerAddAddress')}
                >
                    <Ionicons name="add" size={28} color="#4CAF50" />
                </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButtonMain, styles.addAddressButton]}
                    onPress={() => navigation.navigate('CustomerAddAddress')}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#fff" />
                    <Text style={styles.actionButtonMainText}>Add Address</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButtonMain, styles.setDefaultButton]}
                    onPress={() => {
                        if (addresses.length === 0) {
                            Alert.alert('Info', 'No addresses to set as default. Add one first.');
                            return;
                        }
                        navigation.navigate('CustomerSetDefaultAddress');
                    }}
                >
                    <Ionicons name="star-outline" size={24} color="#fff" />
                    <Text style={styles.actionButtonMainText}>Set Default</Text>
                </TouchableOpacity>
            
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading addresses...</Text>
                </View>
            ) : addresses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Addresses Saved</Text>
                    <Text style={styles.emptySubtext}>
                        Add your first address to make shopping easier!
                    </Text>
                    <TouchableOpacity 
                        style={styles.emptyAddButton}
                        onPress={() => navigation.navigate('CustomerAddAddress')}
                    >
                        <Text style={styles.emptyAddButtonText}>+ Add Address</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Default Address Section */}
                    {defaultAddress && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📍 Default Address</Text>
                            {renderAddressCard(defaultAddress, true)}
                        </View>
                    )}

                    {/* Other Addresses Section */}
                    {otherAddresses.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📋 Other Addresses</Text>
                            {otherAddresses.map((address) => (
                                <View key={address.addressID}>
                                    {renderAddressCard(address, false)}
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIcon}>
                            <Ionicons name="alert-circle" size={50} color="#FF6B6B" />
                        </View>
                        <Text style={styles.modalTitle}>Delete Address?</Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to delete this address?
                        </Text>
                        <Text style={styles.modalAddress}>
                            {selectedAddress?.address}
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={() => setShowDeleteModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalDeleteButton]}
                                onPress={confirmDelete}
                            >
                                <Text style={styles.modalDeleteText}>Delete</Text>
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
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionButtonMain: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flex: 1,
        gap: 8,
    },
    addAddressButton: {
        backgroundColor: '#4CAF50',
    },
    setDefaultButton: {
        backgroundColor: '#FF9800',
    },
    actionButtonMainText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
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
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    defaultCard: {
        borderColor: '#4CAF50',
        borderWidth: 2,
        backgroundColor: '#f0fff4',
    },
    addressContent: {
        marginBottom: 10,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        flex: 1,
    },
    defaultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    defaultBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    addressDetail: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    addressPhone: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    addressActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 10,
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    defaultAction: {
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    defaultActionText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '500',
    },
    editAction: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#3498DB',
    },
    editActionText: {
        fontSize: 12,
        color: '#3498DB',
        fontWeight: '500',
    },
    deleteAction: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    deleteActionText: {
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
    emptyAddButton: {
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
    },
    emptyAddButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 30,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
    },
    modalIcon: {
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalAddress: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCancelButton: {
        backgroundColor: '#f0f0f0',
    },
    modalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    modalDeleteButton: {
        backgroundColor: '#FF6B6B',
    },
    modalDeleteText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Customer_Address;