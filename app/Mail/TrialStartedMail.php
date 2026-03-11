<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrialStartedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?string $trialEndsAt = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your trial has started',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.trial-started',
            with: [
                'trialEndsAt' => $this->trialEndsAt,
            ],
        );
    }
}
