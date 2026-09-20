import { describe, expect, it } from 'vitest';
import * as z4 from 'zod/v4';

import { getZodFieldInfo, getZodShape } from '../utils';

// =============================================================================
// Zod 4 introspection — mirrors the Zod 3 contract in utils.test.ts but against
// schemas built with the `zod/v4` subpath (shipped by zod 3.25). The internal
// shape changed entirely in v4 (`_zod.def` instead of `_def`, ZodEffects removed,
// enum `entries`, array `element`, string-format `checks`/`format`), so snowform's
// introspection must branch on the schema version at runtime.
// =============================================================================

describe('getZodFieldInfo with Zod 4 schemas', () => {
  it('should detect string type', () => {
    const info = getZodFieldInfo(z4.string());
    expect(info.baseType).toBe('string');
    expect(info.isOptional).toBe(false);
    expect(info.isEmail).toBe(false);
  });

  it('should detect email validation (deprecated .email() form)', () => {
    const info = getZodFieldInfo(z4.string().email());
    expect(info.baseType).toBe('string');
    expect(info.isEmail).toBe(true);
  });

  it('should detect email validation (top-level z.email() form)', () => {
    const info = getZodFieldInfo(z4.email());
    expect(info.baseType).toBe('string');
    expect(info.isEmail).toBe(true);
  });

  it('should detect optional fields', () => {
    const info = getZodFieldInfo(z4.string().optional());
    expect(info.baseType).toBe('string');
    expect(info.isOptional).toBe(true);
  });

  it('should detect nullable fields as optional', () => {
    const info = getZodFieldInfo(z4.string().nullable());
    expect(info.isOptional).toBe(true);
  });

  it('should detect number type', () => {
    expect(getZodFieldInfo(z4.number()).baseType).toBe('number');
  });

  it('should detect boolean type', () => {
    expect(getZodFieldInfo(z4.boolean()).baseType).toBe('boolean');
  });

  it('should detect enum type with values', () => {
    const info = getZodFieldInfo(z4.enum(['active', 'inactive', 'pending']));
    expect(info.baseType).toBe('enum');
    expect(info.enumValues).toEqual(['active', 'inactive', 'pending']);
  });

  it('should detect date type', () => {
    expect(getZodFieldInfo(z4.date()).baseType).toBe('date');
  });

  it('should detect array type with element info', () => {
    const info = getZodFieldInfo(z4.array(z4.string()));
    expect(info.baseType).toBe('array');
    expect(info.arrayElementInfo?.baseType).toBe('string');
  });

  it('should unwrap schema with .default()', () => {
    expect(getZodFieldInfo(z4.string().default('hello')).baseType).toBe('string');
  });

  it('should unwrap schema with .transform() (pipe)', () => {
    expect(getZodFieldInfo(z4.string().transform(v => v.toUpperCase())).baseType).toBe('string');
  });

  it('should handle union with literal (optional URL pattern)', () => {
    const info = getZodFieldInfo(z4.string().url().optional().or(z4.literal('')));
    expect(info.baseType).toBe('string');
    expect(info.isOptional).toBe(true);
  });

  it('should treat a union of string literals as an enum', () => {
    const info = getZodFieldInfo(z4.union([z4.literal('a'), z4.literal('b')]));
    expect(info.baseType).toBe('enum');
    expect(info.enumValues).toEqual(['a', 'b']);
    expect(info.isOptional).toBe(false);
  });

  it('should treat a nullable literal union as an optional enum (OpenAPI generator output)', () => {
    const info = getZodFieldInfo(z4.union([z4.literal('a'), z4.literal('b'), z4.literal(null)]).nullable());
    expect(info.baseType).toBe('enum');
    expect(info.enumValues).toEqual(['a', 'b']);
    expect(info.isOptional).toBe(true);
  });

  it('should read every value of a multi-value literal', () => {
    const info = getZodFieldInfo(z4.union([z4.literal(['a', 'b']), z4.literal('c')]));
    expect(info.baseType).toBe('enum');
    expect(info.enumValues).toEqual(['a', 'b', 'c']);
  });

  it('should mark a literal union optional when it accepts null or an empty string', () => {
    expect(getZodFieldInfo(z4.union([z4.literal('a'), z4.literal(null)])).isOptional).toBe(true);
    const withEmpty = getZodFieldInfo(z4.union([z4.literal('a'), z4.literal('')]));
    expect(withEmpty.isOptional).toBe(true);
    expect(withEmpty.enumValues).toEqual(['a']);
  });

  it('should unwrap optional, nullish and default around a literal union', () => {
    const union = z4.union([z4.literal('a'), z4.literal('b')]);
    expect(getZodFieldInfo(union.optional()).baseType).toBe('enum');
    expect(getZodFieldInfo(union.optional()).isOptional).toBe(true);
    expect(getZodFieldInfo(union.nullish()).enumValues).toEqual(['a', 'b']);
    expect(getZodFieldInfo(union.default('a')).baseType).toBe('enum');
  });

  it('should detect an array of literal unions as an array of enums', () => {
    const info = getZodFieldInfo(z4.array(z4.union([z4.literal('a'), z4.literal('b')])));
    expect(info.baseType).toBe('array');
    expect(info.arrayElementInfo?.baseType).toBe('enum');
    expect(info.arrayElementInfo?.enumValues).toEqual(['a', 'b']);
  });

  it('should not treat a union of non-string literals as an enum', () => {
    expect(getZodFieldInfo(z4.union([z4.literal(1), z4.literal(2)])).baseType).toBe('unknown');
    expect(getZodFieldInfo(z4.union([z4.literal('a'), z4.literal(1)])).baseType).toBe('unknown');
    expect(getZodFieldInfo(z4.union([z4.literal(null), z4.literal('')])).baseType).toBe('unknown');
  });

  it('should keep resolving a mixed union to its non-literal member', () => {
    const info = getZodFieldInfo(z4.union([z4.literal('a'), z4.number()]));
    expect(info.baseType).toBe('number');
    expect(info.enumValues).toBeUndefined();
  });

  it('should leave a single literal untouched', () => {
    expect(getZodFieldInfo(z4.literal('a')).baseType).toBe('unknown');
  });

  it('should detect email on deeply wrapped schema', () => {
    const info = getZodFieldInfo(z4.string().email().optional().nullable());
    expect(info.baseType).toBe('string');
    expect(info.isEmail).toBe(true);
    expect(info.isOptional).toBe(true);
  });
});

describe('getZodShape with Zod 4 schemas', () => {
  it('should extract shape from a plain object', () => {
    const shape = getZodShape(z4.object({ name: z4.string(), age: z4.number() }));
    expect(Object.keys(shape).sort()).toEqual(['age', 'name']);
  });

  it('should extract shape from a refined object', () => {
    const schema = z4
      .object({ password: z4.string(), confirm: z4.string() })
      .refine(d => d.password === d.confirm);
    expect(Object.keys(getZodShape(schema)).sort()).toEqual(['confirm', 'password']);
  });

  it('should extract shape from a transformed (piped) object', () => {
    const schema = z4.object({ a: z4.string(), b: z4.string() }).transform(v => v);
    expect(Object.keys(getZodShape(schema)).sort()).toEqual(['a', 'b']);
  });
});
