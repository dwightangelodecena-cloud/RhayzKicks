<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WishlistItem extends Model
{
    protected $table = 'wishlist_items';

    protected $keyType = 'string';

    public $incrementing = false;

    const UPDATED_AT = null; // wishlist_items has no updated_at column

    protected $fillable = ['customer_id', 'item_id'];
}
