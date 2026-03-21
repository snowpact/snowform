import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type DefaultValues, type FieldErrors, type Path, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

import { SnowFormField } from './SnowFormField';
import { Form, FormField } from './FormProvider';
import { executeOnErrorBehavior } from './registry/behaviorRegistry';
import { getRegisteredSubmitButton } from './registry/componentRegistry';
import { getFormClass } from './registry/stylesRegistry';
import { getT } from './registry/translationRegistry';
import type { SchemaFieldInfo, SnowFormHelpers, SnowFormProps, ZodObjectOrEffects } from './types';
import {
  applyEmptyValueOverrides,
  cn,
  createZodResolver,
  getZodFieldInfo,
  getZodShape,
  initializeDefaultValues,
} from './utils';

// =============================================================================
// SnowForm Component
// =============================================================================

/**
 * SnowForm - Automatic form generation from Zod schemas
 *
 * @example Basic usage
 * ```tsx
 * <SnowForm
 *   schema={z.object({ name: z.string(), email: z.string().email() })}
 *   onSubmit={async (values) => { await saveData(values); }}
 *   onSuccess={() => { toast.success('Saved!'); }}
 * />
 * ```
 *
 * @example With overrides
 * ```tsx
 * <SnowForm
 *   schema={schema}
 *   onSubmit={handleSubmit}
 *   overrides={{
 *     password: { type: 'password' },
 *     bio: { type: 'textarea' },
 *     avatar: { type: 'media-library', emptyAsNull: true },
 *   }}
 * />
 * ```
 *
 * @example With children pattern
 * ```tsx
 * <SnowForm schema={schema} onSubmit={handleSubmit}>
 *   {({ renderField, renderSubmitButton, form }) => (
 *     <>
 *       {renderField('email', 'password')}
 *       {form.watch('showBio') && renderField('bio')}
 *       {renderSubmitButton({ children: 'Create Account' })}
 *     </>
 *   )}
 * </SnowForm>
 * ```
 */
export function SnowForm<TSchema extends ZodObjectOrEffects, TResponse = unknown>({
  schema,
  overrides = {},
  defaultValues: providedDefaultValues,
  fetchDefaultValues,
  onSubmit,
  onSuccess,
  onSubmitError,
  debug = false,
  className,
  id,
  children,
}: SnowFormProps<TSchema, TResponse>): React.ReactElement {
  type FormValues = z.infer<TSchema>;

  const t = getT();
  const formRef = useRef<HTMLFormElement>(null);

  // ==========================================================================
  // Schema Analysis
  // ==========================================================================

  const schemaShape = useMemo(() => getZodShape(schema), [schema]);

  const fieldInfoMap = useMemo(() => {
    const map: Record<string, SchemaFieldInfo> = {};
    for (const [key, field] of Object.entries(schemaShape)) {
      map[key] = getZodFieldInfo(field);
    }
    return map;
  }, [schemaShape]);

  const fieldKeys = useMemo(() => Object.keys(schemaShape) as Array<keyof FormValues>, [schemaShape]);

  // ==========================================================================
  // State Management
  // ==========================================================================

  const [isFetchingDefaults, setIsFetchingDefaults] = useState(!!fetchDefaultValues);
  const [hasFetchError, setHasFetchError] = useState(false);

  // ==========================================================================
  // Form Initialization
  // ==========================================================================

  const computedDefaultValues = useMemo(
    () => initializeDefaultValues<FormValues>(schemaShape, providedDefaultValues, overrides ?? {}),
    [schemaShape, providedDefaultValues, overrides]
  );

  const form = useForm<FormValues>({
    resolver: createZodResolver(schema),
    defaultValues: computedDefaultValues,
  });

  // ==========================================================================
  // Fetch Default Values (async)
  // ==========================================================================

  useEffect(() => {
    if (!fetchDefaultValues) return;

    let isMounted = true;

    const fetchData = async () => {
      setIsFetchingDefaults(true);
      setHasFetchError(false);

      try {
        const data = await fetchDefaultValues();
        if (isMounted) {
          form.reset({
            ...computedDefaultValues,
            ...data,
          } as DefaultValues<FormValues>);
        }
      } catch (error) {
        console.error('[SnowForm] Error fetching default values:', error);
        if (isMounted) {
          setHasFetchError(true);
        }
      } finally {
        if (isMounted) {
          setIsFetchingDefaults(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================================
  // Manual Error Setter
  // ==========================================================================

  const setManualFormErrors = useCallback(
    (errors: Record<string, string> | null) => {
      if (errors === null) {
        form.clearErrors();
        return;
      }

      for (const [key, message] of Object.entries(errors)) {
        form.setError(key as Path<FormValues>, {
          type: 'manual',
          message,
        });
      }
    },
    [form]
  );

  // ==========================================================================
  // Submit Handler
  // ==========================================================================

  const handleSubmit = async (values: FormValues) => {
    if (!onSubmit) return;

    try {
      // Apply empty value transformations
      const transformedValues = applyEmptyValueOverrides(values, overrides ?? {});
      if (debug) {
        console.log('[SnowForm] Submitting:', transformedValues);
      }

      const response = await onSubmit(transformedValues);
      if (debug) {
        console.log('[SnowForm] Submit success:', response);
      }

      onSuccess?.(response);
    } catch (error) {
      if (debug) {
        console.error('[SnowForm] Submit error:', error);
      }

      if (onSubmitError) {
        onSubmitError(setManualFormErrors, error);
      }
    }
  };

  // ==========================================================================
  // Helper: renderField
  // ==========================================================================

  const renderField = useCallback(
    (...keys: Array<keyof FormValues>): ReactNode => {
      return keys.map(key => {
        const keyStr = key as string;
        const fieldInfo = fieldInfoMap[keyStr];
        const override = overrides?.[keyStr];

        if (!fieldInfo) {
          console.warn(`[SnowForm] Unknown field: ${keyStr}`);
          return null;
        }

        return (
          <FormField
            key={keyStr}
            name={keyStr as Path<FormValues>}
            control={form.control}
            render={({ field }) => (
              <SnowFormField
                name={keyStr as Path<FormValues>}
                fieldInfo={fieldInfo}
                override={override}
                field={field}
                formDisabled={isFetchingDefaults}
              />
            )}
          />
        );
      });
    },
    [fieldInfoMap, overrides, form.control, isFetchingDefaults]
  );

  // ==========================================================================
  // Helper: renderSubmitButton
  // ==========================================================================

  const renderSubmitButton = useCallback(
    (options?: { disabled?: boolean; className?: string; children?: ReactNode }): ReactNode => {
      const SubmitButton = getRegisteredSubmitButton();
      const isSubmitting = form.formState.isSubmitting;
      const isDisabled = options?.disabled || isFetchingDefaults || hasFetchError || isSubmitting;

      if (!SubmitButton) {
        console.warn('[SnowForm] No submit button registered. Use setupSnowForm({ submitButton: ... })');
        // Minimal fallback
        return (
          <button type="submit" disabled={isDisabled} className={cn('snow-form-submit-btn', options?.className)}>
            {isSubmitting ? 'Loading...' : (options?.children ?? t('submit'))}
          </button>
        );
      }

      return (
        <SubmitButton
          loading={isSubmitting}
          disabled={isDisabled}
          className={cn('snow-form-submit-btn', options?.className)}
        >
          {options?.children ?? t('submit')}
        </SubmitButton>
      );
    },
    [form.formState.isSubmitting, isFetchingDefaults, hasFetchError, t]
  );

  // ==========================================================================
  // Helpers Object (for children pattern)
  // ==========================================================================

  const helpers: SnowFormHelpers<FormValues> = useMemo(
    () => ({
      renderField,
      renderSubmitButton,
      form: form as UseFormReturn<FormValues>,
    }),
    [renderField, renderSubmitButton, form]
  );

  // ==========================================================================
  // Validation Error Handler
  // ==========================================================================

  const handleInvalid = useCallback((errors: FieldErrors<FormValues>) => {
    // Execute registered error behavior (scroll to top, toast, etc.)
    executeOnErrorBehavior(formRef.current, errors);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <Form {...form}>
      <form
        ref={formRef}
        id={id}
        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
        className={cn('snow-form', getFormClass(), className)}
      >
        {children ? (
          // Children pattern: user controls layout
          children(helpers)
        ) : (
          // Auto-generated layout: all fields + submit button
          <>
            {fieldKeys.map(key => renderField(key))}
            {renderSubmitButton()}
          </>
        )}
      </form>
    </Form>
  );
}
