package com.jalanjyothi.crm.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.jalanjyothi.crm.data.local.entity.BillEntity
import com.jalanjyothi.crm.data.local.entity.BillItemEntity
import com.jalanjyothi.crm.data.local.entity.CategoryEntity
import com.jalanjyothi.crm.data.local.entity.CustomerEntity
import com.jalanjyothi.crm.data.local.entity.ExpenseEntity
import com.jalanjyothi.crm.data.local.entity.ItemEntity
import com.jalanjyothi.crm.data.local.entity.PendingMutation
import com.jalanjyothi.crm.data.local.entity.PurchaseEntity
import com.jalanjyothi.crm.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ItemDao {
    @Query("SELECT * FROM items ORDER BY item_name ASC")
    fun getAll(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items ORDER BY item_name ASC")
    suspend fun getAllList(): List<ItemEntity>

    @Query("SELECT * FROM items WHERE item_name LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE current_stock <= low_stock_threshold")
    fun getLowStock(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE current_stock <= low_stock_threshold ORDER BY current_stock ASC")
    suspend fun getLowStockList(): List<ItemEntity>

    @Query("SELECT * FROM items WHERE current_stock > 0")
    fun getAvailableStock(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items WHERE id = :id")
    suspend fun getById(id: Int): ItemEntity?

    @Query("SELECT COUNT(*) FROM items")
    suspend fun getCount(): Int

    @Query("SELECT COUNT(*) FROM items WHERE current_stock <= low_stock_threshold")
    suspend fun getLowStockCount(): Int

    @Query("SELECT COALESCE(SUM(purchase_cost * current_stock), 0.0) FROM items")
    suspend fun getStockValue(): Double

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<ItemEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: ItemEntity)

    @Query("DELETE FROM items WHERE id = :id")
    suspend fun delete(id: Int)

    @Query("DELETE FROM items")
    suspend fun deleteAll()
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name ASC")
    fun getAll(): Flow<List<CategoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories")
    suspend fun deleteAll()
}

@Dao
interface CustomerDao {
    @Query("SELECT * FROM customers ORDER BY name ASC")
    fun getAll(): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers ORDER BY name ASC")
    suspend fun getAllList(): List<CustomerEntity>

    @Query("SELECT * FROM customers WHERE name LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers WHERE id = :id")
    suspend fun getById(id: Int): CustomerEntity?

    @Query("SELECT COUNT(*) FROM customers")
    suspend fun getCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(customers: List<CustomerEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(customer: CustomerEntity)

    @Query("DELETE FROM customers")
    suspend fun deleteAll()
}

@Dao
interface BillDao {
    @Query("SELECT * FROM bills ORDER BY bill_date DESC")
    fun getAll(): Flow<List<BillEntity>>

    @Query("SELECT * FROM bills ORDER BY bill_date DESC")
    suspend fun getAllList(): List<BillEntity>

    @Query("SELECT * FROM bills WHERE customer_name LIKE '%' || :query || '%' OR bill_number LIKE '%' || :query || '%'")
    fun search(query: String): Flow<List<BillEntity>>

    @Query("SELECT * FROM bills WHERE payment_status = :status ORDER BY bill_date DESC")
    fun getByStatus(status: String): Flow<List<BillEntity>>

    @Query("SELECT * FROM bills WHERE id = :id")
    suspend fun getById(id: Int): BillEntity?

    @Query("SELECT * FROM bill_items WHERE bill_id = :billId")
    suspend fun getBillItems(billId: Int): List<BillItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(bills: List<BillEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(bill: BillEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBillItems(items: List<BillItemEntity>)

    @Query("DELETE FROM bills WHERE id = :id")
    suspend fun delete(id: Int)

    @Query("DELETE FROM bills")
    suspend fun deleteAll()

    @Query("DELETE FROM bill_items")
    suspend fun deleteAllBillItems()

    // Dashboard queries
    @Query("SELECT COALESCE(SUM(total), 0.0) FROM bills WHERE bill_date = :date")
    suspend fun getRevenueForDate(date: String): Double

    @Query("SELECT COUNT(*) FROM bills WHERE bill_date = :date")
    suspend fun getSalesCountForDate(date: String): Int

    @Query("SELECT COALESCE(SUM(total), 0.0) FROM bills WHERE bill_date LIKE :monthPrefix || '%'")
    suspend fun getRevenueForMonth(monthPrefix: String): Double

    @Query("SELECT COUNT(*) FROM bills WHERE bill_date LIKE :monthPrefix || '%'")
    suspend fun getSalesCountForMonth(monthPrefix: String): Int

    @Query("SELECT COALESCE(SUM(total - amount_paid), 0.0) FROM bills WHERE payment_status IN ('pending', 'partial', 'overdue')")
    suspend fun getTotalPending(): Double

    @Query("SELECT COUNT(*) FROM bills WHERE payment_status IN ('pending', 'partial', 'overdue')")
    suspend fun getPendingCount(): Int
}

@Dao
interface ExpenseDao {
    @Query("SELECT * FROM expenses ORDER BY expense_date DESC")
    fun getAll(): Flow<List<ExpenseEntity>>

    @Query("SELECT * FROM expenses ORDER BY expense_date DESC")
    suspend fun getAllList(): List<ExpenseEntity>

    @Query("SELECT * FROM expenses WHERE expense_date BETWEEN :from AND :to ORDER BY expense_date DESC")
    fun getByDateRange(from: String, to: String): Flow<List<ExpenseEntity>>

    @Query("SELECT COALESCE(SUM(amount), 0.0) FROM expenses WHERE expense_date LIKE :monthPrefix || '%'")
    suspend fun getTotalForMonth(monthPrefix: String): Double

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(expenses: List<ExpenseEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(expense: ExpenseEntity)

    @Query("DELETE FROM expenses WHERE id = :id")
    suspend fun delete(id: Int)

    @Query("DELETE FROM expenses")
    suspend fun deleteAll()
}

@Dao
interface PurchaseDao {
    @Query("SELECT * FROM purchases ORDER BY purchase_date DESC")
    fun getAll(): Flow<List<PurchaseEntity>>

    @Query("SELECT * FROM purchases ORDER BY purchase_date DESC")
    suspend fun getAllList(): List<PurchaseEntity>

    @Query("SELECT COALESCE(SUM(total_cost), 0.0) FROM purchases WHERE purchase_date LIKE :monthPrefix || '%'")
    suspend fun getTotalCostForMonth(monthPrefix: String): Double

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(purchases: List<PurchaseEntity>)

    @Query("DELETE FROM purchases")
    suspend fun deleteAll()
}

@Dao
interface MutationDao {
    @Query("SELECT * FROM pending_mutations ORDER BY created_at ASC")
    suspend fun getAll(): List<PendingMutation>

    @Insert
    suspend fun insert(mutation: PendingMutation)

    @Query("DELETE FROM pending_mutations WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("UPDATE pending_mutations SET retries = retries + 1 WHERE id = :id")
    suspend fun incrementRetry(id: Long)

    @Query("SELECT COUNT(*) FROM pending_mutations")
    fun getPendingCount(): Flow<Int>

    @Query("DELETE FROM pending_mutations WHERE retries > 5")
    suspend fun deleteStaleRetries()
}

@Dao
interface UserDao {
    @Query("SELECT * FROM local_users WHERE username = :username LIMIT 1")
    suspend fun getByUsername(username: String): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(user: UserEntity)

    @Query("SELECT COUNT(*) FROM local_users")
    suspend fun count(): Int

    @Query("UPDATE local_users SET last_login = :time WHERE username = :username")
    suspend fun updateLastLogin(username: String, time: String)
}
