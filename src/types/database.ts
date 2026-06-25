/**
 * Hand-maintained Supabase database types. Keep in sync with
 * `supabase/migrations`. (You can regenerate with the Supabase CLI:
 * `supabase gen types typescript --local > src/types/database.ts`.)
 */

export type LeadStatus = "new" | "contacted" | "booked" | "won" | "lost";
export type LeadSource = "missed_call" | "sms" | "web_form" | "manual" | "test";
export type MessageDirection = "inbound" | "outbound";
export type Channel = "sms" | "web" | "manual";
export type MemberRole = "owner" | "admin" | "member";

export interface BusinessHours {
  [day: string]: { open: string; close: string; closed?: boolean } | undefined;
}

export interface IntakeQuestion {
  key: string;
  label: string;
  required: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  business_type: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  timezone: string | null;
  website: string | null;
  phone: string | null;
  notification_email: string | null;
  notification_phone: string | null;
  booking_link: string | null;
  review_link: string | null;
  business_hours: BusinessHours | null;
  emergency_service: boolean;
  default_response_delay: string | null;
  sms_consent: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface IntakeTemplate {
  id: string;
  organization_id: string;
  service_category_id: string | null;
  name: string | null;
  questions: IntakeQuestion[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  source: LeadSource;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  service_needed: string | null;
  urgency: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  preferred_time: string | null;
  status: LeadStatus;
  lead_score: number | null;
  ai_summary: string | null;
  owner_notes: string | null;
  consent_status: string | null;
  consent_source: string | null;
  opt_out: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  lead_id: string | null;
  channel: Channel;
  status: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  lead_id: string | null;
  direction: MessageDirection;
  channel: string | null;
  from_number: string | null;
  to_number: string | null;
  body: string;
  provider_message_id: string | null;
  ai_generated: boolean;
  status: string | null;
  created_at: string;
}

export interface TwilioNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  twilio_sid: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  lead_id: string | null;
  scheduled_for: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface AiIntakeLog {
  id: string;
  organization_id: string;
  lead_id: string | null;
  conversation_id: string | null;
  provider: string | null;
  model: string | null;
  input_json: unknown;
  output_json: unknown;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
