<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProjectRequestSubmitted extends Notification
{
    use Queueable;

    public function __construct(public Appointment $request, public bool $forAdmin = false)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->request->request_data;

        if ($this->forAdmin) {
            return (new MailMessage)
                ->subject("New project request: {$data['service']}")
                ->greeting('New project request received')
                ->line("Name: {$this->request->client_name}")
                ->line("Email: {$this->request->client_email}")
                ->line("Phone: {$this->request->client_phone}")
                ->line("Project type: {$data['projectType']}")
                ->line("Budget: {$data['budget']}")
                ->line("Timeline: {$data['timeline']}")
                ->action('Open project request', url("/dashboard/appointments/{$this->request->id}"));
        }

        return (new MailMessage)
            ->subject('We received your project request')
            ->greeting("Hi {$this->request->client_name},")
            ->line('Thank you for sharing your project requirements. Your request has been received.')
            ->line("Service: {$data['service']}")
            ->line('I will review the details and get back to you soon.')
            ->action('Visit website', url('/'));
    }
}
