import StorageService from './StorageService';

const API_URL = `http://192.168.0.107/Thrift_Shop_api/api`;
const AUTH_URL = `http://192.168.0.107/Thrift_Shop_api/auth`;

// Types
export interface Category {
  id: number;
  name: string;
  image: string;
  productCount?: number;
}

export interface Product {
  productID: number;
  name: string;
  description: string;
  price: number;
  condition: 'Excellent' | 'Good' | 'Normal' | 'Subpar';
  quantity: number;
  categoryID: number | null;
  categoryName?: string;
  image: string; 
  sellerID: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: {
        userID: number;
        name: string;
        email: string;
        role: 'Admin' | 'Moderator' | 'Seller' | 'Buyer';
    };
    message?: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
}

export interface ProductWithCategory extends Product {
  categoryName?: string;
}

// API Service
class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    console.log('Fetching:', url);
    
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if required
      if (requireAuth) {
        const token = await StorageService.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Token added to request');
        } else {
          throw new Error('Authentication required');
        }
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('Response status:', response.status);

      // Handle 401 issues
      if (response.status === 401) {
        console.log('🔒 Session expired');
        await StorageService.clearAll();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200));
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  // ========== AUTH REQUEST METHOD ==========


  private async authRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${AUTH_URL}${endpoint}`;
    console.log('Auth request:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        ...options,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200));
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.authRequest<LoginResponse>('/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.token) {
        await StorageService.storeToken(response.token);
        await StorageService.storeUser(response.user);
        console.log('Login successful');
      }

      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }


  async register(name: string, email: string, password: string): Promise<RegisterResponse> {
    try {
      return await this.authRequest<RegisterResponse>('/register.php', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  }


  async getCurrentUser(): Promise<any | null> {
    try {
      // check local storage
      const storedUser = await StorageService.getUser();
      if (storedUser) {
        return storedUser;
      }

      // If not, verify with server
      const token = await StorageService.getToken();
      if (!token) return null;

      const response = await this.authRequest<any>('/verify.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response && response.valid) {
        await StorageService.storeUser(response.user);
        return response.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    await StorageService.clearAll();
    console.log('Logout successful');
  }


  // ========== CATEGORY METHODS ==========

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/category.php');
  }

  async getCategoriesWithCounts(limit?: number): Promise<Category[]> {
    try {
      let endpoint = '/category.php?count=true';
      if (limit) {
        endpoint += `&limit=${limit}`;
      }
      const result = await this.request<Category[]>(endpoint);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching categories with counts:', error);
      return [];
    }
  }

  // ========== PRODUCT METHODS ==========

  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/product.php');
  }

  async getProductsByCategory(categoryID: number): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?category=${categoryID}`);
  }

  async getProduct(productID: number): Promise<Product> {
    return this.request<Product>(`/product.php?id=${productID}`);
  }

  async getProductById(productId: number): Promise<Product | null> {
    try {
      const result = await this.request<Product>(`/product.php?id=${productId}`);
      return result || null;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      return null;
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?search=${encodeURIComponent(query)}`);
  }

  async getProductsSorted(sort: string = 'name_asc'): Promise<Product[]> {
    try {
      const result = await this.request<Product[]>(`/product.php?sort=${sort}`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching sorted products:', error);
      return [];
    }
  }

  async getProductsByCategorySorted(categoryID: number, sort: string = 'name_asc'): Promise<Product[]> {
    try {
      const result = await this.request<Product[]>(`/product.php?category=${categoryID}&sort=${sort}`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching sorted products by category:', error);
      return [];
    }
  }

  // ========== WISHLIST METHODS ==========

  async getWishlist(): Promise<any[]> {
      try {
          return await this.request<any[]>('/wishlist.php', {}, true);
      } catch (error) {
          console.error('Error fetching wishlist:', error);
          return [];
      }
  }

  async addToWishlist(productId: number): Promise<any> {
      try {
          return await this.request<any>('/wishlist.php', {
              method: 'POST',
              body: JSON.stringify({ productId }),
          }, true);
      } catch (error) {
          console.error('Error adding to wishlist:', error);
          throw error;
      }
  }


  async removeFromWishlist(wishlistItemId: number): Promise<any> {
      try {
          return await this.request<any>('/wishlist.php', {
              method: 'DELETE',
              body: JSON.stringify({ wishlistItemId }),
          }, true);
      } catch (error) {
          console.error('Error removing from wishlist:', error);
          throw error;
      }
  }

  async isInWishlist(productId: number): Promise<boolean> {
      try {
          const wishlist = await this.getWishlist();
          return wishlist.some(item => item.productID === productId);
      } catch (error) {
          console.error('Error checking wishlist:', error);
          return false;
      }
  }
}

export const apiService = new ApiService();