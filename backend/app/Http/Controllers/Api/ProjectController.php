<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $projects = Project::orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($projects);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|string',
            'technologies' => 'nullable|array',
            'technologies.*' => 'string',
            'github_url' => 'nullable|url',
            'live_url' => 'nullable|url',
            'category' => 'nullable|string|max:100',
            'is_featured' => 'boolean',
            'order' => 'nullable|integer|min:0'
        ]);

        $project = Project::create($validated);
        return response()->json($project, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        return response()->json($project);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'title' => 'string|max:255',
            'description' => 'string',
            'image' => 'nullable|string',
            'technologies' => 'nullable|array',
            'technologies.*' => 'string',
            'github_url' => 'nullable|url',
            'live_url' => 'nullable|url',
            'category' => 'nullable|string|max:100',
            'is_featured' => 'boolean',
            'order' => 'nullable|integer|min:0'
        ]);

        $project->update($validated);
        return response()->json($project);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(['message' => 'Project deleted successfully'], 200);
    }

    /**
     * Get featured projects.
     */
    public function featured()
    {
        $projects = Project::where('is_featured', true)
            ->orderBy('order', 'asc')
            ->get();
        
        return response()->json($projects);
    }

    /**
     * Get projects by category.
     */
    public function byCategory($category)
    {
        $projects = Project::where('category', $category)
            ->orderBy('order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($projects);
    }
}
