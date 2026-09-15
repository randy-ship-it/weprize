import type { ProfileStub } from '../types/contest'

/** Phase 1 stubs only. No autofill. Separate postal per person (INSIGHTS). */
export const PROFILE_STUBS: ProfileStub[] = [
  {
    id: 'randy',
    display_name: 'Randy',
    email: 'rgilling@icloud.com',
    phone: '',
    address_line: 'Queen St East',
    city: 'Toronto',
    province: 'ON',
    postal: 'M4E 1G3',
    notes: 'Stub only. Do not autofill to brand sites until Phase 2 rules reviewed.',
  },
  {
    id: 'michael',
    display_name: 'Michael',
    email: 'mike@redrobinmasonry.com',
    phone: '',
    address_line: 'Queensbury',
    city: 'Toronto',
    province: 'ON',
    postal: 'M1N 2X8',
    notes: 'Stub only. Separate postal from Randy. Phone optional until known.',
  },
]
