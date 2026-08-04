<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Appointment;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'total_contacts' => Contact::count(),
            'unread_contacts' => Contact::where('is_read', false)->count(),
            'total_appointments' => Appointment::count(),
        ];

        $contacts = Contact::latest()->paginate(15);
        $appointments = Appointment::with('service')->latest()->paginate(15);

        return view('dashboard.index', compact('stats', 'contacts', 'appointments'));
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
        $appointments = Appointment::with('service')->latest()->paginate(20);
        $stats = [
            'total_appointments' => Appointment::count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
        ];

        return view('dashboard.appointments', compact('appointments', 'stats'));
    }

    public function updateContact(Request $request, Contact $contact)
    {
        $contact->update($request->validate([
            'lead_status' => 'required|in:new,contacted,qualified,closed',
            'admin_notes' => 'nullable|string|max:5000',
            'is_read' => 'required|boolean',
        ]));

        return back()->with('success', 'Contact updated.');
    }

    public function projects()
    {
        return view('dashboard.projects', ['projects' => Project::orderBy('order')->latest()->get()]);
    }

    public function storeProject(Request $request)
    {
        Project::create($this->projectData($request));
        return back()->with('success', 'Project published.');
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
            'category' => 'required|in:web,mobile,desktop,other',
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

}
