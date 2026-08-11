@extends('dashboard.layout')

@section('page-title', 'Projects')

@section('content')
<div class="dashboard-container finder-projects">
    <div class="finder-projects-header">
        <div><h2>Projects</h2><p>Organize and manage your project work.</p></div>
        <button class="btn btn-primary add-project-button" onclick="document.getElementById('createProject').showModal()">＋ Add Project</button>
    </div>

    <div class="project-toolbar">
        <form class="project-filter" method="GET">
            <input name="search" value="{{ request('search') }}" placeholder="Search projects...">
            <select name="category">
                <option value="">All types</option>
                @foreach($projectTypes as $value => $label)<option value="{{ $value }}" @selected(request('category') === $value)>{{ $label }}</option>@endforeach
            </select>
            <label class="featured-toggle"><input type="checkbox" name="featured" value="1" @checked(request('featured'))><span></span> Featured only</label>
            <button class="btn btn-primary">Apply</button>
            @if(request()->hasAny(['search', 'category', 'featured']))<a href="{{ route('dashboard.projects') }}" class="btn btn-secondary">Clear</a>@endif
        </form>

        <details class="project-type-manager">
            <summary><span>▽</span> Filters <b>{{ $projectTypes->count() }}</b></summary>
            <div class="project-type-panel">
                <header><h3>Filters</h3><form method="POST" action="{{ route('dashboard.project-types.store') }}">@csrf<input name="name" required maxlength="80" placeholder="New type"><button class="btn btn-primary">＋ Create</button></form></header>
                <div class="project-type-list">
                    @foreach($projectTypes as $value => $label)
                        @php($managedType = $managedProjectTypes[$value] ?? null)
                        <div class="project-type-row"><a href="{{ route('dashboard.projects', ['category' => $value]) }}"><span>▽</span><strong>{{ $label }}</strong><b>{{ $projectCounts[$value] ?? 0 }}</b></a>
                            @if($managedType)<details class="project-type-actions"><summary aria-label="Edit {{ $label }}">•••</summary><div>
                                <form method="POST" action="{{ route('dashboard.project-types.update', $managedType->id) }}">@csrf @method('PUT')<input name="name" required maxlength="80" value="{{ $label }}"><button class="btn btn-primary">✎ Save name</button></form>
                                <form method="POST" action="{{ route('dashboard.project-types.delete', $managedType->id) }}" onsubmit="return confirm('Delete this project type?')">@csrf @method('DELETE')<button class="btn btn-danger">⌫ Delete type</button></form>
                            </div></details>@endif
                        </div>
                    @endforeach
                </div>
            </div>
        </details>
    </div>

    <nav class="project-type-tabs" aria-label="Project types">
        <a href="{{ route('dashboard.projects') }}" class="{{ request('category') ? '' : 'active' }}">All Projects <b>{{ $projectCounts->sum() }}</b></a>
        @foreach($projectTypes as $value => $label)<a href="{{ route('dashboard.projects', ['category' => $value]) }}" class="{{ request('category') === $value ? 'active' : '' }}">{{ $label }} <b>{{ $projectCounts[$value] ?? 0 }}</b></a>@endforeach
    </nav>

    <main class="project-library-main">

    <section class="project-card-grid">
        @forelse($projects as $project)
            <a class="project-library-card project-card-{{ Str::slug($project->category) }}" href="{{ route('dashboard.projects.show', $project) }}">
                <span class="project-menu" aria-hidden="true">•••</span>
                <span class="project-folder-orb"><img src="{{ asset('images/project-folder.png') }}" alt=""></span>
                <strong>{{ $project->title }}</strong>
                <span class="project-category">{{ $projectTypes[$project->category] ?? $project->category }}</span>
                <time datetime="{{ $project->updated_at->toDateString() }}">Updated {{ $project->updated_at->format('M d, Y') }}</time>
            </a>
        @empty
            <div class="finder-empty project-card-empty"><img src="{{ asset('images/project-folder.png') }}" alt=""><p>No projects yet. Add your first project.</p></div>
        @endforelse
    </section>
    <footer class="project-count">Showing {{ $projects->count() }} of {{ $projects->count() }} projects</footer>
    </main>
</div>

<style>
.project-toolbar{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:stretch;margin-bottom:26px}.finder-projects .project-toolbar .project-filter{display:grid;grid-template-columns:minmax(240px,1fr) 210px auto auto auto;gap:14px;align-items:center;margin:0;padding:20px}.featured-toggle{display:flex!important;align-items:center;gap:9px;white-space:nowrap}.featured-toggle input{display:none}.featured-toggle span{width:42px;height:24px;border-radius:99px;background:#e6e9f0;transition:.2s}.featured-toggle span:after{content:"";display:block;width:18px;height:18px;margin:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #9aa4b2;transition:.2s}.featured-toggle input:checked+span{background:#6477ed}.featured-toggle input:checked+span:after{transform:translateX(18px)}.project-type-manager{position:relative}.project-type-manager>summary{display:flex;height:100%;min-width:150px;align-items:center;justify-content:center;gap:10px;padding:0 20px;border:1px solid #cbd2ff;border-radius:10px;background:#fff;color:#33415c;cursor:pointer;list-style:none;font-weight:700}.project-type-manager>summary b,.project-type-tabs b{display:inline-grid;min-width:27px;height:27px;place-items:center;border-radius:50%;background:#f0f2f7;color:#64748b;font-size:.75rem}.project-type-panel{position:absolute;z-index:20;top:calc(100% + 12px);right:0;width:390px;padding:18px;border:1px solid #e5e9f1;border-radius:14px;background:#fff;box-shadow:0 18px 45px rgba(34,48,88,.18)}.project-type-panel header{display:grid;gap:14px;margin-bottom:14px}.project-type-panel h3{margin:0}.project-type-panel header form{display:grid;grid-template-columns:1fr auto;gap:8px}.project-type-panel input{min-width:0;width:100%;padding:10px;border:1px solid #dfe4ee;border-radius:8px;font:inherit}.project-type-list{display:grid;gap:8px}.project-type-row{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;border:1px solid #e8ebf2;border-radius:10px}.project-type-row>a{display:flex;gap:10px;align-items:center;padding:12px;color:#26324a;text-decoration:none}.project-type-row>a b{margin-left:auto}.project-type-actions>summary{padding:12px;cursor:pointer;list-style:none}.project-type-actions>div{position:absolute;z-index:2;top:43px;right:8px;width:230px;padding:12px;border:1px solid #e3e7ef;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(34,48,88,.16)}.project-type-actions form{display:grid;gap:8px}.project-type-actions form+form{margin-top:8px}.project-type-actions .btn{width:100%}.project-type-tabs{display:flex;gap:12px;overflow-x:auto;margin-bottom:28px;padding:0 18px;border:1px solid #e5e9f1;border-radius:14px;background:#fff}.project-type-tabs a{display:flex;flex:0 0 auto;gap:10px;align-items:center;padding:20px 14px 16px;border-bottom:3px solid transparent;color:#38445d;text-decoration:none}.project-type-tabs a.active{border-color:#6477ed;color:#5365ea;font-weight:700}@media(max-width:950px){.finder-projects .project-toolbar .project-filter{grid-template-columns:1fr 180px}.project-toolbar{grid-template-columns:1fr}.project-type-manager>summary{min-height:52px}.project-type-panel{left:0;right:auto}}@media(max-width:600px){.finder-projects .project-toolbar .project-filter{grid-template-columns:1fr}.project-type-panel{width:min(390px,calc(100vw - 48px))}}
</style>

<dialog id="createProject" class="project-dialog">
    <div class="dialog-heading"><span class="dialog-project-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z"/><path d="M8 4h8v3"/></svg></span><div><h2>Add New Project</h2><p>Create a new project and add details.</p></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div>
    <form method="POST" action="{{ route('dashboard.projects.store') }}" class="project-form" enctype="multipart/form-data">
        @csrf
        @include('dashboard.project-fields')
        <div class="dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Create Project</button></div>
    </form>
</dialog>

@foreach($projects as $project)
<dialog id="editProject{{ $project->id }}" class="project-dialog">
    <div class="dialog-heading"><span class="dialog-project-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h6l2 2h8v10H4z"/><path d="M8 4h8v3"/></svg></span><div><h2>Edit Project</h2><p>Update {{ $project->title }} and its details.</p></div><button onclick="this.closest('dialog').close()" aria-label="Close">×</button></div>
    <form method="POST" action="{{ route('dashboard.projects.update', $project) }}" class="project-form" enctype="multipart/form-data">
        @csrf @method('PUT')
        @include('dashboard.project-fields', ['project' => $project])
        <div class="dialog-actions"><button type="button" class="btn btn-secondary" onclick="this.closest('dialog').close()">Cancel</button><button class="btn btn-primary">Save changes</button></div>
    </form>
    <form method="POST" action="{{ route('dashboard.projects.delete', $project) }}" class="dialog-delete" onsubmit="return confirm('Delete this project?')">@csrf @method('DELETE')<button class="btn btn-danger">Delete project</button></form>
</dialog>
@endforeach

<script>
document.querySelectorAll('.project-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
@if(request('edit')) document.getElementById('editProject{{ (int) request('edit') }}')?.showModal(); @endif
</script>
@endsection
