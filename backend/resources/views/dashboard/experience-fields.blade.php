@php($experience = $experience ?? null)
<div class="experience-fields">
    <label><span>Role / Job title *</span><input name="title" required value="{{ old('title', $experience?->title) }}"></label>
    <label><span>Company *</span><input name="company" required value="{{ old('company', $experience?->company) }}"></label>
    <label><span>Company logo URL/path</span><input name="logo" placeholder="/experience/company-logo.png" value="{{ old('logo', $experience?->logo) }}"></label>
    <label><span>Company website</span><input type="url" name="website" placeholder="https://company.com" value="{{ old('website', $experience?->website) }}"></label>
    <label><span>Location</span><input name="location" value="{{ old('location', $experience?->location) }}"></label>
    <label><span>Start date *</span><input type="date" name="start_date" required value="{{ old('start_date', $experience?->start_date?->format('Y-m-d')) }}"></label>
    <div class="experience-end-date" style="display:grid;gap:8px">
        <label><span>End date</span><input type="date" name="end_date" value="{{ old('end_date', $experience?->end_date?->format('Y-m-d')) }}"></label>
        <label class="experience-current"><input type="checkbox" name="is_current" value="1" @checked(old('is_current', $experience?->is_current ?? false))><span>Currently working here</span></label>
    </div>
    <label><span>Display order</span><input type="number" min="0" name="order" value="{{ old('order', $experience?->order ?? 0) }}"></label>
    <label class="experience-wide"><span>Short summary</span><input name="summary" value="{{ old('summary', $experience?->summary) }}"></label>
    <label class="experience-wide"><span>Description *</span><textarea name="description" required>{{ old('description', $experience?->description) }}</textarea></label>
    <label class="experience-wide"><span>Key highlights <small>One per line</small></span><textarea name="highlights">{{ old('highlights', $experience ? implode("\n", $experience->highlights ?? []) : '') }}</textarea></label>
    <label class="experience-wide"><span>Technologies <small>Comma separated</small></span><input name="technologies" value="{{ old('technologies', $experience ? implode(', ', $experience->technologies ?? []) : '') }}"></label>
</div>
