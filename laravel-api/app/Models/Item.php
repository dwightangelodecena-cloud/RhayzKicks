<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table = 'items';

    protected $keyType = 'string';

    public $incrementing = false;

    // Postgres numeric columns come back from PDO as strings; cast to float
    // so base_price serializes as a JSON number, not a quoted string — the
    // Dart Product model assigns this straight into a `num` field.
    protected $casts = [
        'image_urls' => 'array',
        'base_price' => 'float',
    ];
}
