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
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, Category } from '../service/api_calls';

const Customer_Show_Category = ({ navigation }: any) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const imageBaseUrl = 'http://192.168.0.107/Thrift_Shop_api/';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCategoriesWithCounts();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  const handleCategoryPress = (categoryId: number, categoryName: string) => {
    navigation.navigate('BrowseCategorized', {
      categoryId: categoryId,
      categoryName: categoryName
    });
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;
    const productCount = item.productCount || 0;
    
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item.id, item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryCardContent}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.categoryImage} />
          ) : (
            <View style={[styles.categoryImage, styles.categoryImagePlaceholder]}>
              <Text style={styles.categoryImageText}>{item.name?.charAt(0) || '?'}</Text>
            </View>
          )}
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.name || 'Category'}</Text>
            <Text style={styles.productCountText}>
              {productCount} {productCount === 1 ? 'product' : 'products'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading categories...</Text>
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
        <Text style={styles.storeTitle}>All Categories</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="cart-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Browse Categories</Text>
          <Text style={styles.headerSubtitle}>
            {categories.length} categories available
          </Text>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={50} color="#ccc" />
            <Text style={styles.emptyStateText}>No categories available</Text>
          </View>
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  categoryImagePlaceholder: {
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productCountText: {
    fontSize: 13,
    color: '#888',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
});

export default Customer_Show_Category;