import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import type { SchemaFieldInfo } from '../types';

// =============================================================================
// Zod version detection
// =============================================================================
//
// Zod 3 and Zod 4 expose completely different internals. Zod 3 stores its
// definition under `_def` (with `instanceof` class checks and `_def.typeName`),
// while Zod 4 moved everything under `_zod.def` with a string `type` discriminator
// and removed the `ZodEffects` wrapper. snowform introspects schemas to detect
// field types, so it must branch on the schema version at runtime. This keeps the
// package working for consumers on either major (e.g. apps mid-migration).

/** Minimal structural view of a Zod 4 schema's internal definition. */
interface V4Check {
  _zod?: { def?: { format?: string } };
}
interface V4Def {
  type: string;
  innerType?: V4Schema; // optional / nullable / default wrappers
  element?: V4Schema; // array element
  options?: V4Schema[]; // union members
  shape?: Record<string, V4Schema>; // object fields
  entries?: Record<string, unknown>; // enum values
  format?: string; // string format (e.g. 'email')
  checks?: V4Check[]; // string-format checks (deprecated `.email()` form)
  in?: V4Schema; // pipe input side (transform)
}
interface V4Schema {
  _zod: { def: V4Def };
}

function isV4Schema(schema: unknown): schema is V4Schema {
  return typeof schema === 'object' && schema !== null && '_zod' in schema;
}

// =============================================================================
// Zod 4 introspection (structural — reads `_zod.def`)
// =============================================================================

function v4Def(schema: V4Schema): V4Def {
  return schema._zod.def;
}

/**
 * Unwrap a Zod 4 schema to its underlying type: peels optional/nullable/default
 * wrappers and transform pipes, then resolves the main member of a union.
 */
function v4Unwrap(schema: V4Schema): V4Schema {
  let current = schema;

  for (;;) {
    const def = v4Def(current);
    if ((def.type === 'optional' || def.type === 'nullable' || def.type === 'default') && def.innerType) {
      current = def.innerType;
    } else if (def.type === 'pipe' && def.in) {
      // `.transform()` produces a pipe; the source schema is the input side.
      current = def.in;
    } else {
      break;
    }
  }

  // Union - find the main type (not a literal), e.g. z.string().optional().or(z.literal(''))
  const def = v4Def(current);
  if (def.type === 'union' && def.options) {
    for (const option of def.options) {
      const unwrapped = v4Unwrap(option);
      if (v4Def(unwrapped).type !== 'literal') {
        return unwrapped;
      }
    }
  }

  return current;
}

function v4IsOptional(schema: V4Schema): boolean {
  const def = v4Def(schema);
  if (def.type === 'optional' || def.type === 'nullable') return true;

  if (def.type === 'union' && def.options) {
    for (const option of def.options) {
      if (v4Def(option).type === 'literal') return true;
      if (v4IsOptional(option)) return true;
    }
  }

  return false;
}

function v4IsEmail(def: V4Def): boolean {
  // Top-level z.email() stores the format on the schema; the deprecated
  // z.string().email() form stores it inside a string-format check.
  if (def.format === 'email') return true;
  return def.checks?.some(check => check._zod?.def?.format === 'email') ?? false;
}

function getV4Shape(schema: V4Schema): Record<string, V4Schema> {
  let current = schema;
  // Unwrap transform pipes to reach the object (refine keeps the `object` type).
  while (v4Def(current).type === 'pipe' && v4Def(current).in) {
    current = v4Def(current).in as V4Schema;
  }

  const def = v4Def(current);
  if (def.type !== 'object' || !def.shape) {
    console.error('[SnowForm] Schema must be a ZodObject (after unwrapping effects)');
    return {};
  }
  return def.shape;
}

function getV4FieldInfo(field: V4Schema): SchemaFieldInfo {
  const unwrapped = v4Unwrap(field);
  const def = v4Def(unwrapped);

  let baseType: SchemaFieldInfo['baseType'] = 'unknown';
  let enumValues: string[] | undefined;
  let isEmail = false;
  let arrayElementInfo: SchemaFieldInfo | undefined;

  switch (def.type) {
    case 'string':
      baseType = 'string';
      isEmail = v4IsEmail(def);
      break;
    case 'number':
      baseType = 'number';
      break;
    case 'boolean':
      baseType = 'boolean';
      break;
    case 'enum':
      baseType = 'enum';
      enumValues = def.entries ? (Object.values(def.entries) as string[]) : undefined;
      break;
    case 'date':
      baseType = 'date';
      break;
    case 'array':
      baseType = 'array';
      if (def.element) arrayElementInfo = getV4FieldInfo(def.element);
      break;
  }

  return {
    baseType,
    isOptional: v4IsOptional(field),
    isEmail,
    enumValues,
    arrayElementInfo,
  };
}

// =============================================================================
// Zod 3 introspection (reads `_def`, uses `instanceof`)
// =============================================================================

/**
 * Check if a Zod schema is optional (accepts undefined, null, or empty string)
 */
function isOptional(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional) return true;
  if (schema instanceof z.ZodNullable) return true;

  // Handle ZodUnion - e.g., z.string().url().optional().or(z.literal(''))
  // If one option is a literal (like empty string) or optional/nullable, the field is effectively optional
  if (schema instanceof z.ZodUnion) {
    const options = schema._def.options as z.ZodTypeAny[];
    for (const option of options) {
      // If any option is a literal (like ''), the field accepts empty values -> optional
      if (option instanceof z.ZodLiteral) return true;
      // If any option is optional/nullable, recursively check
      if (isOptional(option)) return true;
    }
  }

  return false;
}

/**
 * Unwrap a Zod schema to get the underlying type (removes Optional, Nullable, Default, Effects)
 */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;

  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodDefault ||
    current instanceof z.ZodEffects
  ) {
    if ('innerType' in current._def) {
      current = current._def.innerType;
    } else if ('schema' in current._def) {
      current = current._def.schema;
    } else {
      break;
    }
  }

  // Handle ZodUnion - find the main type (not a literal)
  // This supports patterns like: z.string().url().optional().or(z.literal(''))
  if (current instanceof z.ZodUnion) {
    const options = current._def.options as z.ZodTypeAny[];
    for (const option of options) {
      const unwrapped = unwrapSchema(option);
      // Return the first non-literal type found
      if (!(unwrapped instanceof z.ZodLiteral)) {
        return unwrapped;
      }
    }
  }

  return current;
}

/**
 * Check if a ZodString has email validation
 */
function isEmailString(schema: z.ZodString): boolean {
  // Check the checks array for email validation
  return schema._def.checks?.some((check: { kind: string }) => check.kind === 'email') ?? false;
}

function getV3Shape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  try {
    // Unwrap ZodEffects (refine, superRefine, transform, etc.)
    let current: z.ZodTypeAny = schema;
    while (current instanceof z.ZodEffects) {
      current = current._def.schema;
    }

    // Now we should have a ZodObject
    if (!(current instanceof z.ZodObject)) {
      console.error('[SnowForm] Schema must be a ZodObject (after unwrapping effects)');
      return {};
    }

    // Try shape() function first (for lazy schemas)
    if (typeof current._def.shape === 'function') {
      return current._def.shape();
    }
    // Fallback to shape property
    return current.shape ?? {};
  } catch (error) {
    console.error('[SnowForm] Error getting schema shape:', error);
    return {};
  }
}

function getV3FieldInfo(field: z.ZodTypeAny): SchemaFieldInfo {
  const unwrapped = unwrapSchema(field);

  // Detect base type
  let baseType: SchemaFieldInfo['baseType'] = 'unknown';
  let enumValues: string[] | undefined;
  let isEmail = false;
  let arrayElementInfo: SchemaFieldInfo | undefined;

  if (unwrapped instanceof z.ZodString) {
    baseType = 'string';
    isEmail = isEmailString(unwrapped);
  } else if (unwrapped instanceof z.ZodNumber) {
    baseType = 'number';
  } else if (unwrapped instanceof z.ZodBoolean) {
    baseType = 'boolean';
  } else if (unwrapped instanceof z.ZodEnum) {
    baseType = 'enum';
    enumValues = unwrapped._def.values as string[];
  } else if (unwrapped instanceof z.ZodDate) {
    baseType = 'date';
  } else if (unwrapped instanceof z.ZodArray) {
    baseType = 'array';
    // Extract element type info recursively
    arrayElementInfo = getV3FieldInfo(unwrapped._def.type);
  }

  return {
    baseType,
    isOptional: isOptional(field),
    isEmail,
    enumValues,
    arrayElementInfo,
  };
}

// =============================================================================
// Public API (version-agnostic)
// =============================================================================

/**
 * Extract the shape (fields) from a Zod schema (Zod 3 or Zod 4).
 * Supports schemas wrapped in effects (refine, superRefine, transform).
 */
export function getZodShape(schema: unknown): Record<string, z.ZodTypeAny> {
  if (isV4Schema(schema)) {
    return getV4Shape(schema) as unknown as Record<string, z.ZodTypeAny>;
  }
  return getV3Shape(schema as z.ZodTypeAny);
}

/**
 * Get information about a specific Zod field (Zod 3 or Zod 4).
 */
export function getZodFieldInfo(field: unknown): SchemaFieldInfo {
  if (isV4Schema(field)) {
    return getV4FieldInfo(field);
  }
  return getV3FieldInfo(field as z.ZodTypeAny);
}

/**
 * Create a resolver for react-hook-form from a Zod schema (Zod 3 or Zod 4).
 * Supports schemas with refine/superRefine. @hookform/resolvers v5's zodResolver
 * accepts both major versions at runtime; the cast bridges the static types.
 */
export function createZodResolver<T extends FieldValues = FieldValues>(schema: unknown): Resolver<T> {
  return zodResolver(schema as Parameters<typeof zodResolver>[0]) as unknown as Resolver<T>;
}
