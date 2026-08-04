<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Experience;
use Illuminate\Http\Request;

class ExperienceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $experiences = Experience::orderBy('order', 'asc')
            ->orderBy('start_date', 'desc')
            ->get();
        
        return response()->json($experiences);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'is_current' => 'boolean',
            'description' => 'nullable|string',
            'technologies' => 'nullable|array',
            'technologies.*' => 'string',
            'order' => 'nullable|integer|min:0'
        ]);

        $experience = Experience::create($validated);
        return response()->json($experience, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Experience $experience)
    {
        return response()->json($experience);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Experience $experience)
    {
        $validated = $request->validate([
            'title' => 'string|max:255',
            'company' => 'string|max:255',
            'location' => 'nullable|string|max:255',
            'start_date' => 'date',
            'end_date' => 'nullable|date',
            'is_current' => 'boolean',
            'description' => 'nullable|string',
            'technologies' => 'nullable|array',
            'technologies.*' => 'string',
            'order' => 'nullable|integer|min:0'
        ]);

        $experience->update($validated);
        return response()->json($experience);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Experience $experience)
    {
        $experience->delete();
        return response()->json(['message' => 'Experience record deleted successfully'], 200);
    }
}
