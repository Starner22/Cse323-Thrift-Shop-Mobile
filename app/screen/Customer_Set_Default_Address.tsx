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
    Alert,
    RefreshControl
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

const Customer_Set_Default_Address = ({ navigation }: any) => {
    const { isAuthenticated } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

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
                // Find current default
                const defaultAddr = response.addresses?.find((a: Address) => a.is_default === 1);
                if (defaultAddr) {
                    setSelectedId(defaultAddr.addressID);
                }
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

    const handleSelect = (addressID: number) => {
        setSelectedId(addressID);
    };

    const handleConfirm = async () => {
        if (!selectedId) {
            Alert.alert('Error', 'Please select an address');
            return;
        }

        const selectedAddress = addresses.find(a => a.addressID === selectedId);
        if (!selectedAddress) return;

        if (selectedAddress.is_default === 1) {
            Alert.alert('Info', 'This is already your default address');
            navigation.goBack();
            return;
        }

        Alert.alert(
            'Set Default Address',
            `Set "${selectedAddress.address}" as your default address?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Set Default',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await apiService.updateAddress(selectedId, {
                                ...selectedAddress,
                                is_default: 1
                            });
                            Alert.alert(
                                'Success',
                                'Default address updated successfully!',
                                [{ text: 'OK', onPress: () => navigation.goBack() }]
                            );
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to set default address');
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const renderAddressItem = (address: Address) => {
        const isSelected = selectedId === address.addressID;
        const isCurrentDefault = address.is_default === 1;

        return (
            <TouchableOpacity
                style={[
                    styles.addressItem,
                    isSelected && styles.addressItemSelected,
                    isCurrentDefault && styles.addressItemDefault
                ]}
                onPress={() => handleSelect(address.addressID)}
                activeOpacity={0.7}
            >
                <View style={styles.radioContainer}>
                    <View style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected
                    ]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                </View>

                <View style={styles.addressContent}>
                    <Text style={styles.addressText}>{address.address}</Text>
                    <Text style={styles.addressDetail}>
                        {address.city}, {address.state || ''}
                    </Text>
                    <Text style={styles.addressDetail}>
                        {address.postal_code}, {address.country}
                    </Text>
                    {address.phone && (
                        <Text style={styles.addressPhone}>📱 {address.phone}</Text>
                    )}
                </View>

                {isCurrentDefault && (
                    <View style={styles.defaultBadge}>
                        <Ionicons name="star" size={14} color="#fff" />
                        <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                )}
            </TouchableOpacity>
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Set Default Address</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#3498DB" />
                <Text style={styles.infoText}>
                    Select the address you want to set as your default shipping address.
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading addresses...</Text>
                </View>
            ) : addresses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="location-outline" size={80} color="#ccc" />
                    <Text style={styles.emptyTitle}>No Addresses</Text>
                    <Text style={styles.emptySubtext}>
                        You don't have any saved addresses.
                    </Text>
                    <TouchableOpacity 
                        style={styles.addButton}
                        onPress={() => navigation.navigate('CustomerAddAddress')}
                    >
                        <Text style={styles.addButtonText}>Add Address</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={styles.scrollContent}
                >
                    <Text style={styles.sectionTitle}>Select an address:</Text>
                    
                    {addresses.map((address) => (
                        <View key={address.addressID}>
                            {renderAddressItem(address)}
                        </View>
                    ))}

                    <TouchableOpacity 
                        style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
                        onPress={handleConfirm}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={styles.confirmButtonText}>Set as Default</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            )}
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
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f4fd',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 10,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#3498DB',
        lineHeight: 20,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 40,
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
    addressItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
    addressItemSelected: {
        borderColor: '#4CAF50',
        borderWidth: 2,
        backgroundColor: '#f0fff4',
    },
    addressItemDefault: {
        borderColor: '#FFD700',
        borderWidth: 1,
        backgroundColor: '#fffbf0',
    },
    radioContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: '#4CAF50',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
    },
    addressContent: {
        flex: 1,
    },
    addressText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
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
    defaultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        gap: 4,
        alignSelf: 'flex-start',
    },
    defaultBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
    },
    confirmButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 8,
    },
    confirmButtonDisabled: {
        opacity: 0.7,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
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
    addButton: {
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 10,
    },
    addButtonText: {
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
});

export default Customer_Set_Default_Address;