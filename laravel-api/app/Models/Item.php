<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $table = 'items';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $casts = [
        'image_urls' => 'array',
    ];
}
