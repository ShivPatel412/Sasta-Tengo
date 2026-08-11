@extends('dashboard.layout')

@section('page-title', 'Experience')

@section('content')
<div class="dashboard-container experience-admin-page">
    <header class="experience-admin-header"><div><h2>Experience</h2><p>Manage the work history displayed on your portfolio.</p></div><button class="btn btn-primary" onclick="document.getElementById('createExperience').showModal()">＋ Add Experience</button></header>
    <section class="experience-admin-list">
        @forelse($experiences as $experience)
            <article><div class="experience-admin-icon">{{ strtoupper(substr($experience->company, 0, 1)) }}</div><div><h3>{{ $experience->title }}</h3><p>{{ $experience->company }}@if($experience->location) · {{ $experience->location }}@endif</p><time>{{ $experience->start_date->format('M Y') }} — {{ $experience->is_current ? 'Present' : $experience->end_date?->format('M Y') }}</time><div class="experience-admin-tags">@foreach($experience->technologies ?? [] as $technology)<span>{{ $technology }}</span>@endforeach</div></div><button class="btn btn-outline" onclick="document.getElementById('editExperience{{ $experience->id }}').showModal()">Edit</button></article>
        @empty
            <div class="experience-empty">No experience records yet. Add your first position.</div>
        @endforelse
    </section>
</div>

<dialog id="createExperience" class="experience-dialog"><div class="experience-dialog-header"><div><h2>Add Experience</h2><p>Create a new work-history entry.</p></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div><form method="POST" action="{{ route('dashboard.experiences.store') }}">@csrf @include('dashboard.experience-fields')<div class="experience-dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Add Experience</button></div></form></dialog>

@foreach($experiences as $experience)
<dialog id="editExperience{{ $experience->id }}" class="experience-dialog"><div class="experience-dialog-header"><div><h2>Edit Experience</h2><p>{{ $experience->company }} · {{ $experience->title }}</p></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div><form method="POST" action="{{ route('dashboard.experiences.update', $experience) }}">@csrf @method('PUT') @include('dashboard.experience-fields', ['experience' => $experience])<div class="experience-dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Save Changes</button></div></form><form class="experience-delete" method="POST" action="{{ route('dashboard.experiences.delete', $experience) }}" onsubmit="return confirm('Delete this experience?')">@csrf @method('DELETE')<button class="btn btn-danger">Delete Experience</button></form></dialog>
@endforeach

<script>
document.querySelectorAll('.experience-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
document.querySelectorAll('.experience-end-date').forEach(group => {
    const current = group.querySelector('[name="is_current"]');
    const endDate = group.querySelector('[name="end_date"]');
    const syncEndDate = () => {
        endDate.disabled = current.checked;
        if (current.checked) endDate.value = '';
    };
    current.addEventListener('change', syncEndDate);
    syncEndDate();
});
</script>
@endsection
