<x-mail::message>
# Invoice paid

Payment was received successfully.

@if(!empty($invoiceNumber))
Invoice: **{{ $invoiceNumber }}**
@endif

No action is required.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
