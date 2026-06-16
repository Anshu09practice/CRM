const API_BASE = '/api';

/**
 * Get auth token from localStorage
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('jj_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

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
  created_at?: string;
  updated_at?: string;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
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

export interface CreatePurchaseInput {
  item_id: number;
  quantity: number;
  purchase_cost?: number;
  purchase_date?: string;
  notes?: string;
}

export interface PurchasesResponse {
  purchases: Purchase[];
  total: number;
  totalCost: number;
  totalQty: number;
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

export interface Bill {
  id: number;
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total: number;
  bill_date: string;
  notes: string;
  whatsapp_sent: number;
  created_at: string;
  items?: BillItem[];
}

export interface CreateBillInput {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: { item_id: number; quantity: number; selling_price?: number }[];
  discount_percent: number;
  notes?: string;
  bill_date?: string;
}

export interface StockItem {
  item_id: number;
  item_name: string;
  package_quantity_grams: number;
  selling_price: number;
  mrp: number;
  packaging_style: string;
  purchased_qty: number;
  billed_qty: number;
  available_qty: number;
}

export interface BillsResponse {
  bills: Bill[];
  total: number;
  totalRevenue: number;
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Items CRUD
  async getItems(search?: string, packaging_style?: string): Promise<ItemsResponse> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (packaging_style) params.set('packaging_style', packaging_style);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },

  async updateItem(id: number, item: Partial<Item>): Promise<Item> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(item)
    });
    return handleResponse(res);
  },

  async deleteItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return handleResponse(res);
  },

  async importItems(items: Partial<Item>[]): Promise<{ imported: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/items/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items })
    });
    return handleResponse(res);
  },

  // Excel
  async parseExcel(file: File): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/excel/parse`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });
    return handleResponse(res);
  },

  async getSourceFiles(): Promise<{ files: { name: string; size: number; modified: string }[] }> {
    const res = await fetch(`${API_BASE}/excel/source-files`, { headers: { ...getAuthHeaders() } });
    return handleResponse(res);
  },

  async parseSourceFile(filename: string): Promise<{ headers: string[]; rows: any[]; total_rows: number }> {
    const res = await fetch(`${API_BASE}/excel/parse-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ filename })
    });
    return handleResponse(res);
  },

  // Backup
  async createBackup(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/backup/export`, {
      method: 'POST',
      headers: { ...getAuthHeaders() }
    });
    return handleResponse(res);
  },

  async restoreBackup(data: any): Promise<{ message: string; restored: number }> {
    const res = await fetch(`${API_BASE}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // CSV Bulk Update
  async bulkUpdate(items: Partial<Item>[]): Promise<{ updated: number; created: number; errors: string[] }> {
    const res = await fetch(`${API_BASE}/items/bulk-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ items })
    });
    return handleResponse(res);
  },

  // CSV Template & Export
  getTemplateCsvUrl(): string {
    return `${API_BASE}/items/template/csv`;
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/items/export/csv`;
  },

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

  // Purchases
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updatePurchase(id: number, data: CreatePurchaseInput): Promise<Purchase> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deletePurchase(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return handleResponse(res);
  },

  // Bills
  async getBills(params?: { from_date?: string; to_date?: string; search?: string }): Promise<BillsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.search) searchParams.set('search', params.search);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateBill(id: number, data: CreateBillInput): Promise<Bill> {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async markWhatsAppSent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${id}/whatsapp`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders() }
    });
    return handleResponse(res);
  },

  async deleteBill(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/bills/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return handleResponse(res);
  }
};
