<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Notifications\LeadSubmitted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class ContactController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $contacts = Contact::orderBy('created_at', 'desc')->get();
        return response()->json($contacts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:20',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        // simple idempotency guard: if an identical message has been submitted
        // in the last 10 seconds, just return that record instead of inserting
        $duplicate = Contact::where('email', $validated['email'])
            ->where('subject', $validated['subject'])
            ->where('message', $validated['message'])
            ->where('created_at', '>=', now()->subSeconds(10))
            ->first();

        if ($duplicate) {
            return response()->json($duplicate, 200);
        }

        $validated['is_read'] = false;
        $contact = Contact::create($validated);

        rescue(fn () => Notification::route('mail', $contact->email)->notify(new LeadSubmitted($contact)), report: true);
        rescue(fn () => Notification::route('mail', config('mail.lead_recipient'))->notify(new LeadSubmitted($contact, true)), report: true);
        
        return response()->json($contact, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Contact $contact)
    {
        return response()->json($contact);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Contact $contact)
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'email',
            'phone' => 'nullable|string|max:20',
            'subject' => 'string|max:255',
            'message' => 'string',
            'is_read' => 'boolean'
        ]);

        $contact->update($validated);
        return response()->json($contact);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Contact $contact)
    {
        $contact->delete();
        return response()->json(['message' => 'Contact deleted successfully'], 200);
    }

    /**
     * Mark contact as read.
     */
    public function markAsRead(Contact $contact)
    {
        $contact->update(['is_read' => true]);
        return response()->json($contact);
    }

    /**
     * Get unread contacts.
     */
    public function unread()
    {
        $contacts = Contact::where('is_read', false)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json($contacts);
    }
}
