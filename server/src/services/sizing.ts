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
export function calculateSizing(packaging_style: string, package_quantity_grams: number) {
  if (packaging_style === 'packet' && package_quantity_grams > 0) {
    const packets_per_bundle = Math.floor(1000 / package_quantity_grams);
    const bundle_weight_grams = packets_per_bundle * package_quantity_grams;
    return { packets_per_bundle, bundle_weight_grams };
  }

  if (packaging_style === 'standing_package') {
    return { packets_per_bundle: 1, bundle_weight_grams: 100 };
  }

  return { packets_per_bundle: 0, bundle_weight_grams: 0 };
}
