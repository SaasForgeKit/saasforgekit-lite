<?php

namespace App\Actions\Auth;

use App\Models\Tenant;
use App\Models\User;
use App\Services\BillingEmailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CreateSocialUser
{
    public function __construct(
        protected BillingEmailService $billingEmailService,
    ) {}

    protected function createTenantWithDefaults(string $name): Tenant
    {
        return Tenant::create([
            'name' => "{$name}'s Account",
        ]);
    }

    /**
     * @param  array{name: string, email: string}  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        ])->validate();

        $user = DB::transaction(function () use ($input) {
            $tenant = $this->createTenantWithDefaults($input['name']);

            $user = new User([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => Str::password(32),
                'email_verified_at' => now(),
            ]);
            $user->tenant_id = $tenant->id;
            $user->save();

            $tenant->update(['owner_id' => $user->id]);

            return $user;
        });

        $this->billingEmailService->sendWelcomeRegistered($user->fresh(['tenant']));

        return $user;
    }
}
