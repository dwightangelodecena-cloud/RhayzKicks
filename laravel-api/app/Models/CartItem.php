<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $table = 'cart_items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['customer_id', 'variant_id', 'quantity'];

    public function variant()
    {
        return $this->belongsTo(ItemVariant::class, 'variant_id');
    }
}
