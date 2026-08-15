import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Admin_Seller_Orders = ({ route, navigation }: any) => {
    const { sellerName } = route.params || {};

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle} numberOfLines={1}>
                    Orders: {sellerName || 'Seller'}
                </Text>
            </View>

            <View style={styles.placeholderContainer}>
                <Ionicons name="receipt-outline" size={80} color="#ccc" />
                <Text style={styles.placeholderTitle}>Orders Coming Soon</Text>
                <Text style={styles.placeholderSubtext}>
                    Order management for sellers will be available in a future update.
                </Text>
                <TouchableOpacity 
                    style={styles.goBackButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.goBackButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    placeholderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    placeholderSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    goBackButton: {
        marginTop: 24,
        backgroundColor: '#DC3545',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    goBackButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default Admin_Seller_Orders;