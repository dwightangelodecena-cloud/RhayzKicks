<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\WishlistItem;
use Illuminate\Http\Request;

// Mirrors store_repository.dart's getWishlistProducts() and
// shop_controller.dart's toggleWishlist(). Realtime sync stays on the
// Flutter side, same as CartController.
class WishlistController extends Controller
{
    private const PRODUCT_COLUMNS = ['id', 'name', 'brand', 'category', 'gender', 'base_price', 'image_urls', 'description', 'created_at'];

    public function index(string $customerId)
    {
        $itemIds = WishlistItem::where('customer_id', $customerId)->pluck('item_id');

        $products = Item::query()
            ->where('is_active', true)
            ->whereIn('id', $itemIds)
            ->get(self::PRODUCT_COLUMNS);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|uuid',
            'item_id' => 'required|uuid',
        ]);

        WishlistItem::firstOrCreate($data);

        return response()->json(['ok' => true], 201);
    }

    public function destroy(string $customerId, string $itemId)
    {
        WishlistItem::query()
            ->where('customer_id', $customerId)
            ->where('item_id', $itemId)
            ->delete();

        return response()->json(['ok' => true]);
    }
}
