package com.jalanjyothi.crm.data.remote

import retrofit2.http.*

interface ApiService {

    // ─── Auth ─────────────────────────────────────────────────────────────────
    @GET("api/auth/status")
    suspend fun getStatus(): StatusResponse

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): RefreshResponse

    @GET("api/auth/verify")
    suspend fun verifyToken(): VerifyResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): RegisterResponse

    @POST("api/auth/logout")
    suspend fun logout(): GenericResponse

    // ─── Dashboard ────────────────────────────────────────────────────────────
    @GET("api/dashboard/summary")
    suspend fun getDashboardSummary(): DashboardSummary

    @GET("api/dashboard/sales-trend")
    suspend fun getSalesTrend(): List<SalesTrendItem>

    @GET("api/dashboard/top-items")
    suspend fun getTopItems(@Query("period") period: String? = null): TopItemsResponse

    @GET("api/dashboard/low-stock")
    suspend fun getLowStockItems(): List<ItemDto>

    // ─── Items ────────────────────────────────────────────────────────────────
    @GET("api/items")
    suspend fun getItems(
        @Query("search") search: String? = null,
        @Query("packaging_style") packagingStyle: String? = null,
        @Query("category_id") categoryId: Int? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
    ): ItemsResponse

    @POST("api/items")
    suspend fun createItem(@Body request: CreateItemRequest): ItemDto

    @GET("api/items/{id}")
    suspend fun getItem(@Path("id") id: Int): ItemDto

    @PUT("api/items/{id}")
    suspend fun updateItem(@Path("id") id: Int, @Body request: CreateItemRequest): ItemDto

    @DELETE("api/items/{id}")
    suspend fun deleteItem(@Path("id") id: Int): GenericResponse

    @GET("api/items/low-stock")
    suspend fun getLowStock(): ItemsResponse

    // ─── Bills ────────────────────────────────────────────────────────────────
    @GET("api/bills")
    suspend fun getBills(
        @Query("from_date") fromDate: String? = null,
        @Query("to_date") toDate: String? = null,
        @Query("search") search: String? = null,
        @Query("payment_status") paymentStatus: String? = null,
    ): BillsResponse

    @POST("api/bills")
    suspend fun createBill(@Body request: CreateBillRequest): BillDto

    @GET("api/bills/{id}")
    suspend fun getBill(@Path("id") id: Int): BillDto

    @PUT("api/bills/{id}")
    suspend fun updateBill(@Path("id") id: Int, @Body request: CreateBillRequest): BillDto

    @DELETE("api/bills/{id}")
    suspend fun deleteBill(@Path("id") id: Int): GenericResponse

    @POST("api/bills/{id}/payment")
    suspend fun recordPayment(@Path("id") id: Int, @Body request: RecordPaymentRequest): BillDto

    @GET("api/bills/stock/available")
    suspend fun getAvailableStock(): Map<String, List<ItemDto>>

    // ─── Customers ────────────────────────────────────────────────────────────
    @GET("api/customers")
    suspend fun getCustomers(@Query("search") search: String? = null): List<CustomerDto>

    @POST("api/customers")
    suspend fun createCustomer(@Body request: CreateCustomerRequest): CustomerDto

    @GET("api/customers/{id}")
    suspend fun getCustomer(@Path("id") id: Int): CustomerDto

    @PUT("api/customers/{id}")
    suspend fun updateCustomer(@Path("id") id: Int, @Body request: CreateCustomerRequest): CustomerDto

    @DELETE("api/customers/{id}")
    suspend fun deleteCustomer(@Path("id") id: Int): GenericResponse

    // ─── Expenses ─────────────────────────────────────────────────────────────
    @GET("api/expenses")
    suspend fun getExpenses(
        @Query("from_date") fromDate: String? = null,
        @Query("to_date") toDate: String? = null,
        @Query("category") category: String? = null,
    ): ExpensesResponse

    @POST("api/expenses")
    suspend fun createExpense(@Body request: CreateExpenseRequest): ExpenseDto

    @PUT("api/expenses/{id}")
    suspend fun updateExpense(@Path("id") id: Int, @Body request: CreateExpenseRequest): ExpenseDto

    @DELETE("api/expenses/{id}")
    suspend fun deleteExpense(@Path("id") id: Int): GenericResponse

    @GET("api/expenses/categories")
    suspend fun getExpenseCategories(): List<String>

    // ─── Purchases ────────────────────────────────────────────────────────────
    @GET("api/purchases")
    suspend fun getPurchases(
        @Query("item_id") itemId: Int? = null,
        @Query("from_date") fromDate: String? = null,
        @Query("to_date") toDate: String? = null,
        @Query("search") search: String? = null,
    ): PurchasesResponse

    @POST("api/purchases")
    suspend fun createPurchase(@Body request: CreatePurchaseRequest): PurchaseDto

    @PUT("api/purchases/{id}")
    suspend fun updatePurchase(@Path("id") id: Int, @Body request: PurchaseDto): PurchaseDto

    @DELETE("api/purchases/{id}")
    suspend fun deletePurchase(@Path("id") id: Int): GenericResponse

    // ─── Categories ───────────────────────────────────────────────────────────
    @GET("api/categories")
    suspend fun getCategories(): List<CategoryDto>

    @POST("api/categories")
    suspend fun createCategory(@Body request: CategoryDto): CategoryDto

    // ─── Bulk Update ──────────────────────────────────────────────────────────────────────
    @POST("api/items/bulk-update")
    suspend fun bulkUpdateItems(@Body request: BulkUpdateItemsRequest): BulkUpdateResponse

    @DELETE("api/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: Int): GenericResponse
}
