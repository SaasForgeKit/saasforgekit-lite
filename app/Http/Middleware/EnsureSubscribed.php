<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscribed
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->hasRole('admin')) {
            return $next($request);
        }

        /** @var Tenant|null $tenant */
        $tenant = tenant();

        if ($tenant && ($tenant->subscribed() || $tenant->onGenericTrial())) {
            return $next($request);
        }

        return redirect()->route('billing');
    }
}
