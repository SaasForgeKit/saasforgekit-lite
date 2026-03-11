<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SocialAccount>
 */
class SocialAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $provider = fake()->randomElement(['google', 'github']);

        return [
            'user_id' => User::factory(),
            'provider' => $provider,
            'provider_user_id' => "{$provider}-".fake()->uuid(),
            'email' => fake()->safeEmail(),
            'avatar' => fake()->imageUrl(),
            'token' => fake()->sha1(),
            'refresh_token' => fake()->sha1(),
            'expires_in' => fake()->numberBetween(300, 7200),
            'scopes' => ['openid', 'profile', 'email'],
        ];
    }
}
