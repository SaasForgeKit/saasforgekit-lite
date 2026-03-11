<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSocialAuthSettingsRequest;
use App\Models\AppSetting;
use App\Services\SocialAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppSettingsController extends Controller
{
    public function __construct(
        protected SocialAuthService $socialAuthService,
    ) {}

    public function edit(): Response
    {
        $settings = AppSetting::getMany(['app_name', 'logo', 'favicon'], [
            'app_name' => config('app.name'),
        ]);

        return Inertia::render('admin/settings/general', [
            'settings' => [
                'app_name' => $settings['app_name'],
                'logo' => $settings['logo'] ? Storage::url($settings['logo']) : null,
                'favicon' => $settings['favicon'] ? Storage::url($settings['favicon']) : null,
            ],
        ]);
    }

    public function editEmails(): Response
    {
        return Inertia::render('admin/settings/emails', [
            'settings' => [
                'emails_enabled' => AppSetting::getBoolean('emails_enabled', true),
                'emails_subscription_activated_enabled' => AppSetting::getBoolean('emails_subscription_activated_enabled', true),
                'emails_trial_started_enabled' => AppSetting::getBoolean('emails_trial_started_enabled', true),
                'emails_payment_failed_enabled' => AppSetting::getBoolean('emails_payment_failed_enabled', true),
                'emails_subscription_canceled_enabled' => AppSetting::getBoolean('emails_subscription_canceled_enabled', true),
                'emails_invoice_paid_enabled' => AppSetting::getBoolean('emails_invoice_paid_enabled', true),
                'emails_welcome_enabled' => AppSetting::getBoolean('emails_welcome_enabled', true),
            ],
        ]);
    }

    public function editSocialAuth(): Response
    {
        return Inertia::render('admin/settings/social-auth', [
            'settings' => [
                'social_auth_enabled' => $this->socialAuthService->isGlobalEnabled(),
                'social_enabled_providers' => $this->socialAuthService->enabledProviderKeys(),
            ],
            'providers' => $this->socialAuthService->providerStates(),
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'app_name' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'file', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:png,ico,svg', 'max:512'],
            'remove_logo' => ['nullable', 'boolean'],
            'remove_favicon' => ['nullable', 'boolean'],
        ]);

        AppSetting::setValue('app_name', $request->input('app_name'));

        if ($request->boolean('remove_logo')) {
            $oldLogo = AppSetting::getValue('logo');
            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }
            AppSetting::setValue('logo', null);
        } elseif ($request->hasFile('logo')) {
            $oldLogo = AppSetting::getValue('logo');
            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }

            $path = $request->file('logo')->store('settings', 'public');
            AppSetting::setValue('logo', $path);
        }

        if ($request->boolean('remove_favicon')) {
            $oldFavicon = AppSetting::getValue('favicon');
            if ($oldFavicon) {
                Storage::disk('public')->delete($oldFavicon);
            }
            AppSetting::setValue('favicon', null);
        } elseif ($request->hasFile('favicon')) {
            $oldFavicon = AppSetting::getValue('favicon');
            if ($oldFavicon) {
                Storage::disk('public')->delete($oldFavicon);
            }

            $path = $request->file('favicon')->store('settings', 'public');
            AppSetting::setValue('favicon', $path);
        }

        return back()->with('success', 'Settings saved successfully.');
    }

    public function updateEmails(Request $request)
    {
        $validated = $request->validate([
            'emails_enabled' => ['required', 'boolean'],
            'emails_subscription_activated_enabled' => ['required', 'boolean'],
            'emails_trial_started_enabled' => ['required', 'boolean'],
            'emails_payment_failed_enabled' => ['required', 'boolean'],
            'emails_subscription_canceled_enabled' => ['required', 'boolean'],
            'emails_invoice_paid_enabled' => ['required', 'boolean'],
            'emails_welcome_enabled' => ['required', 'boolean'],
        ]);

        if (! $validated['emails_enabled']) {
            $validated['emails_subscription_activated_enabled'] = false;
            $validated['emails_trial_started_enabled'] = false;
            $validated['emails_payment_failed_enabled'] = false;
            $validated['emails_subscription_canceled_enabled'] = false;
            $validated['emails_invoice_paid_enabled'] = false;
            $validated['emails_welcome_enabled'] = false;
        }

        foreach ($validated as $key => $value) {
            AppSetting::setValue($key, $value);
        }

        return back()->with('success', 'Email settings saved successfully.');
    }

    public function updateSocialAuth(UpdateSocialAuthSettingsRequest $request)
    {
        $validated = $request->validated();

        /** @var array{valid: list<string>, unsupported: list<string>, unconfigured: list<string>} $providerSelection */
        $providerSelection = $this->socialAuthService->validateProviderSelection($validated['social_enabled_providers']);

        if ($providerSelection['unsupported'] !== []) {
            throw ValidationException::withMessages([
                'social_enabled_providers' => 'Unsupported providers selected: '.implode(', ', $providerSelection['unsupported']).'.',
            ]);
        }

        if ($providerSelection['unconfigured'] !== []) {
            throw ValidationException::withMessages([
                'social_enabled_providers' => 'Providers are missing required environment configuration: '.implode(', ', $providerSelection['unconfigured']).'.',
            ]);
        }

        $socialAuthEnabled = (bool) $validated['social_auth_enabled'];
        if (! $socialAuthEnabled) {
            $this->socialAuthService->setGlobalEnabled(false);
            $this->socialAuthService->setEnabledProviders([]);

            return back()->with('success', 'Social authentication settings saved successfully.');
        }

        $this->socialAuthService->setGlobalEnabled(true);
        $this->socialAuthService->setEnabledProviders($providerSelection['valid']);

        return back()->with('success', 'Social authentication settings saved successfully.');
    }
}
