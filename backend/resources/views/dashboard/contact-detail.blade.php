@extends('dashboard.layout')

@section('page-title', $contact->name)

@section('content')
<div class="dashboard-container">
    <div class="back-link">
        <a href="{{ route('dashboard.contacts') }}">← Back to Contacts</a>
    </div>

    <div class="section contact-detail">
        <div class="detail-header">
            <div>
                <h2>{{ $contact->name }}</h2>
                <p class="detail-meta">{{ $contact->created_at->setTimezone(config('app.timezone'))->format('M d, Y h:i A') }}</p>
            </div>
            <span class="badge {{ $contact->is_read ? 'badge-read' : 'badge-unread' }}">
                {{ $contact->is_read ? 'Read' : 'Unread' }}
            </span>
        </div>

        <div class="detail-content">
            <div class="detail-group">
                <label>Email</label>
                <a href="mailto:{{ $contact->email }}" class="detail-value">{{ $contact->email }}</a>
            </div>

            <div class="detail-group">
                <label>Phone</label>
                <p class="detail-value">
                    @if($contact->phone)
                        <a href="tel:{{ $contact->phone }}">{{ $contact->phone }}</a>
                    @else
                        <span class="text-muted">Not provided</span>
                    @endif
                </p>
            </div>

            <div class="detail-group">
                <label>Subject</label>
                <p class="detail-value">{{ $contact->subject }}</p>
            </div>

            <div class="detail-group">
                <label>Message</label>
                <div class="message-box">
                    {{ $contact->message }}
                </div>
            </div>

            <div class="detail-group">
                <label>Submitted Date</label>
                <p class="detail-value">{{ $contact->created_at->setTimezone(config('app.timezone'))->format('F d, Y \a\t h:i A') }}</p>
            </div>
        </div>

        <form method="POST" action="{{ route('dashboard.contact-update', $contact) }}" class="crm-editor">
            @csrf @method('PUT')
            <label><span>Lead stage</span><select name="lead_status">@foreach(['new' => 'New lead', 'contacted' => 'Contacted', 'qualified' => 'Qualified', 'closed' => 'Closed'] as $value => $label)<option value="{{ $value }}" @selected($contact->lead_status === $value)>{{ $label }}</option>@endforeach</select></label>
            <label><span>Message status</span><select name="is_read"><option value="1" @selected($contact->is_read)>Read</option><option value="0" @selected(!$contact->is_read)>Unread</option></select></label>
            <label class="crm-notes"><span>Internal notes</span><textarea name="admin_notes" placeholder="Add follow-up notes, requirements or next steps...">{{ $contact->admin_notes }}</textarea></label>
            <button class="btn btn-primary">Save CRM details</button>
        </form>

        <div class="detail-actions">
            <form action="{{ route('dashboard.contact-delete', $contact->id) }}" method="POST" style="display:inline;">
                @csrf
                @method('DELETE')
                <button type="submit" class="btn btn-danger" onclick="return confirm('Are you sure?')">Delete Contact</button>
            </form>
            <a href="{{ route('dashboard.contacts') }}" class="btn btn-secondary">Back</a>
        </div>
    </div>
</div>
@endsection
