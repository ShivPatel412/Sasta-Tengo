@extends('dashboard.layout')

@section('page-title', 'Project Request')
@section('header-class', 'lead-dashboard-header')

@section('content')
@php
    $data = $appointment->request_data ?? [];
    $service = $appointment->service->title ?? data_get($data, 'service', 'N/A');
@endphp
@include('dashboard.lead-icons')
<div class="dashboard-container lead-detail-page">
    <a class="lead-back" href="{{ route('dashboard.appointments') }}">← Back to Project Requests</a>
    <header class="lead-header"><div><h2>{{ $appointment->client_name }} <span class="badge badge-{{ $appointment->status }}">{{ ucfirst($appointment->status) }}</span></h2><p>Submitted {{ $appointment->created_at->format('M d, Y h:i A') }} <i>•</i> Request ID: PR-{{ $appointment->created_at->format('Y') }}-{{ str_pad($appointment->id, 4, '0', STR_PAD_LEFT) }}</p></div><nav class="lead-quick-actions" aria-label="Lead actions"><a href="mailto:{{ $appointment->client_email }}"><svg><use href="#lead-email"/></svg>Email</a><a href="tel:{{ $appointment->client_phone }}"><svg><use href="#lead-phone"/></svg>Call</a><a class="lead-edit-action" href="#project-crm"><svg><use href="#lead-notes"/></svg>Edit CRM</a></nav></header>

    <section class="lead-overview"><h3>Lead Overview</h3><div>
        @foreach([['Name', $appointment->client_name, 'user'], ['Email', $appointment->client_email, 'email'], ['Phone', $appointment->client_phone, 'phone'], ['Status', ucfirst($appointment->status), 'status']] as [$label, $value, $icon])
            <article><i><svg><use href="#lead-{{ $icon }}"/></svg></i><span><small>{{ $label }}</small><strong>{{ $value }}</strong></span></article>
        @endforeach
    </div></section>

    <div class="lead-layout">
        <main class="lead-main">
            <section class="lead-card"><h3><i><svg><use href="#lead-details"/></svg></i> Request Information</h3><div class="lead-info-grid">
                @foreach([
                    ['Project type', data_get($data, 'projectType', 'Not provided'), 'star'], ['Service', $service, 'service'],
                    ['Budget', data_get($data, 'budget', 'Not provided'), 'budget'], ['Company', data_get($data, 'company', 'Not provided'), 'company'],
                    ['Timeline', data_get($data, 'timeline', 'Not provided'), 'clock'], ['Country', data_get($data, 'country', 'Not provided'), 'globe'],
                    ['Additional requirements', data_get($data, 'requirementsNotes', 'None'), 'info'], ['Available assets', implode(', ', data_get($data, 'assets', [])) ?: 'None', 'attachment'],
                    ['Features', implode(', ', data_get($data, 'features', [])) ?: 'None', 'star'], ['Other service', data_get($data, 'otherService', 'None'), 'service'],
                ] as [$label, $value, $icon])
                    <article><i><svg><use href="#lead-{{ $icon }}"/></svg></i><span><small>{{ $label }}</small><strong>{{ $value }}</strong></span></article>
                @endforeach
            </div></section>
            <section class="lead-card"><h3><i><svg><use href="#lead-message"/></svg></i> Project Description</h3><div class="lead-message">{{ $appointment->notes ?: 'No project description provided.' }}</div></section>
            @if(filled(data_get($data, 'additionalMessage')))<section class="lead-card"><h3><i><svg><use href="#lead-message"/></svg></i> Additional Message</h3><div class="lead-message">{{ data_get($data, 'additionalMessage') }}</div></section>@endif
        </main>
        <aside class="lead-sidebar"><form id="project-crm" method="POST" action="{{ route('dashboard.appointment-update', $appointment) }}">@csrf @method('PUT')
            <section class="lead-card lead-control-card"><h3><i><svg><use href="#lead-status"/></svg></i> Request Status</h3><label><span>Current status</span><strong class="badge badge-{{ $appointment->status }}">{{ ucfirst($appointment->status) }}</strong></label><label><span>Change status</span><select name="status">@foreach(['pending','confirmed','completed','cancelled'] as $status)<option value="{{ $status }}" @selected($appointment->status === $status)>{{ ucfirst($status) }}</option>@endforeach</select></label></section>
            <section class="lead-card lead-control-card"><h3><i><svg><use href="#lead-notes"/></svg></i> Internal Notes</h3><textarea name="admin_notes" maxlength="5000" placeholder="Add follow-up notes, budget, next action...">{{ $appointment->admin_notes }}</textarea></section>
            <button class="btn btn-primary lead-save">Save Changes</button>
        </form></aside>
    </div>
</div>
@endsection
