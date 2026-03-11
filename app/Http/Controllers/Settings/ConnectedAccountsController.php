<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\SocialAuthService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ConnectedAccountsController extends Controller
{
    public function __construct(
        protected SocialAuthService $socialAuthService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $linkedAccounts = $user->socialAccounts()
            ->get()
            ->keyBy('provider');

        $providers = collect($this->socialAuthService->providerStates())
            ->map(function (array $provider) use ($linkedAccounts) {
                $linkedAccount = $linkedAccounts->get($provider['key']);

                return [
                    'key' => $provider['key'],
                    'label' => $provider['label'],
                    'configured' => $provider['configured'],
                    'enabled' => $provider['enabled'] && $this->socialAuthService->isGlobalEnabled(),
                    'linked' => $linkedAccount !== null,
                    'linked_email' => $linkedAccount?->email,
                ];
            })
            ->filter(fn (array $provider) => $provider['enabled'] || $provider['linked'])
            ->values()
            ->all();

        return Inertia::render('settings/connected-accounts', [
            'socialAuthEnabled' => $this->socialAuthService->isGlobalEnabled(),
            'providers' => $providers,
        ]);
    }

    public function redirect(string $provider): \Symfony\Component\HttpFoundation\Response
    {
        if (! $this->socialAuthService->isProviderEnabledForAuthentication($provider)) {
            return redirect()->route('settings.connected-accounts')
                ->with('error', 'This provider is not currently available for linking.');
        }

        $driver = $this->socialAuthService->driverForProvider($provider);
        if ($driver === null) {
            return redirect()->route('settings.connected-accounts')
                ->with('error', 'This provider is not currently available for linking.');
        }

        session([
            'social_auth_intent' => 'link',
            'social_auth_provider' => $provider,
        ]);

        return Socialite::driver($driver)
            ->redirectUrl(route('social-auth.callback', ['provider' => $provider]))
            ->redirect();
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        // Backward compatibility for older provider configs that still point
        // to /settings/connected-accounts/{provider}/callback.
        $request->session()->put('social_auth_intent', 'link');
        $request->session()->put('social_auth_provider', $provider);

        return redirect()->route('social-auth.callback', [
            'provider' => $provider,
            ...$request->query(),
        ]);
    }

    public function destroy(Request $request, string $provider): RedirectResponse
    {
        if (! $this->socialAuthService->hasProvider($provider)) {
            return redirect()->route('settings.connected-accounts')
                ->with('error', 'Unknown provider.');
        }

        $user = $request->user();
        $account = $user->socialAccounts()->where('provider', $provider)->first();
        if (! $account) {
            return redirect()->route('settings.connected-accounts')
                ->with('error', 'Provider is not linked.');
        }

        $account->delete();

        return redirect()->route('settings.connected-accounts')
            ->with('success', 'Provider unlinked successfully.');
    }
}
