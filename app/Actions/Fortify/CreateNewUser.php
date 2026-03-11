<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Tenant;
use App\Models\User;
use App\Services\BillingEmailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
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

    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $user = DB::transaction(function () use ($input) {
            $tenant = $this->createTenantWithDefaults($input['name']);

            $user = new User([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
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
