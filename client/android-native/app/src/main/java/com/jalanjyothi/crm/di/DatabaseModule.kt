package com.jalanjyothi.crm.di

import android.content.Context
import androidx.room.Room
import com.jalanjyothi.crm.data.local.AppDatabase
import com.jalanjyothi.crm.data.local.dao.BillDao
import com.jalanjyothi.crm.data.local.dao.CategoryDao
import com.jalanjyothi.crm.data.local.dao.CustomerDao
import com.jalanjyothi.crm.data.local.dao.ExpenseDao
import com.jalanjyothi.crm.data.local.dao.ItemDao
import com.jalanjyothi.crm.data.local.dao.MutationDao
import com.jalanjyothi.crm.data.local.dao.PurchaseDao
import com.jalanjyothi.crm.data.local.dao.UserDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "jj_crm_db",
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideItemDao(db: AppDatabase): ItemDao = db.itemDao()

    @Provides
    fun provideCategoryDao(db: AppDatabase): CategoryDao = db.categoryDao()

    @Provides
    fun provideCustomerDao(db: AppDatabase): CustomerDao = db.customerDao()

    @Provides
    fun provideBillDao(db: AppDatabase): BillDao = db.billDao()

    @Provides
    fun provideExpenseDao(db: AppDatabase): ExpenseDao = db.expenseDao()

    @Provides
    fun providePurchaseDao(db: AppDatabase): PurchaseDao = db.purchaseDao()

    @Provides
    fun provideMutationDao(db: AppDatabase): MutationDao = db.mutationDao()

    @Provides
    fun provideUserDao(db: AppDatabase): UserDao = db.userDao()
}
