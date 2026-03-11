<x-mail::message>
# Trial started

Your trial has started.

@if(!empty($trialEndsAt))
Trial end date: **{{ $trialEndsAt }}**
@endif

We'll notify you if billing requires action.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
