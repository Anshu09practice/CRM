package com.jalanjyothi.crm.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

@Serializable
data class LoginRequest(
    val username: String,
    val password: String? = null,
)

@Serializable
data class LoginResponse(
    val token: String? = null,
    @SerialName("refreshToken") val refreshToken: String? = null,
    val user: UserDto? = null,
    @SerialName("otp_sent") val otpSent: Boolean? = null,
    @SerialName("wa_url") val waUrl: String? = null,
)

@Serializable
data class RefreshRequest(
    @SerialName("refreshToken") val refreshToken: String,
)

@Serializable
data class RefreshResponse(
    val token: String,
    @SerialName("refreshToken") val refreshToken: String,
)

@Serializable
data class VerifyResponse(
    val valid: Boolean,
    val user: UserDto? = null,
)

@Serializable
data class UserDto(
    val id: Int,
    val username: String,
    val role: String,
)

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String,
    @SerialName("security_question") val securityQuestion: String,
    @SerialName("security_answer") val securityAnswer: String,
)

@Serializable
data class RegisterResponse(
    val message: String? = null,
)

/** Generic response for endpoints that return only a status/message (replaces Response<Unit>). */
@Serializable
data class GenericResponse(
    val message: String? = null,
)

@Serializable
data class StatusResponse(
    @SerialName("setup_required") val setupRequired: Boolean,
)

// ─── Dashboard DTOs ───────────────────────────────────────────────────────────

@Serializable
data class DashboardSummary(
    val today: TodaySummary,
    val monthly: MonthlySummary,
    @SerialName("pending_payments") val pendingPayments: PendingPayments,
    val inventory: InventorySummary,
    val customers: CustomersSummary,
)

@Serializable
data class TodaySummary(
    @SerialName("sales_count") val salesCount: Int,
    val revenue: Double,
)

@Serializable
data class MonthlySummary(
    val revenue: Double,
    @SerialName("sales_count") val salesCount: Int,
    @SerialName("prev_month_revenue") val prevMonthRevenue: Double,
    val expenses: Double,
    val purchases: Double,
    val profit: Double,
)

@Serializable
data class PendingPayments(
    val count: Int,
    val amount: Double,
)

@Serializable
data class InventorySummary(
    @SerialName("total_items") val totalItems: Int,
    @SerialName("stock_value") val stockValue: Double,
    @SerialName("low_stock_count") val lowStockCount: Int,
)

@Serializable
data class CustomersSummary(
    val total: Int,
)

@Serializable
data class SalesTrendItem(
    val date: String,
    val count: Int,
    val revenue: Double,
)

@Serializable
data class TopItemsResponse(
    val topItems: List<TopItem>,
    val bottomItems: List<TopItem>,
    val margins: List<MarginItem>,
)

@Serializable
data class TopItem(
    val id: Int,
    @SerialName("item_name") val itemName: String,
    @SerialName("total_qty") val totalQty: Int? = null,
    @SerialName("total_revenue") val totalRevenue: Double? = null,
)

@Serializable
data class MarginItem(
    val id: Int,
    @SerialName("item_name") val itemName: String,
    @SerialName("margin_percent") val marginPercent: Double,
)

// ─── Items DTOs ───────────────────────────────────────────────────────────────

@Serializable
data class ItemsResponse(
    val items: List<ItemDto>,
    val total: Int,
    val page: Int? = null,
    val limit: Int? = null,
    val totalPages: Int? = null,
)

@Serializable
data class ItemDto(
    val id: Int,
    @SerialName("sku_id") val skuId: String? = null,
    @SerialName("item_name") val itemName: String,
    @SerialName("package_quantity_grams") val packageQuantityGrams: Double = 0.0,
    @SerialName("purchase_cost") val purchaseCost: Double = 0.0,
    @SerialName("selling_price") val sellingPrice: Double = 0.0,
    val mrp: Double? = null,
    @SerialName("packaging_style") val packagingStyle: String? = null,
    @SerialName("current_stock") val currentStock: Int = 0,
    @SerialName("low_stock_threshold") val lowStockThreshold: Int = 10,
    @SerialName("default_tax_percent") val defaultTaxPercent: Double? = null,
    @SerialName("category_id") val categoryId: Int? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class CreateItemRequest(
    @SerialName("item_name") val itemName: String,
    @SerialName("package_quantity_grams") val packageQuantityGrams: Double,
    @SerialName("purchase_cost") val purchaseCost: Double,
    @SerialName("selling_price") val sellingPrice: Double,
    val mrp: Double? = null,
    @SerialName("packaging_style") val packagingStyle: String? = null,
    @SerialName("category_id") val categoryId: Int? = null,
    @SerialName("sku_id") val skuId: String? = null,
    @SerialName("current_stock") val currentStock: Int? = null,
    @SerialName("low_stock_threshold") val lowStockThreshold: Int? = null,
    @SerialName("default_tax_percent") val defaultTaxPercent: Double? = null,
)

// ─── Bills DTOs ───────────────────────────────────────────────────────────────

@Serializable
data class BillsResponse(
    val bills: List<BillDto>,
    val total: Int,
    val totalRevenue: Double? = null,
    val totalPending: Double? = null,
)

@Serializable
data class BillDto(
    val id: Int,
    @SerialName("bill_number") val billNumber: String,
    @SerialName("customer_name") val customerName: String,
    @SerialName("customer_phone") val customerPhone: String? = null,
    @SerialName("customer_id") val customerId: Int? = null,
    val subtotal: Double,
    @SerialName("discount_percent") val discountPercent: Double = 0.0,
    @SerialName("discount_amount") val discountAmount: Double = 0.0,
    @SerialName("tax_percent") val taxPercent: Double = 0.0,
    val total: Double,
    @SerialName("amount_paid") val amountPaid: Double = 0.0,
    @SerialName("payment_status") val paymentStatus: String,
    @SerialName("bill_date") val billDate: String,
    val notes: String? = null,
    val items: List<BillItemDto>? = null,
    val payments: List<PaymentDto>? = null,
)

@Serializable
data class BillItemDto(
    val id: Int,
    @SerialName("item_id") val itemId: Int,
    @SerialName("item_name") val itemName: String,
    val quantity: Int,
    @SerialName("selling_price") val sellingPrice: Double,
    @SerialName("line_total") val lineTotal: Double,
)

@Serializable
data class PaymentDto(
    val id: Int,
    val amount: Double,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("payment_date") val paymentDate: String,
    val notes: String? = null,
)

@Serializable
data class CreateBillRequest(
    @SerialName("customer_name") val customerName: String,
    @SerialName("customer_phone") val customerPhone: String? = null,
    @SerialName("customer_address") val customerAddress: String? = null,
    @SerialName("customer_id") val customerId: Int? = null,
    val items: List<BillLineItem>,
    @SerialName("discount_percent") val discountPercent: Double = 0.0,
    @SerialName("tax_percent") val taxPercent: Double? = null,
    val notes: String? = null,
    @SerialName("bill_date") val billDate: String? = null,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("amount_paid") val amountPaid: Double? = null,
)

@Serializable
data class BillLineItem(
    @SerialName("item_id") val itemId: Int,
    val quantity: Int,
    @SerialName("selling_price") val sellingPrice: Double? = null,
)

@Serializable
data class RecordPaymentRequest(
    val amount: Double,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("payment_date") val paymentDate: String? = null,
    val notes: String? = null,
)

// ─── Customers DTOs ───────────────────────────────────────────────────────────

@Serializable
data class CustomerDto(
    val id: Int,
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    @SerialName("credit_balance") val creditBalance: Double = 0.0,
    val notes: String? = null,
    val bills: List<BillDto>? = null,
    val totalSpent: Double? = null,
    val totalPaid: Double? = null,
)

@Serializable
data class CreateCustomerRequest(
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    val notes: String? = null,
)

// ─── Expenses DTOs ────────────────────────────────────────────────────────────

@Serializable
data class ExpensesResponse(
    val expenses: List<ExpenseDto>,
    val total: Int,
    val totalAmount: Double,
)

@Serializable
data class ExpenseDto(
    val id: Int,
    val category: String,
    val amount: Double,
    val description: String? = null,
    @SerialName("expense_date") val expenseDate: String,
    @SerialName("created_by") val createdBy: String? = null,
)

@Serializable
data class CreateExpenseRequest(
    val category: String,
    val amount: Double,
    val description: String? = null,
    @SerialName("expense_date") val expenseDate: String? = null,
)

// ─── Purchases DTOs ───────────────────────────────────────────────────────────

@Serializable
data class PurchasesResponse(
    val purchases: List<PurchaseDto>,
    val total: Int,
    val totalCost: Double,
    val totalQty: Int,
)

@Serializable
data class PurchaseDto(
    val id: Int,
    @SerialName("item_id") val itemId: Int,
    @SerialName("item_name") val itemName: String,
    val quantity: Int,
    @SerialName("package_quantity_grams") val packageQuantityGrams: Double? = null,
    @SerialName("purchase_cost") val purchaseCost: Double,
    @SerialName("total_cost") val totalCost: Double,
    @SerialName("packaging_style") val packagingStyle: String? = null,
    @SerialName("purchase_date") val purchaseDate: String,
    val notes: String? = null,
)

// ─── Categories DTOs ──────────────────────────────────────────────────────────

@Serializable
data class CategoryDto(
    val id: Int,
    val name: String,
    val description: String? = null,
)

// ─── Purchase Create Request ──────────────────────────────────────────────────

@Serializable
data class CreatePurchaseRequest(
    @SerialName("item_id") val itemId: Int,
    val quantity: Int,
    @SerialName("purchase_cost") val purchaseCost: Double? = null,
    @SerialName("purchase_date") val purchaseDate: String? = null,
    val notes: String? = null,
)

// ─── Bulk Update DTOs ─────────────────────────────────────────────────────────

@Serializable
data class BulkUpdateItemRequest(
    val id: Int? = null,
    @SerialName("sku_id") val skuId: String? = null,
    @SerialName("item_name") val itemName: String,
    @SerialName("package_quantity_grams") val packageQuantityGrams: Double = 0.0,
    @SerialName("purchase_cost") val purchaseCost: Double = 0.0,
    @SerialName("selling_price") val sellingPrice: Double = 0.0,
    val mrp: Double? = null,
    @SerialName("packaging_style") val packagingStyle: String? = null,
    val category: String? = null,
)

@Serializable
data class BulkUpdateItemsRequest(
    val items: List<BulkUpdateItemRequest>,
)

@Serializable
data class BulkUpdateResponse(
    val message: String? = null,
    val updated: Int = 0,
    val created: Int = 0,
    val errors: List<String> = emptyList(),
)
