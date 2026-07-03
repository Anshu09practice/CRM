package com.jalanjyothi.crm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "items", indices = [Index("category_id")])
data class ItemEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "sku_id") val skuId: String? = null,
    @ColumnInfo(name = "item_name") val itemName: String,
    @ColumnInfo(name = "package_quantity_grams") val packageQuantityGrams: Double,
    @ColumnInfo(name = "purchase_cost") val purchaseCost: Double,
    @ColumnInfo(name = "selling_price") val sellingPrice: Double,
    val mrp: Double? = null,
    @ColumnInfo(name = "packaging_style") val packagingStyle: String? = null,
    @ColumnInfo(name = "current_stock") val currentStock: Int = 0,
    @ColumnInfo(name = "low_stock_threshold") val lowStockThreshold: Int = 10,
    @ColumnInfo(name = "default_tax_percent") val defaultTaxPercent: Double? = null,
    @ColumnInfo(name = "category_id") val categoryId: Int? = null,
    @ColumnInfo(name = "category_name") val categoryName: String? = null,
    @ColumnInfo(name = "updated_at") val updatedAt: String? = null,
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val description: String? = null,
)

@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    @ColumnInfo(name = "credit_balance") val creditBalance: Double = 0.0,
    val notes: String? = null,
)

@Entity(tableName = "bills", indices = [Index("customer_id")])
data class BillEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "bill_number") val billNumber: String,
    @ColumnInfo(name = "customer_name") val customerName: String,
    @ColumnInfo(name = "customer_phone") val customerPhone: String? = null,
    @ColumnInfo(name = "customer_id") val customerId: Int? = null,
    val subtotal: Double,
    @ColumnInfo(name = "discount_percent") val discountPercent: Double = 0.0,
    @ColumnInfo(name = "discount_amount") val discountAmount: Double = 0.0,
    @ColumnInfo(name = "tax_percent") val taxPercent: Double = 0.0,
    val total: Double,
    @ColumnInfo(name = "amount_paid") val amountPaid: Double = 0.0,
    @ColumnInfo(name = "payment_status") val paymentStatus: String,
    @ColumnInfo(name = "bill_date") val billDate: String,
    val notes: String? = null,
)

@Entity(
    tableName = "bill_items",
    foreignKeys = [ForeignKey(
        entity = BillEntity::class,
        parentColumns = ["id"],
        childColumns = ["bill_id"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("bill_id"), Index("item_id")],
)
data class BillItemEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "bill_id") val billId: Int,
    @ColumnInfo(name = "item_id") val itemId: Int,
    @ColumnInfo(name = "item_name") val itemName: String,
    val quantity: Int,
    @ColumnInfo(name = "selling_price") val sellingPrice: Double,
    @ColumnInfo(name = "line_total") val lineTotal: Double,
)

@Entity(tableName = "expenses")
data class ExpenseEntity(
    @PrimaryKey val id: Int,
    val category: String,
    val amount: Double,
    val description: String? = null,
    @ColumnInfo(name = "expense_date") val expenseDate: String,
    @ColumnInfo(name = "created_by") val createdBy: String? = null,
)

@Entity(tableName = "purchases", indices = [Index("item_id")])
data class PurchaseEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "item_id") val itemId: Int,
    @ColumnInfo(name = "item_name") val itemName: String,
    val quantity: Int,
    @ColumnInfo(name = "purchase_cost") val purchaseCost: Double,
    @ColumnInfo(name = "total_cost") val totalCost: Double,
    @ColumnInfo(name = "purchase_date") val purchaseDate: String,
    val notes: String? = null,
)

// ─── Offline Mutation Queue ───────────────────────────────────────────────────

@Entity(tableName = "pending_mutations")
data class PendingMutation(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String, // "create_bill", "update_item", "delete_expense", etc.
    val entityType: String, // "bill", "item", "expense", etc.
    val entityId: Int? = null,
    val payload: String, // JSON serialized request body
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    val retries: Int = 0,
)

// ─── Local Auth ───────────────────────────────────────────────────────────────

@Entity(tableName = "local_users")
data class UserEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val username: String,
    @ColumnInfo(name = "password_hash") val passwordHash: String,
    val role: String = "owner",
    @ColumnInfo(name = "is_active") val isActive: Boolean = true,
    @ColumnInfo(name = "last_login") val lastLogin: String? = null,
    @ColumnInfo(name = "created_at") val createdAt: String,
)
