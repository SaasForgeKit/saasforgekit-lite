<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionCanceledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?string $endsAt = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your subscription has been canceled',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.subscription-canceled',
            with: [
                'endsAt' => $this->endsAt,
            ],
        );
    }
}
