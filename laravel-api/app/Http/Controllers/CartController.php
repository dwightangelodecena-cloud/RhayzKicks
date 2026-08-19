<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use Illuminate\Http\Request;

// Mirrors Rhayzkicks Mobile/lib/data/store_repository.dart's getCartLines()
// and the cart-mutating methods on lib/state/shop_controller.dart. Realtime
// sync (Supabase Realtime watching cart_items) stays on the Flutter side and
// keeps working unchanged — it fires on the underlying Postgres row change
// regardless of whether Laravel or the Supabase client made it.
class CartController extends Controller
{
    private const PRODUCT_COLUMNS = ['id', 'name', 'brand', 'category', 'gender', 'base_price', 'image_urls', 'description', 'created_at'];

    public function index(string $customerId)
    {
        $lines = CartItem::query()
            ->where('customer_id', $customerId)
            ->with('variant.item')
            ->get();

        $result = $lines
            ->filter(fn ($line) => $line->variant && $line->variant->item)
            ->map(function (CartItem $line) {
                $variant = $line->variant;
                $item = $variant->item;

                return [
                    'id' => $line->id,
                    'quantity' => $line->quantity,
                    'variant' => [
                        'id' => $variant->id,
                        'size' => $variant->size,
                        'color' => $variant->color,
                    ],
                    'product' => $item->only(self::PRODUCT_COLUMNS),
                ];
            })
            ->values();

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|uuid',
            'variant_id' => 'required|uuid',
        ]);

        $existing = CartItem::query()
            ->where('customer_id', $data['customer_id'])
            ->where('variant_id', $data['variant_id'])
            ->first();

        if ($existing) {
            $existing->increment('quantity');
        } else {
            CartItem::create([...$data, 'quantity' => 1]);
        }

        return response()->json(['ok' => true], 201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate(['quantity' => 'required|integer|min:1']);

        $line = CartItem::findOrFail($id);
        $line->update($data);

        return response()->json(['ok' => true]);
    }

    public function destroy(string $id)
    {
        CartItem::where('id', $id)->delete();

        return response()->json(['ok' => true]);
    }
}
