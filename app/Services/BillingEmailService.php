<?php

namespace App\Services;

use App\Mail\InvoicePaidMail;
use App\Mail\PaymentFailedMail;
use App\Mail\SubscriptionActivatedMail;
use App\Mail\SubscriptionCanceledMail;
use App\Mail\TrialStartedMail;
use App\Mail\WelcomeRegisteredMail;
use App\Models\AppSetting;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

class BillingEmailService
{
    public function sendSubscriptionActivated(Tenant $tenant, ?string $status = null): void
    {
        $this->sendToOwner(
            tenant: $tenant,
            toggleKey: 'emails_subscription_activated_enabled',
            mailable: new SubscriptionActivatedMail($status),
        );
    }

    public function sendTrialStarted(Tenant $tenant, ?string $trialEndsAt = null): void
    {
        $this->sendToOwner(
            tenant: $tenant,
            toggleKey: 'emails_trial_started_enabled',
            mailable: new TrialStartedMail($trialEndsAt),
        );
    }

    public function sendPaymentFailed(Tenant $tenant, ?string $invoiceNumber = null): void
    {
        $this->sendToOwner(
            tenant: $tenant,
            toggleKey: 'emails_payment_failed_enabled',
            mailable: new PaymentFailedMail($invoiceNumber),
        );
    }

    public function sendSubscriptionCanceled(Tenant $tenant, ?string $endsAt = null): void
    {
        $this->sendToOwner(
            tenant: $tenant,
            toggleKey: 'emails_subscription_canceled_enabled',
            mailable: new SubscriptionCanceledMail($endsAt),
        );
    }

    public function sendInvoicePaid(Tenant $tenant, ?string $invoiceNumber = null): void
    {
        $this->sendToOwner(
            tenant: $tenant,
            toggleKey: 'emails_invoice_paid_enabled',
            mailable: new InvoicePaidMail($invoiceNumber),
        );
    }

    public function sendWelcomeRegistered(User $user): void
    {
        if (! $this->emailsEnabled('emails_welcome_enabled')) {
            return;
        }

        if ($user->email === '') {
            return;
        }

        Mail::to($user->email)->send(new WelcomeRegisteredMail(
            name: $user->name,
        ));
    }

    public function emailsEnabled(string $toggleKey): bool
    {
        return AppSetting::getBoolean('emails_enabled', true)
            && AppSetting::getBoolean($toggleKey, true);
    }

    protected function sendToOwner(Tenant $tenant, string $toggleKey, Mailable $mailable): void
    {
        if (! $this->emailsEnabled($toggleKey)) {
            return;
        }

        $owner = $tenant->owner;
        if (! $owner || $owner->email === '') {
            return;
        }

        Mail::to($owner->email)->send($mailable);
    }
}
