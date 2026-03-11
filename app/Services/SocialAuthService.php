<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Arr;

class SocialAuthService
{
    public function hasProvider(string $provider): bool
    {
        return Arr::has($this->providersConfig(), $this->normalizeProvider($provider));
    }

    /**
     * @return list<string>
     */
    public function providerKeys(): array
    {
        return array_keys($this->providersConfig());
    }

    /**
     * @return list<array{key: string, label: string, driver: string, required_config: list<string>, configured: bool, enabled: bool}>
     */
    public function providerStates(): array
    {
        $enabledProviderKeys = array_flip($this->enabledProviderKeys());

        $states = [];
        foreach ($this->providersConfig() as $key => $providerConfig) {
            $states[] = [
                'key' => $key,
                'label' => (string) ($providerConfig['label'] ?? ucfirst($key)),
                'driver' => (string) ($providerConfig['driver'] ?? $key),
                'required_config' => $this->providerRequiredConfig($providerConfig),
                'configured' => $this->isProviderConfigured($key),
                'enabled' => isset($enabledProviderKeys[$key]),
            ];
        }

        return $states;
    }

    /**
     * @return list<array{key: string, label: string, driver: string}>
     */
    public function enabledProvidersForAuthentication(): array
    {
        if (! $this->isGlobalEnabled()) {
            return [];
        }

        $providers = [];
        foreach ($this->providerStates() as $provider) {
            if (! $provider['enabled'] || ! $provider['configured']) {
                continue;
            }

            $providers[] = [
                'key' => $provider['key'],
                'label' => $provider['label'],
                'driver' => $provider['driver'],
            ];
        }

        return $providers;
    }

    public function isProviderConfigured(string $provider): bool
    {
        $providerConfig = $this->providerConfig($provider);
        if ($providerConfig === null) {
            return false;
        }

        foreach ($this->providerRequiredConfig($providerConfig) as $configKey) {
            $value = config($configKey);
            if (! is_string($value) || trim($value) === '') {
                return false;
            }
        }

        return true;
    }

    public function driverForProvider(string $provider): ?string
    {
        $providerConfig = $this->providerConfig($provider);
        if ($providerConfig === null) {
            return null;
        }

        $driver = $providerConfig['driver'] ?? $provider;

        return is_string($driver) && trim($driver) !== ''
            ? trim($driver)
            : null;
    }

    public function isProviderEnabledForAuthentication(string $provider): bool
    {
        if (! $this->isGlobalEnabled()) {
            return false;
        }

        $normalizedProvider = $this->normalizeProvider($provider);
        if (! in_array($normalizedProvider, $this->enabledProviderKeys(), true)) {
            return false;
        }

        return $this->isProviderConfigured($normalizedProvider);
    }

    public function isGlobalEnabled(): bool
    {
        return AppSetting::getBoolean('social_auth_enabled', false);
    }

    public function setGlobalEnabled(bool $enabled): void
    {
        AppSetting::setValue('social_auth_enabled', $enabled);
    }

    /**
     * @param  list<string>  $providers
     */
    public function setEnabledProviders(array $providers): void
    {
        AppSetting::setValue('social_enabled_providers', json_encode($this->normalizeProviders($providers)));
    }

    /**
     * @return array{valid: list<string>, unsupported: list<string>, unconfigured: list<string>}
     */
    public function validateProviderSelection(array $providers): array
    {
        $normalizedProviders = $this->normalizeProviders($providers);

        $valid = [];
        $unsupported = [];
        $unconfigured = [];

        foreach ($normalizedProviders as $provider) {
            if (! $this->hasProvider($provider)) {
                $unsupported[] = $provider;

                continue;
            }

            if (! $this->isProviderConfigured($provider)) {
                $unconfigured[] = $provider;

                continue;
            }

            $valid[] = $provider;
        }

        return [
            'valid' => $valid,
            'unsupported' => $unsupported,
            'unconfigured' => $unconfigured,
        ];
    }

    /**
     * @return list<string>
     */
    public function enabledProviderKeys(): array
    {
        $rawValue = AppSetting::getValue('social_enabled_providers', '[]');
        if (! is_string($rawValue)) {
            return [];
        }

        $decoded = json_decode($rawValue, true);
        if (! is_array($decoded)) {
            return [];
        }

        return $this->normalizeProviders($decoded);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function providersConfig(): array
    {
        $providers = config('social-auth.providers', []);

        return is_array($providers) ? $providers : [];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function providerConfig(string $provider): ?array
    {
        $normalizedProvider = $this->normalizeProvider($provider);
        $providerConfig = Arr::get($this->providersConfig(), $normalizedProvider);

        return is_array($providerConfig) ? $providerConfig : null;
    }

    /**
     * @param  array<string, mixed>  $providerConfig
     * @return list<string>
     */
    private function providerRequiredConfig(array $providerConfig): array
    {
        $keys = Arr::get($providerConfig, 'required_config', []);
        if (! is_array($keys)) {
            return [];
        }

        return array_values(array_filter($keys, fn ($key) => is_string($key) && $key !== ''));
    }

    private function normalizeProvider(string $provider): string
    {
        return strtolower(trim($provider));
    }

    /**
     * @param  array<int, mixed>  $providers
     * @return list<string>
     */
    private function normalizeProviders(array $providers): array
    {
        $normalized = [];
        foreach ($providers as $provider) {
            if (! is_string($provider)) {
                continue;
            }

            $providerKey = $this->normalizeProvider($provider);
            if ($providerKey === '') {
                continue;
            }

            $normalized[$providerKey] = $providerKey;
        }

        return array_values($normalized);
    }
}
