import type { ReactElement, ReactNode } from 'react';
import type { FieldError, FieldValues, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Global interface for custom component types.
 * Extend this interface via declaration merging to add custom types.
 *
 * @example Adding custom types in your project
 * ```typescript
 * // In a .d.ts file (e.g., src/types/snow-form.d.ts)
 * declare global {
 *   interface SnowFormCustomTypes {
 *     'rich-text': true;
 *     'media-library': true;
 *   }
 * }
 * export {};
 * ```
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface SnowFormCustomTypes {}
}

/**
 * Built-in component types that ship with SnowForm.
 */
interface SnowFormBuiltinTypes {
  hidden: true;
  text: true;
  password: true;
  email: true;
  number: true;
  textarea: true;
  select: true;
  checkbox: true;
  radio: true;
  date: true;
  file: true;
  time: true;
  'datetime-local': true;
  tel: true;
  url: true;
  color: true;
}

/**
 * All available field types (built-in + custom).
 * Automatically includes types from SnowFormCustomTypes via declaration merging.
 */
export type FieldType = keyof (SnowFormBuiltinTypes & SnowFormCustomTypes);

/**
 * Option for select and radio fields
 */
export interface FieldOption {
  label: string;
  value: string;
}

// =============================================================================
// Field Configuration (Overrides)
// =============================================================================

/**
 * Render function props passed to custom render functions
 */
export interface FieldRenderProps<TValue = unknown> {
  value: TValue;
  onChange: (value: TValue) => void;
  onBlur: () => void;
  name: string;
  error?: FieldError;
  disabled?: boolean;
}

/**
 * Base field configuration shared between typed and permissive versions
 */
export interface BaseFieldConfig {
  /** Override field label (default: translated from field key) */
  label?: string;
  /** Help text displayed below the field */
  description?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the field */
  disabled?: boolean;
  /** Override the detected field type */
  type?: FieldType;
  /** Options for select/radio fields */
  options?: FieldOption[];
  /** Convert empty string to null on submit */
  emptyAsNull?: boolean;
  /** Convert empty string to undefined on submit */
  emptyAsUndefined?: boolean;
  /** Convert empty/null to 0 for number fields */
  emptyAsZero?: boolean;
  /** Hide the label (useful for custom render with inline label) */
  hideLabel?: boolean;
}

/**
 * Override configuration for individual fields (typed version)
 */
export interface FieldOverride<TValue = unknown> extends BaseFieldConfig {
  /** Custom render function - replaces default component */
  render?: (props: FieldRenderProps<TValue>) => ReactElement;
  /** Additional props passed to the component */
  componentProps?: Record<string, unknown>;
}

/**
 * Permissive field config for SnowForm compatibility
 * Uses `any` types to match flexible usage patterns
 */
export interface FieldConfig extends BaseFieldConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (field: { value: any; onChange: (value: any) => void; error?: any }) => ReactElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentProps?: Record<string, any>;
}

/**
 * Map of field names to their override configurations
 */
export type FieldOverrides<T extends FieldValues> = Partial<{
  [K in keyof T]: FieldOverride<T[K]>;
}>;

// =============================================================================
// Component Registry Types
// =============================================================================

/**
 * Props passed to registered components
 */
export interface RegisteredComponentProps<TValue = unknown> {
  value: TValue;
  onChange: (value: TValue) => void;
  onBlur: () => void;
  name: string;
  error?: FieldError;
  disabled?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  className?: string;
  componentProps?: Record<string, unknown>;
}

/**
 * A registered component type (typed version for implementation)
 */
export type RegisteredComponent<TValue = unknown> = React.ComponentType<RegisteredComponentProps<TValue>>;

/**
 * Permissive component type for registration (avoids casts in config)
 * Uses `any` to allow components with specific value types (string, number, etc.)
 * to be registered without explicit type casts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RegisterableComponent = React.ComponentType<RegisteredComponentProps<any>>;

/**
 * Submit button component props
 */
export interface SubmitButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * A registered submit button component
 */
export type RegisteredSubmitButton = React.ComponentType<SubmitButtonProps>;

// =============================================================================
// Form UI Component Types
// =============================================================================

/**
 * Props for custom label components
 */
export interface FormUILabelProps {
  children: ReactNode;
  required?: boolean;
  invalid?: boolean;
  htmlFor: string;
}

/**
 * Props for custom description components
 */
export interface FormUIDescriptionProps {
  children: ReactNode;
}

/**
 * Props for custom error message components
 */
export interface FormUIErrorMessageProps {
  message: string;
}

/**
 * Custom form UI components that can be registered
 */
export interface FormUIComponents {
  label?: React.ComponentType<FormUILabelProps>;
  description?: React.ComponentType<FormUIDescriptionProps>;
  errorMessage?: React.ComponentType<FormUIErrorMessageProps>;
}

// =============================================================================
// Children Pattern Types
// =============================================================================

/**
 * Helper functions passed to children render function
 */
export interface SnowFormHelpers<T extends FieldValues> {
  /** Render specific fields by key */
  renderField: (...keys: Array<keyof T>) => ReactNode;
  /** Render the submit button */
  renderSubmitButton: (options?: { disabled?: boolean; className?: string; children?: ReactNode }) => ReactNode;
  /** Access the full react-hook-form instance (includes watch, setValue, etc.) */
  form: UseFormReturn<T>;
}

/**
 * Children render function type
 */
export type SnowFormChildren<T extends FieldValues> = (helpers: SnowFormHelpers<T>) => ReactNode;

// =============================================================================
// Main Component Props
// =============================================================================

/**
 * Structural match for a Zod 4 schema. Zod 4 moved its output type to
 * `_zod.output` (and removed the v3 `ZodEffects` wrapper); an object schema's
 * output is itself an object. Matching structurally lets SnowForm accept Zod 4
 * schemas without importing a specific Zod entrypoint.
 */
type ZodV4ObjectSchema = { readonly _zod: { readonly output: object } };

/**
 * A Zod object schema (Zod 3 or Zod 4), possibly wrapped in effects
 * (refine, superRefine, transform).
 */
export type ZodObjectOrEffects =
  | z.ZodObject<z.ZodRawShape>
  | z.ZodEffects<z.ZodObject<z.ZodRawShape>>
  | z.ZodEffects<z.ZodEffects<z.ZodObject<z.ZodRawShape>>>
  | ZodV4ObjectSchema;

/**
 * Infer the form values type from a Zod schema, version-agnostically.
 * Zod 4 stores its output type at `_zod.output`; Zod 3 at `_output`.
 */
export type InferZodValues<T> = T extends { _zod: { output: infer O } }
  ? O
  : T extends { _output: infer O }
    ? O
    : never;

/**
 * Props for the SnowForm component
 *
 * @typeParam TSchema - The Zod schema type (supports refine/superRefine)
 * @typeParam TResponse - The response type from onSubmit
 */
export interface SnowFormProps<
  TSchema extends ZodObjectOrEffects,
  TResponse = unknown,
  TValues extends FieldValues = InferZodValues<TSchema>,
> {
  /** Zod schema defining the form structure */
  schema: TSchema;

  /** Field customizations - uses permissive FieldConfig for flexibility */
  overrides?: Partial<Record<string, FieldConfig>>;

  /** Static default values */
  defaultValues?: Partial<TValues>;

  /** Async function to fetch default values */
  fetchDefaultValues?: () => Promise<Partial<TValues>>;

  /** Submit handler - receives validated form values */
  onSubmit?: (values: TValues) => Promise<TResponse>;

  /** Called after successful submission */
  onSuccess?: (response: TResponse) => void;

  /** Error handler for submission errors (API errors, etc.) */
  onSubmitError?: (setManualFormErrors: (errors: Record<string, string> | null) => void, error: unknown) => void;

  /** Enable debug logging (dev only) */
  debug?: boolean;

  /** CSS class for the form element */
  className?: string;

  /** HTML id attribute for the form element */
  id?: string;

  /** Custom layout via render function */
  children?: SnowFormChildren<TValues>;
}

// =============================================================================
// Schema Field Types
// =============================================================================

/**
 * Base type for detected schema fields
 */
export type SchemaFieldBaseType = 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'date' | 'unknown';

/**
 * Information extracted from a schema field
 */
export interface SchemaFieldInfo {
  /** The base Zod type (string, number, boolean, enum, array, etc.) */
  baseType: SchemaFieldBaseType;
  /** Whether the field is optional (z.optional() or has .default()) */
  isOptional: boolean;
  /** Whether the field has .email() validation */
  isEmail: boolean;
  /** For enum types: the possible values */
  enumValues?: string[];
  /** For array fields: info about the element type */
  arrayElementInfo?: SchemaFieldInfo;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Global configuration options (legacy, kept for backwards compatibility)
 */
export interface SnowFormConfig {
  /** Default CSS classes */
  defaultStyles?: {
    form?: string;
    fieldWrapper?: string;
    label?: string;
    input?: string;
    error?: string;
    description?: string;
    submitButton?: string;
  };

  /** Default labels when no translation is provided */
  defaultLabels?: {
    submit?: string;
    loading?: string;
    required?: string;
  };
}
