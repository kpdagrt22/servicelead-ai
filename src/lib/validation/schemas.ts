import { z } from "zod";
import { URGENCY_LEVELS } from "@/lib/constants";

/** Onboarding — collect business profile + consent. */
export const onboardingSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Your name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Business phone is required"),
  website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  state: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  timezone: z.string().min(2, "Time zone is required"),
  businessType: z.string().optional().or(z.literal("")),
  serviceCategories: z.array(z.string()).default([]),
  emergencyService: z.boolean().default(false),
  defaultResponseDelay: z.string().optional().or(z.literal("")),
  notificationEmail: z.string().email("Valid email required"),
  notificationPhone: z.string().optional().or(z.literal("")),
  bookingLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  reviewLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  smsConsent: z
    .boolean()
    .refine((v) => v === true, "You must confirm SMS consent compliance"),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Public intake form (customer-facing). */
export const publicIntakeSchema = z.object({
  organizationId: z.string().uuid().optional(),
  slug: z.string().optional(),
  customerName: z.string().optional().or(z.literal("")),
  customerPhone: z.string().min(7, "A phone number is required so we can follow up"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  serviceNeeded: z.string().min(2, "Please tell us what you need"),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  address: z.string().optional().or(z.literal("")),
  details: z.string().min(2, "Please describe the issue"),
  preferredTime: z.string().optional().or(z.literal("")),
  consent: z
    .boolean()
    .refine((v) => v === true, "Please agree to be contacted about your request"),
});
export type PublicIntakeInput = z.infer<typeof publicIntakeSchema>;

/** Simulator input. */
export const simulatorSchema = z.object({
  scenario: z.enum(["missed_call", "sms", "web_form"]),
  customerName: z.string().optional().or(z.literal("")),
  customerPhone: z.string().min(7, "Phone number required"),
  service: z.string().max(120).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});
export type SimulatorInput = z.infer<typeof simulatorSchema>;

/** Service category create/update. */
export const serviceCategorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const intakeQuestionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean(),
});
