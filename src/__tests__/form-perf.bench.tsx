import { cleanup, fireEvent, render } from '@testing-library/react';
import { beforeAll, bench, describe } from 'vitest';
import { z } from 'zod';
import * as z4 from 'zod/v4';

import { SnowForm } from '../SnowForm';
import { resetSnowForm, setupSnowForm } from '../registry';
import type { RegisteredComponentProps } from '../types';
import { getZodFieldInfo, getZodShape } from '../utils';

// =============================================================================
// Form perf — Zod 3 (ancien) vs Zod 4 (nouveau), small vs large form, with
// interactions. Run: pnpm exec vitest bench src/__tests__/form-perf.bench.tsx
//
//   mount          — initial render of <SnowForm>
//   introspection  — snowform's per-render work (getZodShape + getZodFieldInfo)
//   validation     — schema.safeParse (fires on submit / on each edit after submit)
//   interaction    — render + type a field + submit (full React+RHF+zod roundtrip)
// =============================================================================

const KINDS = ['string', 'email', 'number', 'boolean', 'enum', 'date'] as const;
type Kind = (typeof KINDS)[number];

function buildSet(n: number) {
  const fields = Array.from({ length: n }, (_, i) => ({ name: `field${i}`, kind: KINDS[i % KINDS.length] as Kind }));
  const mkShape = (f: (k: Kind) => unknown): Record<string, unknown> => {
    const shape: Record<string, unknown> = {};
    for (const fl of fields) shape[fl.name] = f(fl.kind);
    return shape;
  };
  const v3 = z.object(
    mkShape(k =>
      k === 'string'
        ? z.string()
        : k === 'email'
          ? z.string().email()
          : k === 'number'
            ? z.number()
            : k === 'boolean'
              ? z.boolean()
              : k === 'enum'
                ? z.enum(['a', 'b', 'c'])
                : z.date()
    ) as z.ZodRawShape
  );
  const v4 = z4.object(
    mkShape(k =>
      k === 'string'
        ? z4.string()
        : k === 'email'
          ? z4.string().email()
          : k === 'number'
            ? z4.number()
            : k === 'boolean'
              ? z4.boolean()
              : k === 'enum'
                ? z4.enum(['a', 'b', 'c'])
                : z4.date()
    ) as z4.ZodRawShape
  );
  const data: Record<string, unknown> = {};
  for (const fl of fields) {
    data[fl.name] =
      fl.kind === 'number'
        ? 42
        : fl.kind === 'boolean'
          ? true
          : fl.kind === 'enum'
            ? 'a'
            : fl.kind === 'date'
              ? new Date('2024-01-01')
              : fl.kind === 'email'
                ? 'user@example.com'
                : 'hello';
  }
  return { v3, v4, data };
}

const SMALL = buildSet(5);
const LARGE = buildSet(40);

// Minimal components so <SnowForm> can mount every field type.
const Input = ({ value, onChange, name }: RegisteredComponentProps<string>) => (
  <input data-testid={name} value={value ?? ''} onChange={e => onChange(e.target.value)} />
);
const NumberInput = ({ value, onChange, name }: RegisteredComponentProps<number>) => (
  <input type="number" data-testid={name} value={value ?? ''} onChange={e => onChange(Number(e.target.value))} />
);
const Checkbox = ({ value, onChange, name }: RegisteredComponentProps<boolean>) => (
  <input type="checkbox" data-testid={name} checked={value ?? false} onChange={e => onChange(e.target.checked)} />
);
const Select = ({ value, onChange, name, options }: RegisteredComponentProps<string>) => (
  <select data-testid={name} value={value ?? ''} onChange={e => onChange(e.target.value)}>
    {options?.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

beforeAll(() => {
  resetSnowForm();
  setupSnowForm({
    translate: (k: string) => k,
    components: { text: Input, email: Input, number: NumberInput, checkbox: Checkbox, select: Select, date: Input },
    submitButton: ({ children }) => <button type="submit">{children ?? 'submit'}</button>,
  });
});

// One realistic interaction: render, type into the first field, submit (validates
// every field), let the async validation settle.
async function fillAndSubmit(schema: z.ZodTypeAny) {
  const { container } = render(<SnowForm schema={schema as never} onSubmit={async () => {}} />);
  const first = container.querySelector('[data-testid="field0"]');
  if (first) fireEvent.change(first, { target: { value: 'hello' } });
  const form = container.querySelector('form');
  if (form) fireEvent.submit(form);
  await new Promise(r => setTimeout(r, 0));
  cleanup();
}

describe('mount · small (5)', () => {
  bench('zod 3', () => void (render(<SnowForm schema={SMALL.v3} />), cleanup()));
  bench('zod 4', () => void (render(<SnowForm schema={SMALL.v4} />), cleanup()));
});
describe('mount · large (40)', () => {
  bench('zod 3', () => void (render(<SnowForm schema={LARGE.v3} />), cleanup()));
  bench('zod 4', () => void (render(<SnowForm schema={LARGE.v4} />), cleanup()));
});

describe('introspection · small (5)', () => {
  bench('zod 3', () => {
    const s = getZodShape(SMALL.v3);
    for (const f of Object.values(s)) getZodFieldInfo(f);
  });
  bench('zod 4', () => {
    const s = getZodShape(SMALL.v4);
    for (const f of Object.values(s)) getZodFieldInfo(f);
  });
});
describe('introspection · large (40)', () => {
  bench('zod 3', () => {
    const s = getZodShape(LARGE.v3);
    for (const f of Object.values(s)) getZodFieldInfo(f);
  });
  bench('zod 4', () => {
    const s = getZodShape(LARGE.v4);
    for (const f of Object.values(s)) getZodFieldInfo(f);
  });
});

describe('validation safeParse · small (5)', () => {
  bench('zod 3', () => void SMALL.v3.safeParse(SMALL.data));
  bench('zod 4', () => void SMALL.v4.safeParse(SMALL.data));
});
describe('validation safeParse · large (40)', () => {
  bench('zod 3', () => void LARGE.v3.safeParse(LARGE.data));
  bench('zod 4', () => void LARGE.v4.safeParse(LARGE.data));
});

describe('interaction: type + submit · small (5)', () => {
  bench('zod 3', async () => await fillAndSubmit(SMALL.v3));
  bench('zod 4', async () => await fillAndSubmit(SMALL.v4 as never));
});
describe('interaction: type + submit · large (40)', () => {
  bench('zod 3', async () => await fillAndSubmit(LARGE.v3));
  bench('zod 4', async () => await fillAndSubmit(LARGE.v4 as never));
});
