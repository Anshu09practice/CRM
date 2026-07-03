package com.jalanjyothi.crm.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.jalanjyothi.crm.data.local.dao.BillDao
import com.jalanjyothi.crm.data.local.dao.CategoryDao
import com.jalanjyothi.crm.data.local.dao.CustomerDao
import com.jalanjyothi.crm.data.local.dao.ExpenseDao
import com.jalanjyothi.crm.data.local.dao.ItemDao
import com.jalanjyothi.crm.data.local.dao.MutationDao
import com.jalanjyothi.crm.data.local.dao.PurchaseDao
import com.jalanjyothi.crm.data.local.dao.UserDao
import com.jalanjyothi.crm.data.local.entity.BillEntity
import com.jalanjyothi.crm.data.local.entity.BillItemEntity
import com.jalanjyothi.crm.data.local.entity.CategoryEntity
import com.jalanjyothi.crm.data.local.entity.CustomerEntity
import com.jalanjyothi.crm.data.local.entity.ExpenseEntity
import com.jalanjyothi.crm.data.local.entity.ItemEntity
import com.jalanjyothi.crm.data.local.entity.PendingMutation
import com.jalanjyothi.crm.data.local.entity.PurchaseEntity
import com.jalanjyothi.crm.data.local.entity.UserEntity

@Database(
    entities = [
        ItemEntity::class,
        CategoryEntity::class,
        CustomerEntity::class,
        BillEntity::class,
        BillItemEntity::class,
        ExpenseEntity::class,
        PurchaseEntity::class,
        PendingMutation::class,
        UserEntity::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun itemDao(): ItemDao
    abstract fun categoryDao(): CategoryDao
    abstract fun customerDao(): CustomerDao
    abstract fun billDao(): BillDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun purchaseDao(): PurchaseDao
    abstract fun mutationDao(): MutationDao
    abstract fun userDao(): UserDao
}
