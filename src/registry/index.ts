import type { FormUIComponents, RegisterableComponent, RegisteredSubmitButton } from '../types';

import {
  registerComponent,
  registerComponents,
  registerSubmitButton,
  registerFormUI,
  getRegisteredComponent,
  getRegisteredSubmitButton,
  getFormUI,
  hasRegisteredComponent,
  getRegisteredTypes,
  clearRegistry,
} from './componentRegistry';

import {
  setTranslationFunction,
  getT,
  resetTranslationRegistry,
  type TranslationFunction,
} from './translationRegistry';

import {
  setOnErrorBehavior,
  executeOnErrorBehavior,
  resetBehaviorRegistry,
  type OnErrorBehavior,
} from './behaviorRegistry';

import {
  setFormStyles,
  getFormClass,
  getFormItemClass,
  getLabelClass,
  getDescriptionClass,
  getErrorMessageClass,
  getChipClass,
  resetStylesRegistry,
  type FormStyles,
} from './stylesRegistry';

// =============================================================================
// Setup Types
// =============================================================================

/**
 * Options for setupSnowForm
 */
export interface SetupSnowFormOptions {
  /**
   * Translation function (required)
   * Can be i18next's t, next-intl's t, or any (key: string) => string function.
   * Keys like 'submit' are passed directly to this function.
   *
   * @example Using i18next
   * ```typescript
   * import { t } from 'i18next';
   * setupSnowForm({ translate: t });
   * ```
   *
   * @example Using next-intl
   * ```typescript
   * const t = await getTranslations('form');
   * setupSnowForm({ translate: t });
   * ```
   */
  translate: TranslationFunction;

  /**
   * Components to register for form fields.
   *
   * **Essential types** (recommended for most forms):
   * - `text`, `email`, `password`, `textarea`, `select`, `checkbox`, `number`, `date`
   *
   * **Optional types** (register as needed):
   * - `radio`, `time`, `datetime-local`, `tel`, `url`, `color`, `file`, `hidden`
   *
   * A warning is logged if essential types are missing.
   *
   * @example
   * ```typescript
   * setupSnowForm({
   *   translate: t,
   *   components: {
   *     text: MyInput,
   *     email: (props) => <MyInput {...props} type="email" />,
   *     password: (props) => <MyInput {...props} type="password" />,
   *     textarea: MyTextarea,
   *     select: MySelect,
   *     checkbox: MyCheckbox,
   *     number: MyNumberInput,
   *     date: MyDatePicker,
   *   },
   * });
   * ```
   */
  components?: Partial<Record<string, RegisterableComponent>>;

  /**
   * Custom submit button component
   *
   * @example
   * ```typescript
   * setupSnowForm({
   *   translate: t,
   *   submitButton: ({ loading, disabled, children }) => (
   *     <Button type="submit" disabled={disabled || loading}>
   *       {loading ? <Spinner /> : children}
   *     </Button>
   *   ),
   * });
   * ```
   */
  submitButton?: RegisteredSubmitButton;

  /**
   * Error behavior callback
   * Called when form validation fails
   *
   * @example
   * ```typescript
   * setupSnowForm({
   *   translate: t,
   *   onError: (formRef, errors) => {
   *     formRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
   *   },
   * });
   * ```
   */
  onError?: OnErrorBehavior;

  /**
   * Custom form UI components (label, description, errorMessage)
   * Use this to replace the default layout components with your own
   *
   * @example
   * ```typescript
   * setupSnowForm({
   *   translate: t,
   *   formUI: {
   *     label: ({ children, required, invalid, htmlFor }) => (
   *       <label htmlFor={htmlFor} className={cn('my-label', invalid && 'error')}>
   *         {children}
   *         {required && <span className="text-red-500">*</span>}
   *       </label>
   *     ),
   *     description: ({ children }) => (
   *       <p className="text-sm text-gray-500">{children}</p>
   *     ),
   *     errorMessage: ({ message }) => (
   *       <p className="text-sm text-red-500">{message}</p>
   *     ),
   *   },
   * });
   * ```
   */
  formUI?: FormUIComponents;

  /**
   * CSS classes for form layout and UI elements
   * Use this to apply consistent styling across all forms.
   * These classes are added to the fallback form UI components.
   *
   * @example
   * ```typescript
   * setupSnowForm({
   *   translate: t,
   *   styles: {
   *     form: 'space-y-4',
   *     formItem: 'grid gap-2',
   *     label: 'text-sm font-medium',
   *     description: 'text-xs text-gray-500',
   *     errorMessage: 'text-xs text-red-500',
   *   },
   * });
   * ```
   */
  styles?: FormStyles;
}

// =============================================================================
// Setup State
// =============================================================================

let isSetup = false;

// =============================================================================
// Setup API
// =============================================================================

/**
 * Initialize SnowForm with your configuration.
 * Call this once at app startup (e.g., in _app.tsx, layout.tsx, or main.tsx).
 *
 * @param options - Configuration options
 *
 * @example Basic setup
 * ```typescript
 * import { setupSnowForm } from '@snowpact/snowform';
 *
 * setupSnowForm({
 *   translate: (key) => key, // Identity function if no i18n
 * });
 * ```
 *
 * @example With i18next
 * ```typescript
 * import { setupSnowForm } from '@snowpact/snowform';
 * import i18next from 'i18next';
 *
 * setupSnowForm({
 *   translate: i18next.t.bind(i18next),
 * });
 * ```
 *
 * @example Full configuration
 * ```typescript
 * import { setupSnowForm } from '@snowpact/snowform';
 * import { MyInput, MySelect, MyButton } from './components';
 *
 * setupSnowForm({
 *   translate: t,
 *   components: {
 *     text: MyInput,
 *     select: MySelect,
 *   },
 *   submitButton: MyButton,
 *   onError: (formRef) => {
 *     formRef?.scrollIntoView({ behavior: 'smooth' });
 *   },
 * });
 * ```
 */
export function setupSnowForm(options: SetupSnowFormOptions): void {
  // Prevent double setup (idempotent)
  if (isSetup) {
    console.warn('[SnowForm] setupSnowForm has already been called. Ignoring duplicate call.');
    return;
  }

  // Set translation function (required)
  setTranslationFunction(options.translate);

  // Register components
  if (options.components) {
    registerComponents(options.components);
  }

  // Register submit button (optional)
  if (options.submitButton) {
    registerSubmitButton(options.submitButton);
  }

  // Set error behavior (optional)
  if (options.onError) {
    setOnErrorBehavior(options.onError);
  }

  // Register form UI components (optional)
  if (options.formUI) {
    registerFormUI(options.formUI);
  }

  // Set form styles (optional)
  if (options.styles) {
    setFormStyles(options.styles);
  }

  isSetup = true;
}

/**
 * Reset SnowForm to its initial state.
 * Mainly used for testing.
 */
export function resetSnowForm(): void {
  isSetup = false;
  resetTranslationRegistry();
  clearRegistry();
  resetBehaviorRegistry();
  resetStylesRegistry();
}

/**
 * Check if SnowForm has been initialized.
 *
 * @returns true if setupSnowForm has been called
 */
export function isSnowFormSetup(): boolean {
  return isSetup;
}

// =============================================================================
// Re-exports
// =============================================================================

// Component registry
export {
  registerComponent,
  registerComponents,
  registerSubmitButton,
  registerFormUI,
  getRegisteredComponent,
  getRegisteredSubmitButton,
  getFormUI,
  hasRegisteredComponent,
  getRegisteredTypes,
  clearRegistry,
};

// Translation registry
export {
  setTranslationFunction,
  getT,
  resetTranslationRegistry,
  type TranslationFunction,
};

// Behavior registry
export {
  setOnErrorBehavior,
  executeOnErrorBehavior,
  resetBehaviorRegistry,
  type OnErrorBehavior,
};

// Styles registry
export {
  setFormStyles,
  getFormClass,
  getFormItemClass,
  getLabelClass,
  getDescriptionClass,
  getErrorMessageClass,
  getChipClass,
  resetStylesRegistry,
  type FormStyles,
};
