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
export interface CreateItemInput {
    item_name: string;
    package_quantity_grams: number;
    purchase_cost: number;
    selling_price: number;
    mrp: number;
    packaging_style: 'packet' | 'standing_package';
    sku_id?: string | null;
}
/**
 * Calculate sizing based on packaging style and package quantity.
 *
 * Rules:
 * - Packet: bundle = 1000g / package_quantity_grams packets (e.g., 50g → 20 packets = 1kg)
 * - Standing Package: 1 standing pack = 100g, no bundle calculation
 */
export declare function calculateSizing(packaging_style: string, package_quantity_grams: number): {
    packets_per_bundle: number;
    bundle_weight_grams: number;
};
//# sourceMappingURL=sizing.d.ts.map