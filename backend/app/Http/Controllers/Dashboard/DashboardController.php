<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Appointment;
use App\Models\Project;
use App\Models\Experience;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_contacts' => Contact::count(),
            'unread_contacts' => Contact::where('is_read', false)->count(),
            'qualified_contacts' => Contact::where('lead_status', 'qualified')->count(),
            'total_appointments' => Appointment::count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'total_projects' => Project::count(),
        ];

        $contacts = Contact::latest()->limit(5)->get();
        $appointments = Appointment::with('service')->latest()->limit(5)->get();
        $pipeline = [
            'new' => Contact::where('lead_status', 'new')->count() + Appointment::where('lead_status', 'new')->count(),
            'contacted' => Contact::where('lead_status', 'contacted')->count() + Appointment::where('lead_status', 'contacted')->count(),
            'qualified' => Contact::where('lead_status', 'qualified')->count() + Appointment::where('lead_status', 'qualified')->count(),
            'closed' => Contact::where('lead_status', 'closed')->count() + Appointment::where('lead_status', 'closed')->count(),
        ];

        $activity = collect(range(6, 0))->map(function ($daysAgo) {
            $date = now()->subDays($daysAgo);
            return [
                'label' => $date->format('D'),
                'value' => Contact::whereDate('created_at', $date)->count() + Appointment::whereDate('created_at', $date)->count(),
            ];
        });
        $requestStatuses = Appointment::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $services = Appointment::with('service')->get()
            ->map(fn ($request) => $request->service->title ?? data_get($request->request_data, 'service'))
            ->filter()->countBy()->sortDesc()->take(5);

        return view('dashboard.index', compact('stats', 'contacts', 'appointments', 'pipeline', 'activity', 'requestStatuses', 'services'));
    }

    public function contacts()
    {
        $contacts = Contact::query()
            ->when(request('filter') === 'unread', fn ($query) => $query->where('is_read', false))
            ->when(request('search'), fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")))
            ->latest()->paginate(20)->withQueryString();
        $stats = [
            'total_contacts' => Contact::count(),
            'unread_contacts' => Contact::where('is_read', false)->count(),
        ];

        return view('dashboard.contacts', compact('contacts', 'stats'));
    }

    public function showContact($id)
    {
        $contact = Contact::findOrFail($id);
        
        // Mark as read
        if (!$contact->is_read) {
            $contact->update(['is_read' => true]);
        }

        return view('dashboard.contact-detail', compact('contact'));
    }

    public function deleteContact($id)
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();

        return redirect()->route('dashboard.contacts')->with('success', 'Contact deleted successfully.');
    }

    public function appointments()
    {
        $appointments = Appointment::with('service')
            ->when(request('status'), fn ($query, $status) => $query->where('status', $status))
            ->when(request('search'), fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('client_name', 'like', "%{$search}%")
                ->orWhere('client_email', 'like', "%{$search}%")
                ->orWhere('client_phone', 'like', "%{$search}%")))
            ->latest()->paginate(20)->withQueryString();
        $stats = [
            'total_appointments' => Appointment::count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'confirmed_appointments' => Appointment::where('status', 'confirmed')->count(),
            'completed_appointments' => Appointment::where('status', 'completed')->count(),
        ];

        return view('dashboard.appointments', compact('appointments', 'stats'));
    }

    public function showAppointment(Appointment $appointment)
    {
        return view('dashboard.appointment-detail', ['appointment' => $appointment->load('service')]);
    }

    public function updateAppointment(Request $request, Appointment $appointment)
    {
        $appointment->update($request->validate([
            'status' => 'required|in:pending,confirmed,completed,cancelled',
            'admin_notes' => 'nullable|string|max:5000',
        ]));

        return back()->with('success', 'Project request updated.');
    }

    public function updateContact(Request $request, Contact $contact)
    {
        $contact->update($request->validate([
            'admin_notes' => 'nullable|string|max:5000',
            'is_read' => 'required|boolean',
        ]));

        return back()->with('success', 'Contact updated.');
    }

    public function projects()
    {
        $projectTypes = $this->projectTypes();
        $managedProjectTypes = DB::table('project_types')->orderBy('name')->get()->keyBy('category');
        $projectCounts = Project::selectRaw('category, count(*) as total')->groupBy('category')->pluck('total', 'category');
        $projects = Project::query()
            ->when(request('category'), fn ($query, $category) => $query->where('category', $category))
            ->when(request('featured'), fn ($query) => $query->where('is_featured', true))
            ->when(request('search'), fn ($query, $search) => $query->where('title', 'like', "%{$search}%"))
            ->orderBy('order')->latest()->get();

        return view('dashboard.projects', compact('projects', 'projectCounts', 'projectTypes', 'managedProjectTypes'));
    }

    public function storeProject(Request $request)
    {
        Project::create($this->projectData($request));
        return back()->with('success', 'Project published.');
    }

    public function storeProjectType(Request $request)
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('project_types', 'name'), Rule::unique('project_types', 'category')],
        ]);
        DB::table('project_types')->insert([
            'name' => $data['name'],
            'category' => $data['name'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Project type added.');
    }

    public function updateProjectType(Request $request, int $projectType)
    {
        $type = DB::table('project_types')->find($projectType);
        abort_unless($type, 404);
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('project_types', 'name')->ignore($projectType)],
        ]);

        DB::table('project_types')->where('id', $projectType)->update([
            'name' => $data['name'],
            'updated_at' => now(),
        ]);

        return redirect()->route('dashboard.projects')->with('success', 'Project type updated.');
    }

    public function deleteProjectType(int $projectType)
    {
        $type = DB::table('project_types')->find($projectType);
        abort_unless($type, 404);

        if (Project::where('category', $type->category)->exists()) {
            return back()->withErrors(['project_type' => 'Move projects to another type before deleting this type.']);
        }

        DB::table('project_types')->where('id', $projectType)->delete();
        return redirect()->route('dashboard.projects')->with('success', 'Project type deleted.');
    }

    public function showProject(Project $project)
    {
        $projectTypes = $this->projectTypes();
        return view('dashboard.project-detail', compact('project', 'projectTypes'));
    }

    public function updateProject(Request $request, Project $project)
    {
        $project->update($this->projectData($request));
        return back()->with('success', 'Project updated.');
    }

    public function deleteProject(Project $project)
    {
        Storage::disk('public')->delete(array_filter([$project->poster, ...($project->gallery ?? [])]));
        $project->delete();
        return back()->with('success', 'Project deleted.');
    }

    public function experiences()
    {
        $experiences = Experience::orderBy('order')->orderByDesc('start_date')->get();
        return view('dashboard.experiences', compact('experiences'));
    }

    public function storeExperience(Request $request)
    {
        Experience::create($this->experienceData($request));
        return back()->with('success', 'Experience added.');
    }

    public function updateExperience(Request $request, Experience $experience)
    {
        $experience->update($this->experienceData($request));
        return back()->with('success', 'Experience updated.');
    }

    public function deleteExperience(Experience $experience)
    {
        $experience->delete();
        return back()->with('success', 'Experience deleted.');
    }

    private function experienceData(Request $request): array
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'logo' => 'nullable|string|max:2048',
            'website' => 'nullable|url|max:2048',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_current' => 'boolean',
            'summary' => 'nullable|string|max:1000',
            'description' => 'required|string|max:5000',
            'highlights' => 'nullable|string|max:5000',
            'technologies' => 'nullable|string|max:2000',
            'order' => 'nullable|integer|min:0',
        ]);
        $data['is_current'] = $request->boolean('is_current');
        $data['technologies'] = array_values(array_filter(array_map('trim', explode(',', $data['technologies'] ?? ''))));
        $data['highlights'] = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $data['highlights'] ?? ''))));
        if ($data['is_current']) $data['end_date'] = null;
        return $data;
    }

    private function projectData(Request $request): array
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|string|max:255',
            'poster' => 'nullable|image|max:5120',
            'gallery' => 'nullable|array|max:20',
            'gallery.*' => 'image|max:5120',
            'technologies' => 'nullable|string',
            'github_url' => 'nullable|url',
            'live_url' => 'nullable|url',
            'category' => ['required', 'string', 'max:80', Rule::in($this->projectTypes()->keys()->all())],
            'is_featured' => 'boolean',
            'order' => 'nullable|integer|min:0',
        ]);

        $data['technologies'] = array_values(array_filter(array_map('trim', explode(',', $data['technologies'] ?? ''))));
        $data['is_featured'] = $request->boolean('is_featured');
        unset($data['poster'], $data['gallery']);

        if ($request->hasFile('poster')) {
            if ($request->route('project')?->poster) Storage::disk('public')->delete($request->route('project')->poster);
            $data['poster'] = $request->file('poster')->store('projects/posters', 'public');
        }

        if ($request->hasFile('gallery')) {
            if ($request->route('project')) Storage::disk('public')->delete($request->route('project')->gallery ?? []);
            $data['gallery'] = array_map(fn ($file) => $file->store('projects/gallery', 'public'), $request->file('gallery'));
        }
        return $data;
    }

    private function projectTypes()
    {
        $custom = Project::query()->distinct()->orderBy('category')->pluck('category')
            ->mapWithKeys(fn ($type) => [$type => $type]);

        $saved = DB::table('project_types')->orderBy('name')->pluck('name', 'category');

        return $custom->merge($saved);
    }

}
