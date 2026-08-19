<?php

namespace App\Http\Controllers;

use App\Models\Item;

// Mirrors Rhayzkicks Mobile/lib/data/store_repository.dart's getActiveProducts()
// and getProductsForCategorySlug() — same table, same columns, same ordering.
// The Flutter/web clients call this API instead of querying Supabase directly;
// this controller is the only thing that talks to the Supabase Postgres DB.
class ProductController extends Controller
{
    private const COLUMNS = ['id', 'name', 'brand', 'category', 'gender', 'base_price', 'image_urls', 'description', 'created_at'];

    public function index()
    {
        $products = Item::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(self::COLUMNS);

        return response()->json($products);
    }

    public function byCategory(string $slug)
    {
        $query = Item::query()->where('is_active', true);

        if ($slug === 'new-releases') {
            $query->where('created_at', '>=', now()->subDays(30));
        } else {
            $query->where('category', $slug);
        }

        return response()->json($query->orderBy('sort_order')->get(self::COLUMNS));
    }
}
