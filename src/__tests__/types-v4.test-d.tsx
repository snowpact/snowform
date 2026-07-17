import { z } from 'zod';
import * as z4 from 'zod/v4';

import { SnowForm } from '../SnowForm';
import type { SnowFormProps } from '../types';

// =============================================================================
// Type-level tests: <SnowForm> must accept Zod 3 AND Zod 4 object schemas and
// infer the values type correctly for both. Verified by `tsc --noEmit` (this
// file has no runtime cases; `vitest run` ignores *.test-d.tsx).
// =============================================================================

// --- Zod 3 (must keep working) ---
const v3 = z.object({ name: z.string(), age: z.number() });
const _p3: SnowFormProps<typeof v3> = {
  schema: v3,
  defaultValues: { name: 'a' },
  onSubmit: async values => {
    const n: string = values.name;
    const a: number = values.age;
    void n;
    void a;
  },
};
void _p3;

// --- Zod 4 via SnowFormProps ---
const v4 = z4.object({ name: z4.string(), age: z4.number() });
const _p4: SnowFormProps<typeof v4> = {
  schema: v4,
  defaultValues: { name: 'a' },
  onSubmit: async values => {
    const n: string = values.name;
    const a: number = values.age;
    // @ts-expect-error proves `values` is precisely typed (not `any`): age is a number
    const notString: string = values.age;
    // @ts-expect-error proves unknown keys are rejected
    void values.doesNotExist;
    void n;
    void a;
    void notString;
  },
};
void _p4;

// --- Zod 4 through the actual <SnowForm> component (real consumer usage) ---
const _el4 = (
  <SnowForm
    schema={v4}
    onSubmit={async values => {
      const n: string = values.name;
      void n;
    }}
  />
);
void _el4;

// --- Zod 4 refined object still accepted, values still inferred ---
const v4refined = z4.object({ pwd: z4.string(), confirm: z4.string() }).refine(d => d.pwd === d.confirm);
const _pref: SnowFormProps<typeof v4refined> = {
  schema: v4refined,
  onSubmit: async values => {
    const p: string = values.pwd;
    void p;
  },
};
void _pref;

// --- Regression: a PARTIAL defaultValues must NOT narrow the values type ---
// (defaultValues={{ token }} previously inferred TValues = { token }, dropping `password`.)
const partial = z.object({ token: z.string(), password: z.string() });

const _pPartial: SnowFormProps<typeof partial> = {
  schema: partial,
  defaultValues: { token: 'x' }, // only one of two keys
  onSubmit: async values => {
    const t: string = values.token;
    const p: string = values.password; // must still exist despite partial defaultValues
    void t;
    void p;
  },
};
void _pPartial;

// same via the actual component (the reported repro)
const _elPartial = (
  <SnowForm
    schema={partial}
    defaultValues={{ token: 'x' }}
    onSubmit={async values => {
      const p: string = values.password;
      void p;
    }}
  />
);
void _elPartial;

// a partial fetchDefaultValues must not narrow either
const _pFetch: SnowFormProps<typeof partial> = {
  schema: partial,
  fetchDefaultValues: async () => ({ token: 'x' }),
  onSubmit: async values => {
    const p: string = values.password;
    void p;
  },
};
void _pFetch;

// defaultValues must still be type-checked against the schema (unknown key rejected)
const _pBadKey: SnowFormProps<typeof partial> = {
  schema: partial,
  // @ts-expect-error `nope` is not a field of the schema
  defaultValues: { nope: 'x' },
  onSubmit: async () => {},
};
void _pBadKey;
