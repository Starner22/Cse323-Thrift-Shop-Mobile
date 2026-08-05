import React, { useState, useEffect } from 'react';
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
    Image,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiService, Category } from '../service/api_calls';

const Seller_Edit_Product = ({ route, navigation }: any) => {
    const { product } = route.params || {};
    const { isAuthenticated } = useAuth();
    
    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryID, setCategoryID] = useState<number | null>(null);
    const [condition, setCondition] = useState('Good');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [image, setImage] = useState<string | null>(null);
    const [existingImage, setExistingImage] = useState<string | null>(null);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showConditionDropdown, setShowConditionDropdown] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const conditionOptions = ['Excellent', 'Good', 'Normal', 'Subpar'];
    const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

    useEffect(() => {
        fetchCategories();
        loadProductData();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await apiService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProductData = () => {
        if (product) {
            setName(product.name || '');
            setDescription(product.description || '');
            setCategoryID(product.categoryID || null);
            setCondition(product.condition || 'Good');
            setPrice(product.price?.toString() || '');
            setQuantity(product.quantity?.toString() || '1');
            if (product.image_path) {
                setExistingImage(product.image_path);
            }
        }
    };

    const pickImage = async (source: 'camera' | 'gallery') => {
        setShowImageOptions(false);
        
        try {
            let result;
            
            if (source === 'camera') {
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    setImage(`data:image/jpeg;base64,${asset.base64}`);
                } else {
                    setImage(asset.uri);
                }
                // Clear existing image when new one is selected
                setExistingImage(null);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Product name is required');
            return false;
        }
        
        if (name.trim().length < 3) {
            Alert.alert('Validation Error', 'Product name must be at least 3 characters');
            return false;
        }
        
        if (!description.trim()) {
            Alert.alert('Validation Error', 'Description is required');
            return false;
        }
        
        if (description.trim().length < 10) {
            Alert.alert('Validation Error', 'Description must be at least 10 characters');
            return false;
        }
        
        if (!categoryID) {
            Alert.alert('Validation Error', 'Please select a category');
            return false;
        }
        
        if (!price) {
            Alert.alert('Validation Error', 'Price is required');
            return false;
        }
        
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid price');
            return false;
        }
        
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1) {
            Alert.alert('Validation Error', 'Quantity must be at least 1');
            return false;
        }
        
        // Image is optional during edit (keep existing if no new image)
        return true;
    };

    const handleSubmit = async () => {
        if (!isAuthenticated) {
            Alert.alert(
                'Login Required',
                'Please login to edit products',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => navigation.navigate('Login') }
                ]
            );
            return;
        }

        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const formData: any = {
                name: name.trim(),
                description: description.trim(),
                categoryID: categoryID,
                condition: condition,
                price: parseFloat(price),
                quantity: parseInt(quantity),
            };

            // Only send image if a new one was selected
            if (image) {
                formData.image = image;
            }

            const response = await apiService.updateProduct(product.productID, formData);
            
            if (response.success) {
                Alert.alert(
                    'Success!',
                    'Product updated successfully!',
                    [
                        { 
                            text: 'OK', 
                            onPress: () => {
                                // Navigate back to My Products
                                navigation.navigate('SellerMyProducts');
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to update product');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryName = (id: number) => {
        const category = categories.find(c => c.id === id);
        return category ? category.name : 'Select Category';
    };

    const getImageDisplay = () => {
        if (image) return image;
        if (existingImage) return `${imageBaseUrl}${existingImage}`;
        return null;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading product details...</Text>
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
                <Text style={styles.storeTitle}>Edit Product</Text>
                <TouchableOpacity 
                    style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Image Upload */}
                    <View style={styles.imageSection}>
                        <Text style={styles.sectionLabel}>Product Image</Text>
                        <TouchableOpacity 
                            style={styles.imageUploadContainer}
                            onPress={() => setShowImageOptions(true)}
                        >
                            {getImageDisplay() ? (
                                <Image source={{ uri: getImageDisplay()! }} style={styles.productImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera-outline" size={50} color="#ccc" />
                                    <Text style={styles.imagePlaceholderText}>
                                        Tap to add image
                                    </Text>
                                    <Text style={styles.imagePlaceholderSubtext}>
                                        Camera or Gallery
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {existingImage && !image && (
                            <Text style={styles.imageHint}>Current image shown. Tap to change.</Text>
                        )}
                    </View>

                    {/* Product Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter product name"
                            value={name}
                            onChangeText={setName}
                            maxLength={100}
                        />
                        <Text style={styles.charCount}>{name.length}/100</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your product in detail"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{description.length}/500</Text>
                    </View>

                    {/* Category Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <TouchableOpacity 
                            style={styles.dropdown}
                            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                            <Text style={[styles.dropdownText, !categoryID && styles.dropdownPlaceholder]}>
                                {categoryID ? getCategoryName(categoryID) : 'Select Category'}
                            </Text>
                            <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                        </TouchableOpacity>
                        
                        {showCategoryDropdown && (
                            <View style={styles.dropdownListContainer}>
                                <ScrollView 
                                    style={styles.dropdownScrollView}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.dropdownItem,
                                                categoryID === cat.id && styles.dropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setCategoryID(cat.id);
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                categoryID === cat.id && styles.dropdownItemTextSelected
                                            ]}>
                                                {cat.name}
                                            </Text>
                                            {categoryID === cat.id && (
                                                <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Condition Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Condition *</Text>
                        <TouchableOpacity 
                            style={styles.dropdown}
                            onPress={() => setShowConditionDropdown(!showConditionDropdown)}
                        >
                            <Text style={styles.dropdownText}>{condition}</Text>
                            <Ionicons name={showConditionDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                        </TouchableOpacity>
                        
                        {showConditionDropdown && (
                            <View style={styles.dropdownList}>
                                {conditionOptions.map((cond) => (
                                    <TouchableOpacity
                                        key={cond}
                                        style={[
                                            styles.dropdownItem,
                                            condition === cond && styles.dropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setCondition(cond);
                                            setShowConditionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            condition === cond && styles.dropdownItemTextSelected
                                        ]}>
                                            {cond}
                                        </Text>
                                        {condition === cond && (
                                            <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Price */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price *</Text>
                        <View style={styles.priceContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={[styles.input, styles.priceInput]}
                                placeholder="0.00"
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Quantity */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantity *</Text>
                        <View style={styles.quantityContainer}>
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                    const val = parseInt(quantity) || 1;
                                    if (val > 1) setQuantity(String(val - 1));
                                }}
                            >
                                <Ionicons name="remove" size={20} color="#333" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.quantityInput}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                            />
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                    const val = parseInt(quantity) || 1;
                                    setQuantity(String(val + 1));
                                }}
                            >
                                <Ionicons name="add" size={20} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Status Display */}
                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>Current Status:</Text>
                        <View style={styles.statusBadge}>
                            <Ionicons 
                                name={product.status === 'approved' ? 'checkmark-circle' : 
                                      product.status === 'pending' ? 'time-outline' : 
                                      'close-circle'} 
                                size={16} 
                                color={product.status === 'approved' ? '#4CAF50' : 
                                       product.status === 'pending' ? '#FF9F43' : 
                                       '#FF6B6B'} 
                            />
                            <Text style={[
                                styles.statusText,
                                { color: product.status === 'approved' ? '#4CAF50' : 
                                         product.status === 'pending' ? '#FF9F43' : 
                                         '#FF6B6B' }
                            ]}>
                                {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                            </Text>
                        </View>
                        {product.status === 'rejected' && product.rejected_reason && (
                            <Text style={styles.rejectedReason}>
                                Reason: {product.rejected_reason}
                            </Text>
                        )}
                        <Text style={styles.statusNote}>
                            {product.status === 'pending' ? 'Changes will keep the product in pending status.' :
                             product.status === 'approved' ? 'Changes will require re-approval.' :
                             'Updates will resubmit for review.'}
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Image Options Modal */}
            <Modal
                visible={showImageOptions}
                transparent
                animationType="slide"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowImageOptions(false)}
                    />
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Product Image</Text>
                        <Text style={styles.modalSubtitle}>Choose an option</Text>
                        
                        <View style={styles.modalOptions}>
                            <TouchableOpacity 
                                style={styles.modalOption}
                                onPress={() => pickImage('camera')}
                            >
                                <View style={[styles.modalOptionIcon, { backgroundColor: '#e8f5e9' }]}>
                                    <Ionicons name="camera" size={30} color="#4CAF50" />
                                </View>
                                <Text style={styles.modalOptionText}>Take Photo</Text>
                                <Text style={styles.modalOptionSubtext}>Capture with camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.modalOption}
                                onPress={() => pickImage('gallery')}
                            >
                                <View style={[styles.modalOptionIcon, { backgroundColor: '#e3f2fd' }]}>
                                    <Ionicons name="images" size={30} color="#2196F3" />
                                </View>
                                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
                                <Text style={styles.modalOptionSubtext}>Select existing photo</Text>
                            </TouchableOpacity>
                        </View>

                        {existingImage && !image && (
                            <TouchableOpacity 
                                style={styles.modalRemoveOption}
                                onPress={() => {
                                    // Keep existing image
                                    setShowImageOptions(false);
                                }}
                            >
                                <Text style={styles.modalRemoveText}>Keep Current Image</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={styles.modalCancelButton}
                            onPress={() => setShowImageOptions(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
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
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    // Image Upload
    imageSection: {
        marginVertical: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    imageUploadContainer: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    imagePlaceholderSubtext: {
        fontSize: 12,
        color: '#bbb',
        marginTop: 4,
    },
    imageHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    // Dropdown
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
    },
    dropdownPlaceholder: {
        color: '#999',
    },
    dropdownListContainer: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        maxHeight: 200,
        overflow: 'hidden',
    },
    dropdownScrollView: {
        maxHeight: 200,
    },
    dropdownList: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemSelected: {
        backgroundColor: '#e8f5e9',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownItemTextSelected: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    // Price
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
    },
    // Quantity
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    quantityButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f9fa',
        borderRightWidth: 1,
        borderColor: '#eee',
    },
    quantityInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
        paddingVertical: 12,
    },
    // Status
    statusCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    statusLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    rejectedReason: {
        fontSize: 13,
        color: '#FF6B6B',
        marginTop: 4,
    },
    statusNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
        fontStyle: 'italic',
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
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 20,
    },
    modalOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    modalOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    modalOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    modalOptionSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    modalRemoveOption: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
    },
    modalRemoveText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    modalCancelButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
});

export default Seller_Edit_Product;