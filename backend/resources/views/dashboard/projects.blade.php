@extends('dashboard.layout')

@section('page-title', 'Projects')

@section('content')
<div class="dashboard-container finder-projects">
    <div class="finder-projects-header">
        <div><h2>Project Library</h2><p>Open a folder to view and edit project details.</p></div>
        <button class="btn btn-primary add-project-button" onclick="document.getElementById('createProject').showModal()">＋ Add Project</button>
    </div>

    <section class="finder-window">
        <header><span class="finder-dots"><i></i><i></i><i></i></span><strong>All Projects</strong><small>{{ $projects->count() }} folders</small></header>
        <div class="admin-folder-grid">
            @forelse($projects as $project)
                <button class="admin-project-folder" onclick="document.getElementById('editProject{{ $project->id }}').showModal()">
                    <img src="{{ asset('images/project-folder.png') }}" alt="">
                    <strong>{{ $project->title }}</strong>
                    <small>{{ ['web' => 'Web Application', 'desktop' => 'Desktop Application', 'mobile' => 'Mobile Application', 'other' => 'Other'][$project->category] ?? ucfirst($project->category) }}</small>
                </button>
            @empty
                <div class="finder-empty"><img src="{{ asset('images/project-folder.png') }}" alt=""><p>No projects yet. Add your first project.</p></div>
            @endforelse
        </div>
    </section>
</div>

<dialog id="createProject" class="project-dialog">
    <div class="dialog-heading"><div><span>New Project</span><h2>Add project details</h2></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div>
    <form method="POST" action="{{ route('dashboard.projects.store') }}" class="project-form" enctype="multipart/form-data">
        @csrf
        @include('dashboard.project-fields')
        <div class="dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Publish project</button></div>
    </form>
</dialog>

@foreach($projects as $project)
<dialog id="editProject{{ $project->id }}" class="project-dialog">
    <div class="dialog-heading"><div><span>{{ ucfirst($project->category) }} project</span><h2>{{ $project->title }}</h2></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div>
    <form method="POST" action="{{ route('dashboard.projects.update', $project) }}" class="project-form" enctype="multipart/form-data">
        @csrf @method('PUT')
        @include('dashboard.project-fields', ['project' => $project])
        <div class="dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Save changes</button></div>
    </form>
    <form method="POST" action="{{ route('dashboard.projects.delete', $project) }}" class="dialog-delete" onsubmit="return confirm('Delete this project?')">@csrf @method('DELETE')<button class="btn btn-danger">Delete project</button></form>
</dialog>
@endforeach

<script>document.querySelectorAll('.project-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));</script>
@endsection
