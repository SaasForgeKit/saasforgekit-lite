<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InitializeTenancyByUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->tenant_id && ! tenancy()->initialized) {
            tenancy()->initialize($user->tenant);
        }

        if ($user && ! tenancy()->initialized) {
            abort(403, 'Tenant context could not be established.');
        }

        return $next($request);
    }

    public function terminate(): void
    {
        if (tenancy()->initialized) {
            tenancy()->end();
        }
    }
}
