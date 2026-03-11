<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class PlanPrice extends Model
{
    use CentralConnection;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'unit_amount' => 'integer',
            'interval_count' => 'integer',
            'active' => 'boolean',
            'stripe_created_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }
}
