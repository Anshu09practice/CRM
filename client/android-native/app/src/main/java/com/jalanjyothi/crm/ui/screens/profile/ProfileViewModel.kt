package com.jalanjyothi.crm.ui.screens.profile

import android.content.Context
import android.os.Environment
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jalanjyothi.crm.data.local.AppDatabase
import com.jalanjyothi.crm.data.local.AuthTokenStore
import com.jalanjyothi.crm.data.local.entity.BillItemEntity
import com.jalanjyothi.crm.data.local.entity.CustomerEntity
import com.jalanjyothi.crm.data.local.entity.ExpenseEntity
import com.jalanjyothi.crm.data.local.entity.ItemEntity
import com.jalanjyothi.crm.data.local.entity.PurchaseEntity
import androidx.room.withTransaction
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class ProfileUiState(
    val username: String = "",
    val role: String = "owner",
    val isBackingUp: Boolean = false,
    val isRestoring: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

// ─── Backup payload ───────────────────────────────────────────────────────────

@Serializable
data class BackupData(
    val version: Int = 1,
    val exportedAt: String,
    val items: List<ItemBackup> = emptyList(),
    val customers: List<CustomerBackup> = emptyList(),
    val bills: List<BillBackup> = emptyList(),
    val expenses: List<ExpenseBackup> = emptyList(),
    val purchases: List<PurchaseBackup> = emptyList(),
)

@Serializable
data class ItemBackup(
    val id: Int,
    val skuId: String?,
    val itemName: String,
    val packageQuantityGrams: Double,
    val purchaseCost: Double,
    val sellingPrice: Double,
    val mrp: Double?,
    val packagingStyle: String?,
    val currentStock: Int,
    val lowStockThreshold: Int,
    val categoryId: Int?,
    val categoryName: String?,
)

@Serializable
data class CustomerBackup(
    val id: Int,
    val name: String,
    val phone: String?,
    val address: String?,
    val creditBalance: Double,
    val notes: String?,
)

@Serializable
data class BillBackup(
    val id: Int,
    val billNumber: String,
    val customerName: String,
    val customerPhone: String?,
    val customerId: Int?,
    val subtotal: Double,
    val discountPercent: Double,
    val discountAmount: Double,
    val total: Double,
    val amountPaid: Double,
    val paymentStatus: String,
    val billDate: String,
    val notes: String?,
    val items: List<BillItemBackup> = emptyList(),
)

@Serializable
data class BillItemBackup(
    val id: Int,
    val itemId: Int,
    val itemName: String,
    val quantity: Int,
    val sellingPrice: Double,
    val lineTotal: Double,
)

@Serializable
data class ExpenseBackup(
    val id: Int,
    val category: String,
    val amount: Double,
    val description: String?,
    val expenseDate: String,
)

@Serializable
data class PurchaseBackup(
    val id: Int,
    val itemId: Int,
    val itemName: String,
    val quantity: Int,
    val purchaseCost: Double,
    val totalCost: Double,
    val purchaseDate: String,
    val notes: String?,
)

// ─── ViewModel ────────────────────────────────────────────────────────────────

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: AppDatabase,
    private val tokenStore: AuthTokenStore,
    private val json: Json,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val username = tokenStore.username.first() ?: ""
            val role = tokenStore.role.first() ?: "owner"
            _uiState.update { it.copy(username = username, role = role) }
        }
    }

    /** Export all Room data to a JSON file in external app-specific Documents folder. */
    fun backup() {
        viewModelScope.launch {
            _uiState.update { it.copy(isBackingUp = true, message = null, error = null) }
            try {
                val file = withContext(Dispatchers.IO) {
                    val data = collectBackupData()
                    val encoded = json.encodeToString(data)
                    writeBackupFile(encoded)
                }
                _uiState.update {
                    it.copy(isBackingUp = false, message = "Backup saved: ${file.name}")
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isBackingUp = false, error = "Backup failed: ${e.message}") }
            }
        }
    }

    /** Import a JSON backup string (content read by caller via file picker). */
    fun restore(jsonContent: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isRestoring = true, message = null, error = null) }
            try {
                withContext(Dispatchers.IO) {
                    val backup = json.decodeFromString<BackupData>(jsonContent)
                    applyRestore(backup)
                }
                _uiState.update { it.copy(isRestoring = false, message = "Data restored successfully") }
            } catch (e: Exception) {
                _uiState.update { it.copy(isRestoring = false, error = "Restore failed: ${e.message}") }
            }
        }
    }

    fun clearMessage() = _uiState.update { it.copy(message = null, error = null) }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private suspend fun collectBackupData(): BackupData {
        val items = database.itemDao().getAllList()
        val customers = database.customerDao().getAllList()
        val bills = database.billDao().getAllList()
        val expenses = database.expenseDao().getAllList()
        val purchases = database.purchaseDao().getAllList()

        return BackupData(
            exportedAt = Instant.now().toString(),
            items = items.map { it.toBackup() },
            customers = customers.map { it.toBackup() },
            bills = bills.map { bill ->
                val billItems = database.billDao().getBillItems(bill.id)
                bill.toBackup(billItems)
            },
            expenses = expenses.map { it.toBackup() },
            purchases = purchases.map { it.toBackup() },
        )
    }

    private fun writeBackupFile(content: String): File {
        val formatter = DateTimeFormatter
            .ofPattern("yyyy-MM-dd'T'HH-mm-ss")
            .withZone(ZoneId.systemDefault())
        val timestamp = formatter.format(Instant.now())

        // getExternalFilesDir() → /sdcard/Android/data/<pkg>/files/Documents/
        // No runtime permission required on any supported Android version.
        val dir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
            ?: context.filesDir
        dir.mkdirs()

        val file = File(dir, "jj_crm_backup_$timestamp.json")
        file.writeText(content, Charsets.UTF_8)
        return file
    }

    private suspend fun applyRestore(backup: BackupData) {
        database.withTransaction {
            // Truncate in FK-safe order (bill_items references bills)
            database.billDao().deleteAllBillItems()
            database.billDao().deleteAll()
            database.expenseDao().deleteAll()
            database.purchaseDao().deleteAll()
            database.customerDao().deleteAll()
            database.itemDao().deleteAll()
        }

        if (backup.items.isNotEmpty()) {
            database.itemDao().insertAll(backup.items.map { b ->
                ItemEntity(
                    id = b.id, skuId = b.skuId, itemName = b.itemName,
                    packageQuantityGrams = b.packageQuantityGrams,
                    purchaseCost = b.purchaseCost, sellingPrice = b.sellingPrice,
                    mrp = b.mrp, packagingStyle = b.packagingStyle,
                    currentStock = b.currentStock, lowStockThreshold = b.lowStockThreshold,
                    categoryId = b.categoryId, categoryName = b.categoryName,
                )
            })
        }
        if (backup.customers.isNotEmpty()) {
            database.customerDao().insertAll(backup.customers.map { b ->
                CustomerEntity(
                    id = b.id, name = b.name, phone = b.phone,
                    address = b.address, creditBalance = b.creditBalance, notes = b.notes,
                )
            })
        }
        if (backup.bills.isNotEmpty()) {
            val billEntities = backup.bills.map { b ->
                com.jalanjyothi.crm.data.local.entity.BillEntity(
                    id = b.id, billNumber = b.billNumber, customerName = b.customerName,
                    customerPhone = b.customerPhone, customerId = b.customerId,
                    subtotal = b.subtotal, discountPercent = b.discountPercent,
                    discountAmount = b.discountAmount, total = b.total,
                    amountPaid = b.amountPaid, paymentStatus = b.paymentStatus,
                    billDate = b.billDate, notes = b.notes,
                )
            }
            database.billDao().insertAll(billEntities)
            val lineItems = backup.bills.flatMap { b ->
                b.items.map { li ->
                    BillItemEntity(
                        id = li.id, billId = b.id, itemId = li.itemId,
                        itemName = li.itemName, quantity = li.quantity,
                        sellingPrice = li.sellingPrice, lineTotal = li.lineTotal,
                    )
                }
            }
            if (lineItems.isNotEmpty()) database.billDao().insertBillItems(lineItems)
        }
        if (backup.expenses.isNotEmpty()) {
            database.expenseDao().insertAll(backup.expenses.map { b ->
                ExpenseEntity(
                    id = b.id, category = b.category, amount = b.amount,
                    description = b.description, expenseDate = b.expenseDate,
                )
            })
        }
        if (backup.purchases.isNotEmpty()) {
            database.purchaseDao().insertAll(backup.purchases.map { b ->
                PurchaseEntity(
                    id = b.id, itemId = b.itemId, itemName = b.itemName,
                    quantity = b.quantity, purchaseCost = b.purchaseCost,
                    totalCost = b.totalCost, purchaseDate = b.purchaseDate, notes = b.notes,
                )
            })
        }
    }

    // ─── Entity → Backup mappers ──────────────────────────────────────────────

    private fun ItemEntity.toBackup() = ItemBackup(
        id, skuId, itemName, packageQuantityGrams, purchaseCost, sellingPrice,
        mrp, packagingStyle, currentStock, lowStockThreshold, categoryId, categoryName,
    )

    private fun CustomerEntity.toBackup() = CustomerBackup(id, name, phone, address, creditBalance, notes)

    private fun com.jalanjyothi.crm.data.local.entity.BillEntity.toBackup(
        items: List<BillItemEntity>,
    ) = BillBackup(
        id, billNumber, customerName, customerPhone, customerId,
        subtotal, discountPercent, discountAmount, total, amountPaid,
        paymentStatus, billDate, notes,
        items.map { BillItemBackup(it.id, it.itemId, it.itemName, it.quantity, it.sellingPrice, it.lineTotal) },
    )

    private fun ExpenseEntity.toBackup() = ExpenseBackup(id, category, amount, description, expenseDate)

    private fun PurchaseEntity.toBackup() = PurchaseBackup(
        id, itemId, itemName, quantity, purchaseCost, totalCost, purchaseDate, notes,
    )
}
