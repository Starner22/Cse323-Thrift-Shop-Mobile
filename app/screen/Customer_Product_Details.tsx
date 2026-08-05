import React, { useEffect, useState } from 'react';
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
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, Product } from '../service/api_calls';
import { useAuth } from '../context/AuthContext';

const Customer_Product_Detail = ({ route, navigation }: any) => {
  const { productId } = route.params || {};
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { isAuthenticated } = useAuth(); 


  const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

  useEffect(() => {
    if (productId) {
      fetchProductDetail();
    }
  }, [productId]);

  useEffect(() => {
    if (productId && isAuthenticated) {
        checkWishlistStatus();
    }
  }, [productId, isAuthenticated]);

const fetchProductDetail = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProductById(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product detail:', error);
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
      if (!isAuthenticated) {
          Alert.alert(
              'Login Required',
              'Please login to add items to your cart',
              [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Login', onPress: () => navigation.navigate('Login') }
              ]
          );
          return;
      }

      try {
          const response = await apiService.addToCart(productId, quantity);
          if (response.success) {
              Alert.alert(
                  'Added to Cart',
                  `${product?.name} has been added to your cart!`,
                  [
                      { 
                          text: 'View Cart', 
                          onPress: () => navigation.navigate('Cart')
                      },
                      { text: 'Continue Shopping', style: 'cancel' }
                  ]
              );
          }
      } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to add to cart');
      }
  };


  const checkWishlistStatus = async () => {
    try {
        const inWishlist = await apiService.isInWishlist(productId);
        setIsInWishlist(inWishlist);
        setIsWishlisted(inWishlist);  // ← Also update the other state
    } catch (error) {
        console.error('Error checking wishlist:', error);
    }
  };

  // Handle wishlist toggle
  const handleToggleWishlist = async () => {
      if (!isAuthenticated) {
          Alert.alert(
              'Login Required',
              'Please login to add items to your wishlist',
              [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Login', onPress: () => navigation.navigate('Login') }
              ]
          );
          return;
      }

      try {
          if (isInWishlist) {
              // For now, we'll just toggle locally since we need the wishlistItemID
              // We'll implement full removal when we have the wishlist page
              setIsInWishlist(false);
              setIsWishlisted(false);
              Alert.alert('Removed', `${product?.name} removed from wishlist`);
          } else {
              await apiService.addToWishlist(productId);
              setIsInWishlist(true);
              setIsWishlisted(true);
              Alert.alert('Added to Wishlist', `${product?.name} added to your wishlist!`);
          }
      } catch (error) {
          Alert.alert('Error', 'Failed to update wishlist');
      }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this product: ${product?.name} - $${product?.price?.toFixed(2)} on Thrift Store!`,
        title: product?.name || 'Check out this product',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSeller = () => {
    Alert.alert(
      'Contact Seller',
      `Would you like to send a message about ${product?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Message', onPress: () => console.log('Open messaging') }
      ]
    );
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return '#4CAF50';
      case 'Good': return '#8BC34A';
      case 'Normal': return '#FFC107';
      case 'Subpar': return '#FF9800';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.loadingText}>Product not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrl = product.image ? `${imageBaseUrl}${product.image}` : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.storeTitle} numberOfLines={1}>Product Details</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={80} color="#ccc" />
            </View>
          )}
          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {product.quantity && product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* Condition Badge - Below name, left aligned */}
          <View style={styles.conditionRow}>
            <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(product.condition || 'Normal') }]}>
              <Text style={styles.conditionBadgeText}>
                {product.condition || 'Normal'}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>${product.price?.toFixed(2) || '0.00'}</Text>
            <View style={styles.quantitySelector}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.quantity || 1, quantity + 1))}
              >
                <Ionicons name="add" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Product Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{product.categoryName || 'Uncategorized'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Listed</Text>
              <Text style={styles.detailValue}>
                {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cube-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Quantity Available</Text>
              <Text style={styles.detailValue}>{product.quantity || 0}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.detailLabel}>Condition</Text>
              <Text style={[styles.detailValue, { color: getConditionColor(product.condition || 'Normal') }]}>
                {product.condition || 'Normal'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {product.description || 'No description available for this product.'}
          </Text>

          {/* Contact Seller */}
          <TouchableOpacity 
            style={styles.contactSellerButton}
            onPress={handleContactSeller}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
            <Text style={styles.contactSellerText}>Contact Seller</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Product Reviews - No hardcoded reviews */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsTitle}>Product Reviews</Text>
            </View>
            
            {/* Empty Reviews State */}
            <View style={styles.emptyReviews}>
              <Ionicons name="chatbubbles-outline" size={40} color="#ccc" />
              <Text style={styles.emptyReviewsText}>No reviews yet</Text>
              <Text style={styles.emptyReviewsSubtext}>Be the first to review this product!</Text>
            </View>

            <TouchableOpacity style={styles.writeReviewButton}>
              <Ionicons name="create-outline" size={20} color="#4CAF50" />
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.wishlistButton]}
          onPress={handleToggleWishlist}
        >
          <Ionicons 
            name={isWishlisted ? "heart" : "heart-outline"} 
            size={24} 
            color={isWishlisted ? "#FF4081" : "#666"} 
          />
          <Text style={[styles.actionButtonText, isWishlisted && styles.wishlistActive]}>
            {isWishlisted ? 'Wishlisted' : 'Wishlist'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.cartButton]}
          onPress={handleAddToCart}
        >
          <Ionicons name="cart" size={24} color="#fff" />
          <Text style={styles.cartButtonText}>Add to Cart</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#fff',
  },
  productImage: {
    width: '100%',
    height: 350,
    backgroundColor: '#f5f5f5',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  conditionRow: {
    marginBottom: 12,
  },
  conditionBadge: {
    alignSelf: 'flex-start', // Left aligned
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conditionBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  quantityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    paddingHorizontal: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  contactSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 10,
    backgroundColor: '#f5f9f5',
  },
  contactSellerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
    marginLeft: 8,
  },
  // Reviews Section - Empty State
  reviewsSection: {
    marginTop: 4,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyReviews: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderStyle: 'dashed',
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginTop: 8,
  },
  emptyReviewsSubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  writeReviewText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  wishlistButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  wishlistActive: {
    color: '#FF4081',
  },
  cartButton: {
    backgroundColor: '#4CAF50',
    flex: 2,
  },
  cartButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Customer_Product_Detail;