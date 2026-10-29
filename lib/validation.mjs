import { z } from 'zod';
const text = (n = 255) => z.string().trim().min(1).max(n);
const optional = (n = 255) => z.string().trim().max(n).nullish();
const url = z.union([z.literal(''), z.url().max(2048).refine(v => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS URL')]).nullish();
const media = z.string().max(2048).refine(v => !v || /^https?:\/\//i.test(v) || (!v.includes('..') && !/[\\\x00-\x1f]/.test(v) && !/^[a-z]+:/i.test(v)), 'Invalid media path').nullish();
const email = z.email().max(255);
const list = z.array(text(1000)).max(30).default([]);
const order = z.number().int().min(0).max(2147483647).default(0);
const date = z.iso.date();
export const loginSchema = z.object({ email, password: z.string().min(1).max(1024) }).strict();
export const contactSchema = z.object({ name: text(), email, phone: optional(20), subject: text(), message: text(5000) }).strict();
export const appointmentSchema = z.object({
  service_id: z.coerce.number().int().positive(), client_name: text(), client_email: email,
  client_phone: text(20), appointment_date: z.string().max(40).refine(v => !Number.isNaN(Date.parse(v)) && Date.parse(v) > Date.now(), 'Choose a future date'), notes: optional(5000)
}).strict();
export const requestSchema = z.object({
  service: text(), addSomethingElse: z.boolean().optional(), otherService: optional(1000),
  projectType: text(), description: text(5000), existingUrl: url,
  inspirationUrls: optional(5000), features: z.array(text(255)).max(30).default([]), assets: z.array(text(255)).max(30).default([]), requirementsNotes: optional(5000),
  budget: text(), timeline: text(), fullName: text(), company: optional(), email,
  phone: text(20), country: text(), additionalMessage: optional(5000),
  confirmed: z.union([z.literal(true), z.literal('yes'), z.literal('on'), z.literal(1), z.literal('1')])
}).strict();
export const projectSchema = z.object({
  title: text(), description: text(10000), image: media, poster: media,
  gallery: z.array(media.unwrap().unwrap()).max(20).optional(), technologies: list,
  github_url: url, live_url: url, category: text(80), is_featured: z.boolean().default(false), order
}).strict();
export const experienceSchema = z.object({
  title: text(), company: text(), logo: media, website: url, location: optional(),
  start_date: date, end_date: date.nullish(), is_current: z.boolean().default(false),
  description: text(5000), summary: optional(1000), highlights: list, technologies: list, order
}).strict().refine(v => v.is_current || !v.end_date || v.end_date >= v.start_date, { message: 'End date precedes start date', path: ['end_date'] });
export const typeSchema = z.object({ name: text(80) }).strict();
export const contactUpdate = z.object({ admin_notes: optional(5000), is_read: z.boolean(), lead_status: z.enum(['new','contacted','qualified','closed']).optional() }).strict();
export const appointmentUpdate = z.object({ status: z.enum(['pending','confirmed','completed','cancelled']), admin_notes: optional(5000), lead_status: z.enum(['new','contacted','qualified','closed']).optional() }).strict();
export function storageData(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? JSON.stringify(value) : value ?? null]));
}
export function serialize(row, table, mediaBase = process.env.MEDIA_BASE_URL || '/storage/') {
  const result = { ...row };
  for (const key of ['technologies','gallery','highlights','request_data']) {
    if (typeof result[key] === 'string') result[key] = JSON.parse(result[key]);
  }
  for (const key of ['is_featured','is_active','is_current','is_read']) if (key in result) result[key] = Boolean(Number(result[key]));
  if (table === 'projects') {
    const resolve = path => /^https?:\/\//i.test(path) ? path : mediaBase + path.replace(/^\/+/, '');
    result.poster_url = result.poster ? resolve(result.poster) : null;
    result.gallery_urls = (result.gallery || []).map(resolve);
  }
  return result;
}
