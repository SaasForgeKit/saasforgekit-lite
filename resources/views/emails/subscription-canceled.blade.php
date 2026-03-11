<x-mail::message>
# Subscription canceled

The subscription has been canceled.

@if(!empty($endsAt))
Access end date: **{{ $endsAt }}**
@endif

You can subscribe again anytime from the billing page.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
