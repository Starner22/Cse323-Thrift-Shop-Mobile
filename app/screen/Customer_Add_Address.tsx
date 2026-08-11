import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../service/api_calls';

const Customer_Add_Address = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    
    // Form fields
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('Bangladesh');
    const [phone, setPhone] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const validateForm = () => {
        if (!address.trim()) {
            Alert.alert('Error', 'Address is required');
            return false;
        }
        
        if (!city.trim()) {
            Alert.alert('Error', 'City is required');
            return false;
        }
        
        if (!postalCode.trim()) {
            Alert.alert('Error', 'Postal code is required');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const addressData = {
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                postal_code: postalCode.trim(),
                country: country.trim(),
                phone: phone.trim(),
                is_default: isDefault ? 1 : 0
            };

            const response = await apiService.addAddress(addressData);
            
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Address added successfully!',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to add address');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Add Address</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Address Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address *</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="location-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="123 Main Street"
                                placeholderTextColor="#999"
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>
                    </View>

                    {/* City */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>City *</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="business-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="Dhaka"
                                placeholderTextColor="#999"
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                    </View>

                    {/* State */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>State / Division</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="map-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="Dhaka Division"
                                placeholderTextColor="#999"
                                value={state}
                                onChangeText={setState}
                            />
                        </View>
                    </View>

                    {/* Postal Code */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Postal Code *</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="1212"
                                placeholderTextColor="#999"
                                value={postalCode}
                                onChangeText={setPostalCode}
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>

                    {/* Country */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Country</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="flag-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="Bangladesh"
                                placeholderTextColor="#999"
                                value={country}
                                onChangeText={setCountry}
                            />
                        </View>
                    </View>

                    {/* Phone */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color="#999" />
                            <TextInput
                                style={styles.input}
                                placeholder="+8801234567890"
                                placeholderTextColor="#999"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Set as Default Switch */}
                    <View style={styles.switchContainer}>
                        <View style={styles.switchLeft}>
                            <Ionicons name="star-outline" size={22} color="#4CAF50" />
                            <Text style={styles.switchLabel}>Set as default address</Text>
                        </View>
                        <Switch
                            value={isDefault}
                            onValueChange={setIsDefault}
                            trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
                            thumbColor={isDefault ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                <Text style={styles.submitButtonText}>Save Address</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        paddingTop: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
        paddingVertical: 0,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#e8e8e8',
        marginTop: 4,
        marginBottom: 20,
    },
    switchLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    switchLabel: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    submitButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Customer_Add_Address;