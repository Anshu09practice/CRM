const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('jj_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// Types
export interface Item {
  id?: number;
  item_name: string;
  package_quantity_grams: number;
  purchase_cost: number;
  selling_price: number;
  mrp: number;
  packaging_style: 'packet' | 'standing_package';
  packets_per_bundle: number;
  bundle_weight_grams: number;
  category_id?: number | null;
  current_stock?: number;
  low_stock_threshold?: number;
  default_tax_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  item_count?: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  credit_balance: number;
  notes: string;
  created_at: string;
  updated_at: string;
  bills?: Bill[];
  totalSpent?: number;
  totalPaid?: number;
}

export interface Purchase {
  id: number;
  item_id: number;
  item_name: string;
  quantity: number;
  package_quantity_grams: number;
  purchase_cost: number;
  total_cost: number;
  packaging_style: string;
  purchase_date: string;
  notes: string;
  created_at: string;
}

export interface BillItem {
  id?: number;
  bill_id?: number;
  item_id: number;
  item_name: string;
  quantity: number;
  package_quantity_grams: number;
  selling_price: number;
  line_total: number;
}

export interface Payment {
  id: number;
  bill_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string;
  created_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_id?: number | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_total: number;
  total: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  amount_paid: number;
  bill_date: string;
  notes: string;
  whatsapp_sent: number;
  created_at: string;
  items?: BillItem[];
  payments?: Payment[];
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  created_by: string;
  created_at: string;
}

export interface DashboardSummary {
  today: { sales_count: number; revenue: number };
  monthly: { revenue: number; sales_count: number; prev_month_revenue: number; expenses: number; purchases: number; profit: number };
  pending_payments: { count: number; amount: number };
  inventory: { total_items: number; stock_value: number; low_stock_count: number };
  customers: { total: number };
}

export interface UserInfo {
  id: number;
  username: string;
  role: 'owner' | 'manager';
  is_active: number;
  last_login: string;
  created_at: string;
}

export interface ItemsResponse { items: Item[]; total: number; }
export interface PurchasesResponse { purchases: Purchase[]; total: number; totalCost: number; totalQty: number; }
export interface BillsResponse { bills: Bill[]; total: number; totalRevenue: number; totalPending: number; }
export interface CreatePurchaseInput { item_id: number; quantity: number; purchase_cost?: number; purchase_date?: string; notes?: string; }
export interface CreateBillInput {
  customer_name: string; customer_phone: string; customer_address: string; customer_id?: number | null;
  items: { item_id: number; quantity: number; selling_price?: number }[];
  discount_percent: number; tax_percent?: number; notes?: string; bill_date?: string;
  payment_method?: string; amount_paid?: number;
}
export interface StockItem { item_id: number; item_name: string; package_quantity_grams: number; selling_price: number; mrp: number; packaging_style: string; available_qty: number; }

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ===== Items =====
  async getItems(search?: string, packaging_style?: string, category_id?: string): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (packaging_style) params.set('packaging_style', packaging_style);
    if (category_id) params.set('category_id', category_id);
    const url = `${API_BASE}/items${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getItem(id: number): Promise<Item> {
    const res = await fetch(`${API_BASE}/items/${id}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createItem(item: Partial<Item>): Promise<Item> {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },

  async updateItem(id: number, item: Partial<Item>): Promise<Item> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async importItems(items: Partial<Item>[]): Promise<{ imported: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/items/import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items })
    });
    return handleResponse(res);
  },

  async bulkUpdate(items: Partial<Item>[]): Promise<{ updated: number; created: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/items/bulk-update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items })
    });
    return handleResponse(res);
  },

  async getLowStockItems(): Promise<ItemsResponse> {
    const res = await fetch(`${API_BASE}/items/low-stock`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Categories =====
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createCategory(data: { name: string; description?: string }): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCategory(id: number, data: { name: string; description?: string }): Promise<Category> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCategory(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Customers =====
  async getCustomers(search?: string): Promise<Customer[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/customers${params}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getCustomer(id: number): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createCustomer(data: { name: string; phone?: string; address?: string; notes?: string }): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCustomer(id: number, data: { name: string; phone?: string; address?: string; notes?: string }): Promise<Customer> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCustomer(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Purchases =====
  async getPurchases(params?: { item_id?: number; from_date?: string; to_date?: string; search?: string }): Promise<PurchasesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.item_id) searchParams.set('item_id', String(params.item_id));
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.search) searchParams.set('search', params.search);
    const url = `${API_BASE}/purchases${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createPurchase(data: CreatePurchaseInput): Promise<Purchase> {
    const res = await fetch(`${API_BASE}/purchases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updatePurchase(id: number, data: CreatePurchaseInput): Promise<Purchase> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deletePurchase(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Bills =====
  async getBills(params?: { from_date?: string; to_date?: string; search?: string; payment_status?: string }): Promise<BillsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.payment_status) searchParams.set('payment_status', params.payment_status);
    const url = `${API_BASE}/bills${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getBill(id: number): Promise<Bill> {
    const res = await fetch(`${API_BASE}/bills/${id}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getAvailableStock(): Promise<{ stock: StockItem[] }> {
    const res = await fetch(`${API_BASE}/bills/stock/available`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createBill(data: CreateBillInput): Promise<Bill> {
    const res = await fetch(`${API_BASE}/bills`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateBill(id: number, data: CreateBillInput): Promise<Bill> {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async recordPayment(billId: number, data: { amount: number; payment_method: string; payment_date?: string; notes?: string }): Promise<Bill> {
    const res = await fetch(`${API_BASE}/bills/${billId}/payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async markWhatsAppSent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${id}/whatsapp`, { method: 'PATCH', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async deleteBill(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Dashboard =====
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getTopItems(period?: string): Promise<{ topItems: any[]; bottomItems: any[]; margins: any[] }> {
    const params = period ? `?period=${period}` : '';
    const res = await fetch(`${API_BASE}/dashboard/top-items${params}`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getSalesTrend(): Promise<{ date: string; count: number; revenue: number }[]> {
    const res = await fetch(`${API_BASE}/dashboard/sales-trend`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getLowStockDashboard(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/dashboard/low-stock`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Expenses =====
  async getExpenses(params?: { from_date?: string; to_date?: string; category?: string }): Promise<{ expenses: Expense[]; total: number; totalAmount: number }> {
    const searchParams = new URLSearchParams();
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.category) searchParams.set('category', params.category);
    const url = `${API_BASE}/expenses${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async getExpenseCategories(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/expenses/categories`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createExpense(data: { category: string; amount: number; description?: string; expense_date?: string }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateExpense(id: number, data: { category: string; amount: number; description?: string; expense_date?: string }): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteExpense(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Users (Owner only) =====
  async getUsers(): Promise<UserInfo[]> {
    const res = await fetch(`${API_BASE}/auth/users`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async createUser(data: { username: string; password: string; role: string; security_question?: string; security_answer?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUser(id: number, data: { role?: string; is_active?: boolean; password?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteUser(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  // ===== Auth Helpers =====
  async forgotPassword(username: string, security_answer?: string, new_password?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, security_answer, new_password })
    });
    return handleResponse(res);
  },

  async changePassword(current_password: string, new_password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ current_password, new_password })
    });
    return handleResponse(res);
  },

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    return handleResponse(res);
  },

  // ===== Excel =====
  async parseExcel(file: File): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/excel/parse`, { method: 'POST', headers: { ...getAuthHeaders() }, body: formData });
    return handleResponse(res);
  },

  async getSourceFiles(): Promise<{ files: { name: string; size: number; modified: string }[] }> {
    const res = await fetch(`${API_BASE}/excel/source-files`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async parseSourceFile(filename: string): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    const res = await fetch(`${API_BASE}/excel/parse-source`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ filename })
    });
    return handleResponse(res);
  },

  // ===== Backup =====
  async createBackup(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/backup/export`, { method: 'POST', headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async restoreBackup(data: any): Promise<{ message: string; restored: number }> {
    const res = await fetch(`${API_BASE}/backup/restore`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  getTemplateCsvUrl(): string { return `${API_BASE}/items/template/csv`; },
  getExportCsvUrl(): string { return `${API_BASE}/items/export/csv`; },

  async downloadWithAuth(url: string, filename: string): Promise<void> {
    const res = await fetch(url, { headers: { ...getAuthHeaders() } });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
