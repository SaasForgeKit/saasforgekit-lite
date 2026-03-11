<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionActivatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?string $status = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your subscription is active',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.subscription-activated',
            with: [
                'status' => $this->status,
            ],
        );
    }
}
