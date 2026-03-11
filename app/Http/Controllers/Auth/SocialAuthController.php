<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\CreateSocialUser;
use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\SocialAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class SocialAuthController extends Controller
{
    public function __construct(
        protected SocialAuthService $socialAuthService,
        protected CreateSocialUser $createSocialUser,
    ) {}

    public function redirect(string $provider): Response
    {
        if (! $this->socialAuthService->isProviderEnabledForAuthentication($provider)) {
            return redirect()
                ->route('login')
                ->with('status', 'This social login provider is currently unavailable.');
        }

        $driver = $this->socialAuthService->driverForProvider($provider);
        if ($driver === null) {
            return redirect()
                ->route('login')
                ->with('status', 'This social login provider is currently unavailable.');
        }

        return Socialite::driver($driver)->redirect();
    }

    public function callback(Request $request, string $provider): Response
    {
        if (! $this->socialAuthService->isProviderEnabledForAuthentication($provider)) {
            return redirect()
                ->route('login')
                ->with('status', 'This social login provider is currently unavailable.');
        }

        $isLinkingIntent = $request->user() !== null
            && $request->session()->pull('social_auth_intent') === 'link'
            && $request->session()->pull('social_auth_provider') === $provider;

        $driver = $this->socialAuthService->driverForProvider($provider);
        if ($driver === null) {
            return $isLinkingIntent
                ? redirect()->route('settings.connected-accounts')
                    ->with('error', 'This provider is not currently available for linking.')
                : redirect()->route('login')
                    ->with('status', 'This social login provider is currently unavailable.');
        }

        try {
            $providerUser = Socialite::driver($driver)->user();
        } catch (\Throwable) {
            return $isLinkingIntent
                ? redirect()->route('settings.connected-accounts')
                    ->with('error', 'Unable to complete account linking. Please try again.')
                : redirect()->route('login')
                    ->with('status', 'Unable to complete social login. Please try again.');
        }

        $providerUserId = trim((string) $providerUser->getId());
        if ($providerUserId === '') {
            return $isLinkingIntent
                ? redirect()->route('settings.connected-accounts')
                    ->with('error', 'Unable to link account because provider did not return an account ID.')
                : redirect()->route('login')
                    ->with('status', 'Unable to complete social login because the provider did not return an account ID.');
        }

        $linkedAccount = SocialAccount::query()
            ->with('user')
            ->where('provider', $provider)
            ->where('provider_user_id', $providerUserId)
            ->first();

        if ($isLinkingIntent) {
            $user = $request->user();

            if ($linkedAccount && $linkedAccount->user_id !== $user->id) {
                return redirect()->route('settings.connected-accounts')
                    ->with('error', 'This provider account is already linked to another user.');
            }

            SocialAccount::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'provider' => $provider,
                ],
                [
                    'provider_user_id' => $providerUserId,
                    'email' => $providerUser->getEmail(),
                    'avatar' => $providerUser->getAvatar(),
                    'token' => $providerUser->token,
                    'refresh_token' => $providerUser->refreshToken,
                    'expires_in' => $providerUser->expiresIn,
                    'scopes' => $providerUser->approvedScopes,
                ]
            );

            return redirect()->route('settings.connected-accounts')
                ->with('success', 'Provider linked successfully.');
        }

        if ($linkedAccount?->user) {
            Auth::login($linkedAccount->user, true);
            $request->session()->regenerate();

            return app(LoginResponseContract::class)->toResponse($request);
        }

        $providerEmail = trim((string) ($providerUser->getEmail() ?? ''));
        if ($providerEmail === '') {
            return redirect()
                ->route('login')
                ->with('status', 'This social provider did not return an email address. Please register with email/password first.');
        }

        $existingUser = User::query()->where('email', $providerEmail)->first();
        if ($existingUser) {
            return redirect()
                ->route('login')
                ->with('status', 'Account exists. Log in with your password first, then link this provider in Settings > Connected Accounts.');
        }

        $name = trim((string) ($providerUser->getName() ?: $providerUser->getNickname() ?: 'New User'));
        $user = $this->createSocialUser->create([
            'name' => $name,
            'email' => $providerEmail,
        ]);

        SocialAccount::create([
            'user_id' => $user->id,
            'provider' => $provider,
            'provider_user_id' => $providerUserId,
            'email' => $providerEmail,
            'avatar' => $providerUser->getAvatar(),
            'token' => $providerUser->token,
            'refresh_token' => $providerUser->refreshToken,
            'expires_in' => $providerUser->expiresIn,
            'scopes' => $providerUser->approvedScopes,
        ]);

        Auth::login($user, true);
        $request->session()->regenerate();

        return app(LoginResponseContract::class)->toResponse($request);
    }
}
