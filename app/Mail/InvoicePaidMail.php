<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvoicePaidMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ?string $invoiceNumber = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invoice paid successfully',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.invoice-paid',
            with: [
                'invoiceNumber' => $this->invoiceNumber,
            ],
        );
    }
}
