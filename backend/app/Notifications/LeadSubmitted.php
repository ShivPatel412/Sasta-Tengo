<?php

namespace App\Notifications;

use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LeadSubmitted extends Notification
{
    use Queueable;

    public function __construct(public Contact $contact, public bool $forAdmin = false)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->forAdmin) {
            return (new MailMessage)
                ->subject("New lead: {$this->contact->subject}")
                ->greeting('New lead received')
                ->line("Name: {$this->contact->name}")
                ->line("Email: {$this->contact->email}")
                ->line('Phone: '.($this->contact->phone ?: 'Not provided'))
                ->line("Subject: {$this->contact->subject}")
                ->line("Message: {$this->contact->message}")
                ->action('Open lead', url("/dashboard/contacts/{$this->contact->id}"));
        }

        return (new MailMessage)
            ->subject('We received your inquiry')
            ->greeting("Hi {$this->contact->name},")
            ->line('Thank you for contacting Shiv Patel. Your inquiry has been received.')
            ->line("Subject: {$this->contact->subject}")
            ->line('I will review your requirements and get back to you soon.')
            ->action('Visit website', url('/'));
    }
}
