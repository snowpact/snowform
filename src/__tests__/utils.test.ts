import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  applyEmptyValueOverrides,
  getZodFieldInfo,
  getZodShape,
  initializeDefaultValues,
  normalizeDateToISO,
  resolveFieldType,
} from '../utils';

describe('SnowForm utils', () => {
  describe('initializeDefaultValues', () => {
    it('should initialize string fields with empty string', () => {
      const schema = z.object({
        name: z.string(),
      });
      const schemaShape = getZodShape(schema);
      const defaults = initializeDefaultValues(schemaShape);
      expect(defaults.name).toBe('');
    });

    it('should initialize number fields with null by default', () => {
      const schema = z.object({
        age: z.number(),
      });
      const schemaShape = getZodShape(schema);
      const defaults = initializeDefaultValues(schemaShape);
      expect(defaults.age).toBeNull();
    });

    it('should initialize number fields with 0 when emptyAsZero is set', () => {
      const schema = z.object({
        quantity: z.number(),
      });
      const schemaShape = getZodShape(schema);
      const overrides = { quantity: { emptyAsZero: true } };
      const defaults = initializeDefaultValues(schemaShape, {}, overrides);
      expect(defaults.quantity).toBe(0);
    });

    it('should initialize number fields with null when emptyAsNull is set', () => {
      const schema = z.object({
        duration: z.number(),
      });
      const schemaShape = getZodShape(schema);
      const overrides = { duration: { emptyAsNull: true } };
      const defaults = initializeDefaultValues(schemaShape, {}, overrides);
      expect(defaults.duration).toBeNull();
    });

    it('should initialize number fields with undefined when emptyAsUndefined is set', () => {
      const schema = z.object({
        count: z.number(),
      });
      const schemaShape = getZodShape(schema);
      const overrides = { count: { emptyAsUndefined: true } };
      const defaults = initializeDefaultValues(schemaShape, {}, overrides);
      expect(defaults.count).toBeUndefined();
    });

    it('should initialize boolean fields with false', () => {
      const schema = z.object({
        active: z.boolean(),
      });
      const schemaShape = getZodShape(schema);
      const defaults = initializeDefaultValues(schemaShape);
      expect(defaults.active).toBe(false);
    });

    it('should initialize enum fields with undefined', () => {
      const schema = z.object({
        status: z.enum(['active', 'inactive']),
      });
      const schemaShape = getZodShape(schema);
      const defaults = initializeDefaultValues(schemaShape);
      expect(defaults.status).toBeUndefined();
    });

    it('should use provided values over defaults', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      type TestType = z.infer<typeof schema>;
      const schemaShape = getZodShape(schema);
      const providedValues = { name: 'John' };
      const defaults = initializeDefaultValues<TestType>(schemaShape, providedValues);
      expect(defaults.name).toBe('John');
      expect(defaults.age).toBeNull();
    });

    it('should handle emptyAsNull override for string', () => {
      const schema = z.object({
        description: z.string().nullable(),
      });
      const schemaShape = getZodShape(schema);
      const overrides = { description: { emptyAsNull: true } };
      const defaults = initializeDefaultValues(schemaShape, {}, overrides);
      expect(defaults.description).toBeNull();
    });

    it('should handle emptyAsUndefined override for string', () => {
      const schema = z.object({
        description: z.string().optional(),
      });
      const schemaShape = getZodShape(schema);
      const overrides = { description: { emptyAsUndefined: true } };
      const defaults = initializeDefaultValues(schemaShape, {}, overrides);
      expect(defaults.description).toBeUndefined();
    });

    it('should initialize date fields with null', () => {
      const schema = z.object({
        createdAt: z.date(),
      });
      const schemaShape = getZodShape(schema);
      const defaults = initializeDefaultValues(schemaShape);
      expect(defaults.createdAt).toBeNull();
    });
  });

  describe('applyEmptyValueOverrides', () => {
    it('should transform empty string to null when emptyAsNull is set', () => {
      const values = { name: 'John', website: '' };
      const overrides = { website: { emptyAsNull: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.name).toBe('John');
      expect(result.website).toBeNull();
    });

    it('should transform whitespace-only string to null when emptyAsNull is set', () => {
      const values = { website: '   ' };
      const overrides = { website: { emptyAsNull: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.website).toBeNull();
    });

    it('should transform empty string to undefined when emptyAsUndefined is set', () => {
      const values = { description: '' };
      const overrides = { description: { emptyAsUndefined: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.description).toBeUndefined();
    });

    it('should transform null to 0 when emptyAsZero is set', () => {
      const values = { quantity: null };
      const overrides = { quantity: { emptyAsZero: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.quantity).toBe(0);
    });

    it('should transform undefined to 0 when emptyAsZero is set', () => {
      const values = { quantity: undefined };
      const overrides = { quantity: { emptyAsZero: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.quantity).toBe(0);
    });

    it('should transform empty string to 0 when emptyAsZero is set', () => {
      const values = { quantity: '' };
      const overrides = { quantity: { emptyAsZero: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.quantity).toBe(0);
    });

    it('should not transform non-empty values', () => {
      const values = { website: 'https://example.com', count: 5 };
      const overrides = { website: { emptyAsNull: true }, count: { emptyAsZero: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.website).toBe('https://example.com');
      expect(result.count).toBe(5);
    });

    it('should not transform fields without overrides', () => {
      const values = { name: '', email: '' };
      const overrides = { name: { emptyAsNull: true } };
      const result = applyEmptyValueOverrides(values, overrides);
      expect(result.name).toBeNull();
      expect(result.email).toBe('');
    });

    it('should handle empty overrides', () => {
      const values = { name: '', website: '' };
      const result = applyEmptyValueOverrides(values, {});
      expect(result.name).toBe('');
      expect(result.website).toBe('');
    });
  });

  describe('resolveFieldType', () => {
    it('should return override type when specified', () => {
      const fieldInfo = { baseType: 'string' as const, isOptional: false, isEmail: false };
      const override = { type: 'textarea' as const };
      expect(resolveFieldType(fieldInfo, override)).toBe('textarea');
    });

    it('should return text for string fields', () => {
      const fieldInfo = { baseType: 'string' as const, isOptional: false, isEmail: false };
      expect(resolveFieldType(fieldInfo)).toBe('text');
    });

    it('should return email for email string fields', () => {
      const fieldInfo = { baseType: 'string' as const, isOptional: false, isEmail: true };
      expect(resolveFieldType(fieldInfo)).toBe('email');
    });

    it('should return number for number fields', () => {
      const fieldInfo = { baseType: 'number' as const, isOptional: false, isEmail: false };
      expect(resolveFieldType(fieldInfo)).toBe('number');
    });

    it('should return checkbox for boolean fields', () => {
      const fieldInfo = { baseType: 'boolean' as const, isOptional: false, isEmail: false };
      expect(resolveFieldType(fieldInfo)).toBe('checkbox');
    });

    it('should return date for date fields', () => {
      const fieldInfo = { baseType: 'date' as const, isOptional: false, isEmail: false };
      expect(resolveFieldType(fieldInfo)).toBe('date');
    });

    it('should return select for enum fields', () => {
      const fieldInfo = { baseType: 'enum' as const, isOptional: false, isEmail: false, enumValues: ['a', 'b'] };
      expect(resolveFieldType(fieldInfo)).toBe('select');
    });

    it('should return text for unknown base types', () => {
      const fieldInfo = { baseType: 'unknown' as const, isOptional: false, isEmail: false };
      expect(resolveFieldType(fieldInfo)).toBe('text');
    });
  });

  describe('normalizeDateToISO', () => {
    it('should return null for null input', () => {
      expect(normalizeDateToISO(null)).toBe(null);
    });

    it('should return null for undefined input', () => {
      expect(normalizeDateToISO(undefined)).toBe(null);
    });

    it('should normalize Date to midnight UTC and return ISO string', () => {
      // Create a date at 14:30 UTC on March 15, 2024
      const date = new Date('2024-03-15T14:30:45.123Z');
      const result = normalizeDateToISO(date);

      // Should normalize to midnight UTC on the same date
      expect(result).toBe('2024-03-15T00:00:00.000Z');
    });

    it('should handle ISO string date input', () => {
      // Use explicit ISO format to avoid timezone ambiguity
      const result = normalizeDateToISO('2024-03-15T12:00:00.000Z');

      expect(result).toBe('2024-03-15T00:00:00.000Z');
    });

    it('should set hours, minutes, seconds, and milliseconds to 0 UTC', () => {
      // Create a date at 23:59:59.999 UTC
      const date = new Date('2024-06-20T23:59:59.999Z');
      const result = normalizeDateToISO(date);

      // Should normalize to midnight UTC on the same date
      expect(result).toBe('2024-06-20T00:00:00.000Z');
    });
  });

  describe('getZodFieldInfo', () => {
    it('should detect string type', () => {
      const field = z.string();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
      expect(info.isOptional).toBe(false);
      expect(info.isEmail).toBe(false);
    });

    it('should detect email validation', () => {
      const field = z.string().email();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
      expect(info.isEmail).toBe(true);
    });

    it('should detect optional fields', () => {
      const field = z.string().optional();
      const info = getZodFieldInfo(field);
      expect(info.isOptional).toBe(true);
    });

    it('should detect nullable fields as optional', () => {
      const field = z.string().nullable();
      const info = getZodFieldInfo(field);
      expect(info.isOptional).toBe(true);
    });

    it('should detect number type', () => {
      const field = z.number();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('number');
    });

    it('should detect boolean type', () => {
      const field = z.boolean();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('boolean');
    });

    it('should detect enum type with values', () => {
      const field = z.enum(['active', 'inactive', 'pending']);
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('enum');
      expect(info.enumValues).toEqual(['active', 'inactive', 'pending']);
    });

    it('should detect date type', () => {
      const field = z.date();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('date');
    });

    it('should detect array type', () => {
      const field = z.array(z.string());
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('array');
    });

    // Complex Zod patterns
    it('should unwrap schema with .default()', () => {
      const field = z.string().default('hello');
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
    });

    it('should unwrap schema with .transform()', () => {
      const field = z.string().transform(val => val.toUpperCase());
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
    });

    it('should handle union with literal (optional URL pattern)', () => {
      // Common pattern: optional URL that accepts empty string
      const field = z.string().url().optional().or(z.literal(''));
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
      expect(info.isOptional).toBe(true); // literal('') makes it effectively optional
    });

    it('should treat a union of string literals as an enum', () => {
      const info = getZodFieldInfo(z.union([z.literal('a'), z.literal('b')]));
      expect(info.baseType).toBe('enum');
      expect(info.enumValues).toEqual(['a', 'b']);
      expect(info.isOptional).toBe(false);
    });

    it('should treat a nullable literal union as an optional enum (OpenAPI generator output)', () => {
      const field = z.union([z.literal('a'), z.literal('b'), z.literal(null)]).nullable();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('enum');
      expect(info.enumValues).toEqual(['a', 'b']);
      expect(info.isOptional).toBe(true);
    });

    it('should mark a literal union optional when it accepts null or an empty string', () => {
      expect(getZodFieldInfo(z.union([z.literal('a'), z.literal(null)])).isOptional).toBe(true);
      const withEmpty = getZodFieldInfo(z.union([z.literal('a'), z.literal('')]));
      expect(withEmpty.isOptional).toBe(true);
      expect(withEmpty.enumValues).toEqual(['a']);
    });

    it('should unwrap optional, nullish and default around a literal union', () => {
      const union = z.union([z.literal('a'), z.literal('b')]);
      expect(getZodFieldInfo(union.optional()).baseType).toBe('enum');
      expect(getZodFieldInfo(union.optional()).isOptional).toBe(true);
      expect(getZodFieldInfo(union.nullish()).enumValues).toEqual(['a', 'b']);
      expect(getZodFieldInfo(union.default('a')).baseType).toBe('enum');
    });

    it('should detect an array of literal unions as an array of enums', () => {
      const info = getZodFieldInfo(z.array(z.union([z.literal('a'), z.literal('b')])));
      expect(info.baseType).toBe('array');
      expect(info.arrayElementInfo?.baseType).toBe('enum');
      expect(info.arrayElementInfo?.enumValues).toEqual(['a', 'b']);
    });

    it('should not treat a union of non-string literals as an enum', () => {
      expect(getZodFieldInfo(z.union([z.literal(1), z.literal(2)])).baseType).toBe('unknown');
      expect(getZodFieldInfo(z.union([z.literal('a'), z.literal(1)])).baseType).toBe('unknown');
      expect(getZodFieldInfo(z.union([z.literal(null), z.literal('')])).baseType).toBe('unknown');
    });

    it('should keep resolving a mixed union to its non-literal member', () => {
      const info = getZodFieldInfo(z.union([z.literal('a'), z.number()]));
      expect(info.baseType).toBe('number');
      expect(info.enumValues).toBeUndefined();
    });

    it('should leave a single literal untouched', () => {
      expect(getZodFieldInfo(z.literal('a')).baseType).toBe('unknown');
    });

    it('should handle chained optional and nullable', () => {
      const field = z.string().optional().nullable();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
      expect(info.isOptional).toBe(true);
    });

    it('should detect email on deeply wrapped schema', () => {
      const field = z.string().email().optional().nullable();
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
      expect(info.isEmail).toBe(true);
      expect(info.isOptional).toBe(true);
    });

    it('should handle number with min/max constraints', () => {
      const field = z.number().min(0).max(100);
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('number');
    });

    it('should handle string with length constraints', () => {
      const field = z.string().min(1).max(255);
      const info = getZodFieldInfo(field);
      expect(info.baseType).toBe('string');
    });
  });
});
