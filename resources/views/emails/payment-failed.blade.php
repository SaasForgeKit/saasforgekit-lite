<x-mail::message>
# Payment failed

We could not process a payment.

@if(!empty($invoiceNumber))
Invoice: **{{ $invoiceNumber }}**
@endif

Please update your payment method to avoid service interruption.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
