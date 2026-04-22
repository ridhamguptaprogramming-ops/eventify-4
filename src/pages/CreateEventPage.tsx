import React, { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createEvent } from '../lib/api';

function getDefaultStartDateTimeLocal() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function getDefaultEndDateTimeLocal() {
  const start = new Date(getDefaultStartDateTimeLocal());
  start.setHours(start.getHours() + 3);
  return start.toISOString().slice(0, 16);
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState(getDefaultStartDateTimeLocal);
  const [endDateTime, setEndDateTime] = useState(getDefaultEndDateTimeLocal);
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImageDataUrl, setUploadedImageDataUrl] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [capacity, setCapacity] = useState('100');
  const [ticketPrice, setTicketPrice] = useState('0');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [streamingProvider, setStreamingProvider] = useState<'none' | 'google_meet' | 'youtube' | 'zoom' | 'custom'>('none');
  const [streamingUrl, setStreamingUrl] = useState('');
  const imagePreviewSrc = uploadedImageDataUrl ?? imageUrl.trim();

  const handleImageFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      return;
    }

    const maxFileSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      toast.error('Image must be 4MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        toast.error('Failed to read image file.');
        return;
      }

      setUploadedImageDataUrl(reader.result);
      setUploadedImageName(file.name);
      setImagePreviewError(false);
    };
    reader.onerror = () => {
      toast.error('Failed to read image file.');
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedCapacity = Number(capacity);
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      toast.error('Capacity must be greater than 0.');
      return;
    }
    const parsedTicketPrice = Number(ticketPrice);
    if (Number.isNaN(parsedTicketPrice) || parsedTicketPrice < 0) {
      toast.error('Ticket price must be 0 or more.');
      return;
    }

    const parsedStart = new Date(startDateTime);
    if (Number.isNaN(parsedStart.getTime())) {
      toast.error('Start date/time is invalid.');
      return;
    }

    const parsedEnd = new Date(endDateTime);
    if (Number.isNaN(parsedEnd.getTime()) || parsedEnd.getTime() <= parsedStart.getTime()) {
      toast.error('End date/time must be after start date/time.');
      return;
    }

    setSaving(true);
    if (streamingProvider !== 'none' && streamingUrl.trim().length === 0) {
      toast.error('Streaming URL is required when a streaming provider is selected.');
      setSaving(false);
      return;
    }

    if (streamingUrl.trim().length > 0 && !/^https?:\/\//i.test(streamingUrl.trim())) {
      toast.error('Streaming URL must start with http:// or https://');
      setSaving(false);
      return;
    }

    try {
      const created = await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDateTime: parsedStart.toISOString(),
        endDateTime: parsedEnd.toISOString(),
        image: imagePreviewSrc,
        capacity: parsedCapacity,
        ticketPrice: Math.round(parsedTicketPrice * 100) / 100,
        isHighlighted,
        streamingProvider: streamingProvider,
        streamingUrl: streamingUrl.trim(),
      });

      toast.success('Event created successfully.');
      navigate(`/events/${created.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create event.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/events" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={18} /> Back to Events
        </Link>

        <div className="p-8 md:p-10 rounded-[32px] bg-white/5 border border-white/10">
          <div className="flex items-center gap-3 mb-8">
            <PlusCircle className="text-indigo-400" size={24} />
            <h1 className="text-3xl md:text-4xl font-black text-white">CREATE NEW EVENT</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Event Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="TechX 2027"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="startDateTime" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Start Date & Time
                </label>
                <input
                  id="startDateTime"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  required
                  className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="endDateTime" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  End Date & Time
                </label>
                <input
                  id="endDateTime"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  required
                  className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="capacity" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Capacity
                </label>
                <input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                  className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Main Hall, City Center"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="ticketPrice" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Ticket Price (INR)
                </label>
                <input
                  id="ticketPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  required
                  className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#111b31] px-4 py-3 text-slate-200">
                <input
                  type="checkbox"
                  checked={isHighlighted}
                  onChange={(event) => setIsHighlighted(event.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
                Feature this in Highlights after completion
              </label>
            </div>

            <div>
              <label htmlFor="streamingProvider" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Streaming Provider
              </label>
              <select
                id="streamingProvider"
                value={streamingProvider}
                onChange={(e) => setStreamingProvider(e.target.value as 'none' | 'google_meet' | 'youtube' | 'zoom' | 'custom')}
                className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None / In-person only</option>
                <option value="google_meet">Google Meet</option>
                <option value="youtube">YouTube Live</option>
                <option value="zoom">Zoom</option>
                <option value="custom">Custom streaming URL</option>
              </select>
            </div>

            {streamingProvider !== 'none' && (
              <div>
                <label htmlFor="streamingUrl" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Streaming URL
                </label>
                <input
                  id="streamingUrl"
                  type="url"
                  value={streamingUrl}
                  onChange={(e) => setStreamingUrl(e.target.value)}
                  required
                  className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                />
              </div>
            )}

            <div>
              <label htmlFor="image" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Event Image
              </label>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  handleImageFiles(event.dataTransfer.files);
                }}
                className={`mb-4 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                  isDragOver
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : 'border-white/20 bg-white/5'
                }`}
              >
                <p className="text-white font-medium mb-2">Drag & drop image here</p>
                <p className="text-slate-400 text-sm mb-4">or</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Choose Image File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageFiles(event.target.files)}
                />
                {uploadedImageName && (
                  <p className="mt-3 text-sm text-teal-300">Uploaded: {uploadedImageName}</p>
                )}
              </div>

              <input
                id="image"
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePreviewError(false);
                }}
                className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional image URL (used if no file is uploaded)"
              />
              {uploadedImageDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImageDataUrl(null);
                    setUploadedImageName('');
                    setImagePreviewError(false);
                  }}
                  className="mt-3 text-sm text-slate-300 hover:text-white underline underline-offset-4 transition-colors"
                >
                  Remove uploaded image
                </button>
              )}
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#111b31] overflow-hidden">
                {imagePreviewSrc && !imagePreviewError ? (
                  <img
                    src={imagePreviewSrc}
                    alt="Event preview"
                    className="w-full h-56 object-cover"
                    referrerPolicy="no-referrer"
                    onLoad={() => setImagePreviewError(false)}
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-400 text-sm px-4 text-center">
                    {imagePreviewSrc
                      ? 'Unable to load image preview. Please check the URL.'
                      : 'Live preview will appear here after upload or image URL input.'}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                className="w-full bg-[#111b31] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Describe what attendees can expect from this event."
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all"
            >
              <PlusCircle size={18} />
              {saving ? 'Creating Event...' : 'Create Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
