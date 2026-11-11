// Shared contracts: enums and validation used by server actions and forms.
// Changing this file affects every module, so it needs all four members to approve.
import { z } from 'zod'

export const CONDITIONS = ['new', 'like_new', 'good', 'fair'] as const
export const LISTING_TYPES = ['rent', 'sell', 'both'] as const
export const ITEM_STATUSES = ['active', 'unavailable', 'sold', 'removed'] as const
export const BOOKING_STATUSES = [
  'pending', 'approved', 'rejected', 'cancelled', 'active', 'completed', 'expired',
] as const

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0).max(1_000_000).optional()
)

export const listingSchema = z
  .object({
    title: z.string().trim().min(3, 'Title needs at least 3 characters').max(120),
    description: z.string().trim().max(2000).default(''),
    category_id: z.coerce.number().int().positive('Choose a category'),
    condition: z.enum(CONDITIONS),
    listing_type: z.enum(LISTING_TYPES),
    rent_price_per_day: optionalNumber,
    sale_price: optionalNumber,
    deposit: z.preprocess((v) => (v === '' ? 0 : v), z.coerce.number().min(0).max(1_000_000)),
    pickup_area: z.string().trim().max(100).default(''),
    image_path: z.string().max(300).optional(),
    upi_enabled: z.preprocess((v) => v === 'true', z.boolean()),
upi_id: z.string().trim().max(255).default(''),
upi_name: z.string().trim().max(100).default(''),
  })
  .superRefine((v, ctx) => {
    if (v.listing_type !== 'sell' && v.rent_price_per_day === undefined) {
      ctx.addIssue({ code: 'custom', path: ['rent_price_per_day'], message: 'Enter a price per day' })
    }
    if (v.listing_type !== 'rent' && v.sale_price === undefined) {
      ctx.addIssue({ code: 'custom', path: ['sale_price'], message: 'Enter a sale price' })
    }
    if (v.listing_type !== 'sell' && v.upi_enabled) {
  if (!v.upi_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['upi_id'],
      message: 'Enter your UPI ID',
    })
  } else if (!/^[^@\s]+@[^@\s]+$/.test(v.upi_id)) {
    ctx.addIssue({
      code: 'custom',
      path: ['upi_id'],
      message: 'Enter a valid UPI ID, e.g. name@okaxis',
    })
  }

  if (!v.upi_name) {
    ctx.addIssue({
      code: 'custom',
      path: ['upi_name'],
      message: 'Enter the UPI account holder name',
    })
  }
}
  })

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a valid date')

export const bookingSchema = z
  .object({ item_id: z.string().uuid(), start_date: isoDate, end_date: isoDate })
  .refine((v) => v.end_date >= v.start_date, {
    path: ['end_date'],
    message: 'End date must be on or after the start date',
  })

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  return issue.message
}
