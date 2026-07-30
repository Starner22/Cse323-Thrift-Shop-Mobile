const API_URL = `http://192.168.0.107/Thrift_Shop_api/api`;

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


export interface ProductWithCategory extends Product {
  categoryName?: string;
}

// API Service
class ApiService {
  private async request<T>( endpoint: string, options: RequestInit = {}): 
  Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {    
        'Content-Type': 'application/json', ...options.headers,
      },
      ...options,
    });

    if (!response.ok)
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);

    return response.json();
  }

  // Get all categories
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/category.php');
  }

  // Get all approved products
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/product.php');
  }

  // Get products by category
  async getProductsByCategory(categoryID: number): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?category=${categoryID}`);
  }

  // Get product by ID
  async getProduct(productID: number): Promise<Product> {
    return this.request<Product>(`/product.php?id=${productID}`);
  }

  // Search products
  async searchProducts(query: string): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?search=${encodeURIComponent(query)}`);
  }
    async getProductsSorted(sort: string = 'name_asc'): Promise<Product[]> {
        try {
            const result = await this.request<Product[]>(`/products.php?sort=${sort}`);
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('Error fetching sorted products:', error);
            return [];
        }
    }

    async getProductsByCategorySorted(categoryID: number, sort: string = 'name_asc'): Promise<Product[]> {
        try {
            const result = await this.request<Product[]>(`/products.php?category=${categoryID}&sort=${sort}`);
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('Error fetching sorted products by category:', error);
            return [];
        }
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

    async getProductById(productId: number): Promise<Product | null> {
        try {
            const result = await this.request<Product>(`/product.php?id=${productId}`);
            return result || null;
        } catch (error) {
            console.error('Error fetching product by ID:', error);
            return null;
        }
    }

}

export const apiService = new ApiService();