<x-mail::message>
# Subscription activated

Your subscription is now active.

@if(!empty($status))
Current status: **{{ $status }}**
@endif

You now have full paid access to billing features.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
