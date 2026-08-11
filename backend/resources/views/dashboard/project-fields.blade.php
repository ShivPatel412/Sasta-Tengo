@php($project = $project ?? null)
<div class="project-form-sections">
    <section class="project-form-section">
        <h3>Basic Information</h3>
        <div class="project-fields project-basic-fields">
            <label class="field"><span>Project title <b>*</b></span><input name="title" required placeholder="Enter project title" value="{{ old('title', $project?->title) }}"></label>
            <label class="field"><span>Project type <b>*</b></span><select name="category" required>
                @foreach($projectTypes as $value => $label)
                    <option value="{{ $value }}" @selected(old('category', $project?->category ?? 'web') === $value)>{{ $label }}</option>
                @endforeach
            </select></label>
            <label class="field"><span>Fallback image filename</span><input name="image" placeholder="project-preview.jpg" value="{{ old('image', $project?->image) }}"></label>
        </div>
    </section>

    <section class="project-form-section">
        <h3>Images</h3>
        <div class="project-fields project-image-fields">
            <label class="field upload-field"><span>Poster image <small>Shown on the left</small></span><span class="upload-drop"><b>▧</b><strong>Upload image</strong><small>PNG, JPG up to 5MB</small><input type="file" name="poster" accept="image/*"></span>@if($project?->poster)<small>Current: {{ basename($project->poster) }}</small>@endif</label>
            <label class="field upload-field"><span>Gallery images <small>Select multiple</small></span><span class="upload-drop"><b>▧</b><strong>Upload images</strong><small>PNG, JPG up to 5MB</small><input type="file" name="gallery[]" accept="image/*" multiple></span>@if($project?->gallery)<small>{{ count($project->gallery) }} image(s) saved</small>@endif</label>
        </div>
    </section>

    <section class="project-form-section">
        <h3>Links &amp; Details</h3>
        <div class="project-fields project-detail-fields">
            <label class="field field-tech"><span>Tech stack</span><input name="technologies" placeholder="React, Laravel, MySQL" value="{{ old('technologies', $project ? implode(', ', $project->technologies ?? []) : '') }}"></label>
            <label class="field"><span>GitHub URL <small>Optional</small></span><input type="url" name="github_url" placeholder="https://github.com/username/project" value="{{ old('github_url', $project?->github_url) }}"></label>
            <label class="field"><span>Live URL <small>Optional</small></span><input type="url" name="live_url" placeholder="https://yourwebsite.com" value="{{ old('live_url', $project?->live_url) }}"></label>
            <label class="field field-order"><span>Order</span><input type="number" name="order" min="0" value="{{ old('order', $project?->order ?? 0) }}"></label>
            <label class="field field-wide"><span>What did you build? <b>*</b></span><textarea name="description" required placeholder="Describe what you built in this project...">{{ old('description', $project?->description) }}</textarea></label>
            <label class="featured-check field-wide"><input type="checkbox" name="is_featured" value="1" @checked(old('is_featured', $project?->is_featured ?? false))><span>Featured project</span></label>
        </div>
    </section>
</div>
