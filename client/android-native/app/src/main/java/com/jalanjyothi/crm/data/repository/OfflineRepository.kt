package com.jalanjyothi.crm.data.repository

import android.content.Context
import com.jalanjyothi.crm.data.local.dao.BillDao
import com.jalanjyothi.crm.data.local.dao.CategoryDao
import com.jalanjyothi.crm.data.local.dao.CustomerDao
import com.jalanjyothi.crm.data.local.dao.ExpenseDao
import com.jalanjyothi.crm.data.local.dao.ItemDao
import com.jalanjyothi.crm.data.local.dao.MutationDao
import com.jalanjyothi.crm.data.local.dao.PurchaseDao
import com.jalanjyothi.crm.data.local.entity.BillEntity
import com.jalanjyothi.crm.data.local.entity.BillItemEntity
import com.jalanjyothi.crm.data.local.entity.CategoryEntity
import com.jalanjyothi.crm.data.local.entity.CustomerEntity
import com.jalanjyothi.crm.data.local.entity.ExpenseEntity
import com.jalanjyothi.crm.data.local.entity.ItemEntity
import com.jalanjyothi.crm.data.local.entity.PendingMutation
import com.jalanjyothi.crm.data.local.entity.PurchaseEntity
import com.jalanjyothi.crm.data.remote.ApiService
import com.jalanjyothi.crm.data.remote.BillDto
import com.jalanjyothi.crm.data.remote.BillItemDto
import com.jalanjyothi.crm.data.remote.CreateBillRequest
import com.jalanjyothi.crm.data.remote.CreateExpenseRequest
import com.jalanjyothi.crm.data.remote.CreateItemRequest
import com.jalanjyothi.crm.data.remote.CreatePurchaseRequest
import com.jalanjyothi.crm.data.remote.CustomerDto
import com.jalanjyothi.crm.data.remote.CustomersSummary
import com.jalanjyothi.crm.data.remote.DashboardSummary
import com.jalanjyothi.crm.data.remote.InventorySummary
import com.jalanjyothi.crm.data.remote.ItemDto
import com.jalanjyothi.crm.data.remote.MonthlySummary
import com.jalanjyothi.crm.data.remote.PendingPayments
import com.jalanjyothi.crm.data.remote.PurchaseDto
import com.jalanjyothi.crm.data.remote.TodaySummary
import com.jalanjyothi.crm.data.sync.SyncWorker
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.encodeToString
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
    @ApplicationContext private val context: Context,
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

    suspend fun getItemById(id: Int): ItemEntity? = itemDao.getById(id)

    /**
     * Creates an item locally (Room is the source of truth) and queues a mutation
     * so it syncs to the server whenever connectivity is available. Works fully offline.
     */
    suspend fun createItemLocal(request: CreateItemRequest): ItemEntity {
        val categoryName = request.categoryId?.let { categoryDao.getById(it)?.name }
        val entity = ItemEntity(
            id = generateLocalId(),
            skuId = request.skuId,
            itemName = request.itemName,
            packageQuantityGrams = request.packageQuantityGrams,
            purchaseCost = request.purchaseCost,
            sellingPrice = request.sellingPrice,
            mrp = request.mrp,
            packagingStyle = request.packagingStyle,
            currentStock = request.currentStock ?: 0,
            lowStockThreshold = request.lowStockThreshold ?: 10,
            defaultTaxPercent = request.defaultTaxPercent,
            categoryId = request.categoryId,
            categoryName = categoryName,
        )
        itemDao.insert(entity)
        queueCreateOrUpdate("item", entity.id, json.encodeToString(request))
        return entity
    }

    suspend fun updateItemLocal(id: Int, request: CreateItemRequest): ItemEntity? {
        val existing = itemDao.getById(id) ?: return null
        val categoryName = request.categoryId?.let { categoryDao.getById(it)?.name } ?: existing.categoryName
        val updated = existing.copy(
            skuId = request.skuId,
            itemName = request.itemName,
            packageQuantityGrams = request.packageQuantityGrams,
            purchaseCost = request.purchaseCost,
            sellingPrice = request.sellingPrice,
            mrp = request.mrp,
            packagingStyle = request.packagingStyle,
            currentStock = request.currentStock ?: existing.currentStock,
            lowStockThreshold = request.lowStockThreshold ?: existing.lowStockThreshold,
            defaultTaxPercent = request.defaultTaxPercent,
            categoryId = request.categoryId,
            categoryName = categoryName,
        )
        itemDao.insert(updated)
        queueCreateOrUpdate("item", id, json.encodeToString(request))
        return updated
    }

    /**
     * Applies just the pricing fields (used by bulk price update), preserving
     * everything else about the item as-is.
     */
    suspend fun updateItemPricingLocal(id: Int, purchaseCost: Double, sellingPrice: Double, mrp: Double?): ItemEntity? {
        val existing = itemDao.getById(id) ?: return null
        val updated = existing.copy(purchaseCost = purchaseCost, sellingPrice = sellingPrice, mrp = mrp)
        itemDao.insert(updated)
        val request = CreateItemRequest(
            itemName = updated.itemName,
            packageQuantityGrams = updated.packageQuantityGrams,
            purchaseCost = updated.purchaseCost,
            sellingPrice = updated.sellingPrice,
            mrp = updated.mrp,
            packagingStyle = updated.packagingStyle,
            categoryId = updated.categoryId,
            skuId = updated.skuId,
            currentStock = updated.currentStock,
            lowStockThreshold = updated.lowStockThreshold,
            defaultTaxPercent = updated.defaultTaxPercent,
        )
        queueCreateOrUpdate("item", id, json.encodeToString(request))
        return updated
    }

    suspend fun deleteItemLocal(id: Int) {
        itemDao.delete(id)
        queueDelete("item", id)
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

    suspend fun getBillById(id: Int): BillDto? {
        val bill = billDao.getById(id) ?: return null
        val items = billDao.getBillItems(id)
        return BillDto(
            id = bill.id,
            billNumber = bill.billNumber,
            customerName = bill.customerName,
            customerPhone = bill.customerPhone,
            customerId = bill.customerId,
            subtotal = bill.subtotal,
            discountPercent = bill.discountPercent,
            discountAmount = bill.discountAmount,
            taxPercent = bill.taxPercent,
            total = bill.total,
            amountPaid = bill.amountPaid,
            paymentStatus = bill.paymentStatus,
            billDate = bill.billDate,
            notes = bill.notes,
            items = items.map {
                BillItemDto(
                    id = it.id,
                    itemId = it.itemId,
                    itemName = it.itemName,
                    quantity = it.quantity,
                    sellingPrice = it.sellingPrice,
                    lineTotal = it.lineTotal,
                )
            },
            payments = null,
        )
    }

    /**
     * Creates a bill fully offline: writes the bill + line items to Room, decrements
     * item stock immediately, and queues a mutation to push it to the server later.
     */
    suspend fun createBillLocal(request: CreateBillRequest): BillEntity {
        val billId = generateLocalId()
        var subtotal = 0.0
        val lineEntities = request.items.map { line ->
            val item = itemDao.getById(line.itemId)
            val price = line.sellingPrice ?: item?.sellingPrice ?: 0.0
            val lineTotal = price * line.quantity
            subtotal += lineTotal
            if (item != null) {
                itemDao.insert(item.copy(currentStock = (item.currentStock - line.quantity).coerceAtLeast(0)))
            }
            BillItemEntity(
                id = generateLocalId(),
                billId = billId,
                itemId = line.itemId,
                itemName = item?.itemName ?: "",
                quantity = line.quantity,
                sellingPrice = price,
                lineTotal = lineTotal,
            )
        }
        val discountAmount = subtotal * request.discountPercent / 100.0
        val total = subtotal - discountAmount
        val amountPaid = request.amountPaid ?: total
        val entity = BillEntity(
            id = billId,
            billNumber = "OFFLINE-$billId",
            customerName = request.customerName,
            customerPhone = request.customerPhone,
            customerId = request.customerId,
            subtotal = subtotal,
            discountPercent = request.discountPercent,
            discountAmount = discountAmount,
            taxPercent = request.taxPercent ?: 0.0,
            total = total,
            amountPaid = amountPaid,
            paymentStatus = if (amountPaid >= total) "paid" else if (amountPaid > 0) "partial" else "pending",
            billDate = request.billDate ?: LocalDate.now().toString(),
            notes = request.notes,
        )
        billDao.insert(entity)
        billDao.insertBillItems(lineEntities)
        queueCreateOrUpdate("bill", billId, json.encodeToString(request))
        return entity
    }

    /**
     * Updates a bill locally: restores stock from the previous line items, applies
     * the new ones, and replaces the bill + line items in Room.
     */
    suspend fun updateBillLocal(id: Int, request: CreateBillRequest): BillEntity {
        val oldLines = billDao.getBillItems(id)
        for (old in oldLines) {
            itemDao.getById(old.itemId)?.let { itemDao.insert(it.copy(currentStock = it.currentStock + old.quantity)) }
        }
        var subtotal = 0.0
        val lineEntities = request.items.map { line ->
            val item = itemDao.getById(line.itemId)
            val price = line.sellingPrice ?: item?.sellingPrice ?: 0.0
            val lineTotal = price * line.quantity
            subtotal += lineTotal
            if (item != null) {
                itemDao.insert(item.copy(currentStock = (item.currentStock - line.quantity).coerceAtLeast(0)))
            }
            BillItemEntity(
                id = generateLocalId(),
                billId = id,
                itemId = line.itemId,
                itemName = item?.itemName ?: "",
                quantity = line.quantity,
                sellingPrice = price,
                lineTotal = lineTotal,
            )
        }
        val discountAmount = subtotal * request.discountPercent / 100.0
        val total = subtotal - discountAmount
        val amountPaid = request.amountPaid ?: total
        val existing = billDao.getById(id)
        val entity = BillEntity(
            id = id,
            billNumber = existing?.billNumber ?: "OFFLINE-$id",
            customerName = request.customerName,
            customerPhone = request.customerPhone,
            customerId = request.customerId,
            subtotal = subtotal,
            discountPercent = request.discountPercent,
            discountAmount = discountAmount,
            taxPercent = request.taxPercent ?: 0.0,
            total = total,
            amountPaid = amountPaid,
            paymentStatus = if (amountPaid >= total) "paid" else if (amountPaid > 0) "partial" else "pending",
            billDate = request.billDate ?: existing?.billDate ?: LocalDate.now().toString(),
            notes = request.notes,
        )
        // REPLACE cascade-deletes old bill_items for this bill (FK CASCADE), then we insert the new ones.
        billDao.insert(entity)
        billDao.insertBillItems(lineEntities)
        queueCreateOrUpdate("bill", id, json.encodeToString(request))
        return entity
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

    suspend fun createExpenseLocal(request: CreateExpenseRequest): ExpenseEntity {
        val entity = ExpenseEntity(
            id = generateLocalId(),
            category = request.category,
            amount = request.amount,
            description = request.description,
            expenseDate = request.expenseDate ?: LocalDate.now().toString(),
            createdBy = null,
        )
        expenseDao.insert(entity)
        queueCreateOrUpdate("expense", entity.id, json.encodeToString(request))
        return entity
    }

    suspend fun deleteExpenseLocal(id: Int) {
        expenseDao.delete(id)
        queueDelete("expense", id)
    }

    // ─── Purchases ────────────────────────────────────────────────────────────

    fun observePurchases(): Flow<List<PurchaseEntity>> = purchaseDao.getAll()
    fun searchPurchases(query: String): Flow<List<PurchaseEntity>> = purchaseDao.search(query)

    suspend fun syncPurchases() {
        try {
            val response = api.getPurchases()
            val entities = response.purchases.map {
                PurchaseEntity(
                    id = it.id,
                    itemId = it.itemId,
                    itemName = it.itemName,
                    quantity = it.quantity,
                    purchaseCost = it.purchaseCost,
                    totalCost = it.totalCost,
                    purchaseDate = it.purchaseDate,
                    notes = it.notes,
                )
            }
            purchaseDao.deleteAll()
            purchaseDao.insertAll(entities)
        } catch (_: Exception) { }
    }

    /**
     * Records a purchase locally and bumps the item's stock immediately so the
     * UI reflects it without a server round-trip. Queues a mutation to push the
     * purchase to the server when connectivity returns.
     */
    suspend fun createPurchaseLocal(request: CreatePurchaseRequest): PurchaseEntity {
        val item = itemDao.getById(request.itemId)
        val cost = request.purchaseCost ?: item?.purchaseCost ?: 0.0
        val entity = PurchaseEntity(
            id = generateLocalId(),
            itemId = request.itemId,
            itemName = item?.itemName ?: "",
            quantity = request.quantity,
            purchaseCost = cost,
            totalCost = cost * request.quantity,
            purchaseDate = request.purchaseDate ?: LocalDate.now().toString(),
            notes = request.notes,
        )
        purchaseDao.insert(entity)
        if (item != null) {
            itemDao.insert(item.copy(currentStock = item.currentStock + request.quantity, purchaseCost = cost))
        }
        queueCreateOrUpdate("purchase", entity.id, json.encodeToString(request))
        return entity
    }

    suspend fun deletePurchaseLocal(id: Int) {
        purchaseDao.delete(id)
        queueDelete("purchase", id)
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
        syncPurchases()
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
        // Best-effort push right away; a no-op until connectivity is available (WorkManager waits on the constraint).
        SyncWorker.triggerImmediateSync(context)
    }

    /**
     * Generates a negative, millisecond-based placeholder id for entities created
     * while offline. Once the entity syncs, syncItems()/syncPurchases()/etc. fully
     * replace local rows with the server's authoritative rows (real positive ids).
     */
    private fun generateLocalId(): Int = -(System.currentTimeMillis() % 1_000_000_000L).coerceAtLeast(1L).toInt()

    /**
     * Queues a create/update mutation for an entity. If the entity itself was
     * created offline and hasn't synced yet (negative id), the still-pending
     * "create" mutation's payload is updated in place instead of adding a
     * redundant "update" mutation that would reference a nonexistent server id.
     */
    private suspend fun queueCreateOrUpdate(entityType: String, entityId: Int, payload: String) {
        if (entityId < 0) {
            val pendingCreate = mutationDao.findPendingCreate(entityType, entityId)
            if (pendingCreate != null) {
                mutationDao.updatePayload(pendingCreate.id, payload)
                return
            }
        }
        val type = if (entityId < 0) "create_$entityType" else "update_$entityType"
        queueMutation(type, entityType, entityId, payload)
    }

    /**
     * Queues a delete mutation. If the entity was created offline and never
     * synced, its pending "create" mutation is simply cancelled instead.
     */
    private suspend fun queueDelete(entityType: String, entityId: Int) {
        if (entityId < 0) {
            val pendingCreate = mutationDao.findPendingCreate(entityType, entityId)
            if (pendingCreate != null) {
                mutationDao.delete(pendingCreate.id)
                return
            }
        }
        queueMutation("delete_$entityType", entityType, entityId, "")
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
        // This handles offline-created bills, items, purchases, expenses etc.
        when (mutation.type) {
            "create_bill" -> {
                val request = json.decodeFromString<CreateBillRequest>(mutation.payload)
                api.createBill(request)
            }
            "update_bill" -> {
                val request = json.decodeFromString<CreateBillRequest>(mutation.payload)
                mutation.entityId?.let { api.updateBill(it, request) }
            }
            "create_item" -> {
                val request = json.decodeFromString<CreateItemRequest>(mutation.payload)
                api.createItem(request)
            }
            "update_item" -> {
                val request = json.decodeFromString<CreateItemRequest>(mutation.payload)
                mutation.entityId?.let { api.updateItem(it, request) }
            }
            "create_expense" -> {
                val request = json.decodeFromString<CreateExpenseRequest>(mutation.payload)
                api.createExpense(request)
            }
            "update_expense" -> {
                val request = json.decodeFromString<CreateExpenseRequest>(mutation.payload)
                mutation.entityId?.let { api.updateExpense(it, request) }
            }
            "create_purchase" -> {
                val request = json.decodeFromString<CreatePurchaseRequest>(mutation.payload)
                api.createPurchase(request)
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
            "delete_purchase" -> {
                mutation.entityId?.let { api.deletePurchase(it) }
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

fun PurchaseEntity.toPurchaseDto() = PurchaseDto(
    id = id,
    itemId = itemId,
    itemName = itemName,
    quantity = quantity,
    purchaseCost = purchaseCost,
    totalCost = totalCost,
    purchaseDate = purchaseDate,
    notes = notes,
)

fun CustomerEntity.toCustomerDto() = CustomerDto(
    id = id,
    name = name,
    phone = phone,
    address = address,
    creditBalance = creditBalance,
    notes = notes,
)

fun ExpenseEntity.toExpenseDto() = com.jalanjyothi.crm.data.remote.ExpenseDto(
    id = id,
    category = category,
    amount = amount,
    description = description,
    expenseDate = expenseDate,
    createdBy = createdBy,
)
