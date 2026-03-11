<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class Plan extends Model
{
    use CentralConnection;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'popular' => 'boolean',
            'trial_enabled' => 'boolean',
            'trial_days' => 'integer',
            'trial_without_card' => 'boolean',
            'features' => 'array',
            'stripe_created_at' => 'datetime',
        ];
    }

    public function prices(): HasMany
    {
        return $this->hasMany(PlanPrice::class);
    }

    public function activePrices(): HasMany
    {
        return $this->prices()->where('active', true);
    }

    public function activeBasePrices(): HasMany
    {
        return $this->activePrices()->where('type', 'base');
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }

    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('display_order');
    }
}
