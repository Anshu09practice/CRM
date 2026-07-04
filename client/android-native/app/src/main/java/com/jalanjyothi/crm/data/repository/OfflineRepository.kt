package com.jalanjyothi.crm.data.repository

import com.jalanjyothi.crm.data.local.dao.BillDao
import com.jalanjyothi.crm.data.local.dao.CategoryDao
import com.jalanjyothi.crm.data.local.dao.CustomerDao
import com.jalanjyothi.crm.data.local.dao.ExpenseDao
import com.jalanjyothi.crm.data.local.dao.ItemDao
import com.jalanjyothi.crm.data.local.dao.MutationDao
import com.jalanjyothi.crm.data.local.dao.PurchaseDao
import com.jalanjyothi.crm.data.local.entity.BillEntity
import com.jalanjyothi.crm.data.local.entity.CategoryEntity
import com.jalanjyothi.crm.data.local.entity.CustomerEntity
import com.jalanjyothi.crm.data.local.entity.ExpenseEntity
import com.jalanjyothi.crm.data.local.entity.ItemEntity
import com.jalanjyothi.crm.data.local.entity.PendingMutation
import com.jalanjyothi.crm.data.local.entity.PurchaseEntity
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.CustomersSummary
import com.jalanjyothi.crm.data.remote.DashboardSummary
import com.jalanjyothi.crm.data.remote.InventorySummary
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.remote.MonthlySummary
import com.jalanjyothi.crm.data.remote.PendingPayments
import com.jalanjyothi.crm.data.remote.TodaySummary
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.Json
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Offline-first repository: Room is single source of truth.
 * Network calls update Room; UI observes Room flows.
 * Mutations are queued when offline and synced when connectivity returns.
 */
@Singleton
class OfflineRepository @Inject constructor(
    private val api: ApiService,
    private val itemDao: ItemDao,
    private val categoryDao: CategoryDao,
    private val customerDao: CustomerDao,
    private val billDao: BillDao,
    private val expenseDao: ExpenseDao,
    private val purchaseDao: PurchaseDao,
    private val mutationDao: MutationDao,
    private val json: Json,
) {
    // ─── Items ────────────────────────────────────────────────────────────────

    fun observeItems(): Flow<List<ItemEntity>> = itemDao.getAll()
    fun searchItems(query: String): Flow<List<ItemEntity>> = itemDao.search(query)
    fun observeLowStock(): Flow<List<ItemEntity>> = itemDao.getLowStock()
    fun observeAvailableStock(): Flow<List<ItemEntity>> = itemDao.getAvailableStock()

    suspend fun syncItems() {
        try {
            val response = api.getItems(limit = 1000)
            val entities = response.items.map {
                ItemEntity(
                    id = it.id,
                    skuId = it.skuId,
                    itemName = it.itemName,
                    packageQuantityGrams = it.packageQuantityGrams,
                    purchaseCost = it.purchaseCost,
                    sellingPrice = it.sellingPrice,
                    mrp = it.mrp,
                    packagingStyle = it.packagingStyle,
                    currentStock = it.currentStock,
                    lowStockThreshold = it.lowStockThreshold,
                    defaultTaxPercent = it.defaultTaxPercent,
                    categoryId = it.categoryId,
                    categoryName = it.categoryName,
                    updatedAt = it.updatedAt,
                )
            }
            itemDao.deleteAll()
            itemDao.insertAll(entities)
        } catch (_: Exception) { /* Use cached data */ }
    }

    // ─── Categories ───────────────────────────────────────────────────────────

    fun observeCategories(): Flow<List<CategoryEntity>> = categoryDao.getAll()

    suspend fun syncCategories() {
        try {
            val categories = api.getCategories()
            val entities = categories.map { CategoryEntity(it.id, it.name, it.description) }
            categoryDao.deleteAll()
            categoryDao.insertAll(entities)
        } catch (_: Exception) { }
    }

    // ─── Customers ────────────────────────────────────────────────────────────

    fun observeCustomers(): Flow<List<CustomerEntity>> = customerDao.getAll()
    fun searchCustomers(query: String): Flow<List<CustomerEntity>> = customerDao.search(query)

    suspend fun syncCustomers() {
        try {
            val customers = api.getCustomers()
            val entities = customers.map {
                CustomerEntity(
                    id = it.id,
                    name = it.name,
                    phone = it.phone,
                    address = it.address,
                    creditBalance = it.creditBalance,
                    notes = it.notes,
                )
            }
            customerDao.deleteAll()
            customerDao.insertAll(entities)
        } catch (_: Exception) { }
    }

    // ─── Bills ────────────────────────────────────────────────────────────────

    fun observeBills(): Flow<List<BillEntity>> = billDao.getAll()
    fun searchBills(query: String): Flow<List<BillEntity>> = billDao.search(query)
    fun observeBillsByStatus(status: String): Flow<List<BillEntity>> = billDao.getByStatus(status)

    suspend fun syncBills() {
        try {
            val response = api.getBills()
            val entities = response.bills.map {
                BillEntity(
                    id = it.id,
                    billNumber = it.billNumber,
                    customerName = it.customerName,
                    customerPhone = it.customerPhone,
                    customerId = it.customerId,
                    subtotal = it.subtotal,
                    discountPercent = it.discountPercent,
                    discountAmount = it.discountAmount,
                    taxPercent = it.taxPercent,
                    total = it.total,
                    amountPaid = it.amountPaid,
                    paymentStatus = it.paymentStatus,
                    billDate = it.billDate,
                    notes = it.notes,
                )
            }
            billDao.deleteAll()
            billDao.insertAll(entities)
        } catch (_: Exception) { }
    }

    // ─── Expenses ─────────────────────────────────────────────────────────────

    fun observeExpenses(): Flow<List<ExpenseEntity>> = expenseDao.getAll()

    suspend fun syncExpenses() {
        try {
            val response = api.getExpenses()
            val entities = response.expenses.map {
                ExpenseEntity(
                    id = it.id,
                    category = it.category,
                    amount = it.amount,
                    description = it.description,
                    expenseDate = it.expenseDate,
                    createdBy = it.createdBy,
                )
            }
            expenseDao.deleteAll()
            expenseDao.insertAll(entities)
        } catch (_: Exception) { }
    }

    // ─── Local Dashboard (offline fallback) ──────────────────────────────────

    suspend fun computeLocalDashboard(): DashboardSummary {
        val today = LocalDate.now().toString()                       // "2025-07-04"
        val currentMonth = today.substring(0, 7)                    // "2025-07"
        val prevMonth = LocalDate.now().minusMonths(1).toString().substring(0, 7)

        val todayRevenue   = billDao.getRevenueForDate(today)
        val todayCount     = billDao.getSalesCountForDate(today)
        val monthRevenue   = billDao.getRevenueForMonth(currentMonth)
        val monthCount     = billDao.getSalesCountForMonth(currentMonth)
        val prevRevenue    = billDao.getRevenueForMonth(prevMonth)
        val monthExpenses  = expenseDao.getTotalForMonth(currentMonth)
        val monthPurchases = purchaseDao.getTotalCostForMonth(currentMonth)
        val pendingAmt     = billDao.getTotalPending()
        val pendingCnt     = billDao.getPendingCount()
        val itemCount      = itemDao.getCount()
        val lowStockCount  = itemDao.getLowStockCount()
        val stockValue     = itemDao.getStockValue()
        val customerCount  = customerDao.getCount()

        return DashboardSummary(
            today = TodaySummary(salesCount = todayCount, revenue = todayRevenue),
            monthly = MonthlySummary(
                revenue = monthRevenue,
                salesCount = monthCount,
                prevMonthRevenue = prevRevenue,
                expenses = monthExpenses,
                purchases = monthPurchases,
                profit = monthRevenue - monthExpenses - monthPurchases,
            ),
            pendingPayments = PendingPayments(count = pendingCnt, amount = pendingAmt),
            inventory = InventorySummary(
                totalItems = itemCount,
                stockValue = stockValue,
                lowStockCount = lowStockCount,
            ),
            customers = CustomersSummary(total = customerCount),
        )
    }

    suspend fun getLocalLowStockItems(): List<ItemDto> =
        itemDao.getLowStockList().map { it.toItemDto() }

    // ─── Sync All ─────────────────────────────────────────────────────────────

    suspend fun syncAll() {
        syncCategories()
        syncItems()
        syncCustomers()
        syncBills()
        syncExpenses()
    }

    // ─── Offline Mutations ────────────────────────────────────────────────────

    suspend fun queueMutation(type: String, entityType: String, entityId: Int?, payload: String) {
        mutationDao.insert(
            PendingMutation(
                type = type,
                entityType = entityType,
                entityId = entityId,
                payload = payload,
            )
        )
    }

    suspend fun processPendingMutations(): Int {
        val mutations = mutationDao.getAll()
        var processed = 0

        for (mutation in mutations) {
            try {
                executeMutation(mutation)
                mutationDao.delete(mutation.id)
                processed++
            } catch (e: Exception) {
                mutationDao.incrementRetry(mutation.id)
            }
        }

        mutationDao.deleteStaleRetries()
        return processed
    }

    fun observePendingCount(): Flow<Int> = mutationDao.getPendingCount()

    private suspend fun executeMutation(mutation: PendingMutation) {
        // Execute queued mutations against server
        // This handles offline-created bills, items, expenses etc.
        when (mutation.type) {
            "create_bill" -> {
                val request = json.decodeFromString<com.jalanjyothi.crm.data.remote.CreateBillRequest>(mutation.payload)
                api.createBill(request)
            }
            "create_item" -> {
                val request = json.decodeFromString<com.jalanjyothi.crm.data.remote.CreateItemRequest>(mutation.payload)
                api.createItem(request)
            }
            "create_expense" -> {
                val request = json.decodeFromString<com.jalanjyothi.crm.data.remote.CreateExpenseRequest>(mutation.payload)
                api.createExpense(request)
            }
            "delete_bill" -> {
                mutation.entityId?.let { api.deleteBill(it) }
            }
            "delete_item" -> {
                mutation.entityId?.let { api.deleteItem(it) }
            }
            "delete_expense" -> {
                mutation.entityId?.let { api.deleteExpense(it) }
            }
        }
    }
}

// ─── Entity → DTO mapper (shared utility) ─────────────────────────────────────

fun ItemEntity.toItemDto() = ItemDto(
    id = id,
    skuId = skuId,
    itemName = itemName,
    packageQuantityGrams = packageQuantityGrams,
    purchaseCost = purchaseCost,
    sellingPrice = sellingPrice,
    mrp = mrp,
    packagingStyle = packagingStyle,
    currentStock = currentStock,
    lowStockThreshold = lowStockThreshold,
    defaultTaxPercent = defaultTaxPercent,
    categoryId = categoryId,
    categoryName = categoryName,
)
