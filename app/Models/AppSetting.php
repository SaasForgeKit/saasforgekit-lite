<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\CentralConnection;

class AppSetting extends Model
{
    use CentralConnection;

    protected $fillable = ['key', 'value'];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::query()
            ->where('key', $key)
            ->first();

        if (! $setting) {
            return $default;
        }

        return $setting->value;
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function getBoolean(string $key, bool $default = false): bool
    {
        $value = static::getValue($key);

        if ($value === null) {
            return $default;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (bool) $value;
        }

        if (is_string($value)) {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
        }

        return $default;
    }

    /**
     * @return array<string, mixed>
     */
    public static function getMany(array $keys, array $defaults = []): array
    {
        $settings = static::whereIn('key', $keys)->pluck('value', 'key');

        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $settings[$key] ?? ($defaults[$key] ?? null);
        }

        return $result;
    }

    public static function getInteger(string $key, ?int $default = null): ?int
    {
        $value = static::getValue($key);

        if ($value === null || $value === '') {
            return $default;
        }

        return is_numeric($value) ? (int) $value : $default;
    }

    public static function getNullableInteger(string $key, ?int $defaultWhenMissing = null): ?int
    {
        $setting = static::query()
            ->where('key', $key)
            ->first();

        if (! $setting) {
            return $defaultWhenMissing;
        }

        $value = $setting->value;

        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : $defaultWhenMissing;
    }
}
