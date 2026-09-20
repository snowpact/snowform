import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { SnowForm } from '../SnowForm';
import { registerComponent, registerSubmitButton } from '../registry/componentRegistry';
import { setTranslationFunction } from '../registry/translationRegistry';

// Note: Test setup (component registration) is handled in src/__tests__/setup.ts

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Basic Rendering Tests
// =============================================================================

describe('SnowForm', () => {
  describe('Basic Rendering', () => {
    it('should render all fields from schema', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
      });

      render(<SnowForm schema={schema} />);

      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: /age/i })).toBeInTheDocument();
    });

    it('should render submit button', () => {
      const schema = z.object({ name: z.string() });

      render(<SnowForm schema={schema} />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should render boolean fields as checkboxes', () => {
      const schema = z.object({
        active: z.boolean(),
      });

      render(<SnowForm schema={schema} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render enum fields as select', () => {
      const schema = z.object({
        status: z.enum(['draft', 'published', 'archived']),
      });

      render(<SnowForm schema={schema} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render a union of string literals as a select with its options', () => {
      const schema = z.object({
        scope: z.union([z.literal('city'), z.literal('county'), z.literal(null)]).nullable(),
      });

      render(<SnowForm schema={schema} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'city' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'county' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'null' })).not.toBeInTheDocument();
    });

    it('should submit the option picked in a literal-union select', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue({ success: true });
      const schema = z.object({
        scope: z.union([z.literal('city'), z.literal('county')]),
      });

      render(<SnowForm schema={schema} onSubmit={onSubmit} />);

      await user.selectOptions(screen.getByRole('combobox'), 'county');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ scope: 'county' });
      });
    });
  });

  // ===========================================================================
  // Override Tests
  // ===========================================================================

  describe('Overrides', () => {
    it('should use custom label from override', () => {
      const schema = z.object({ name: z.string() });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            name: { label: 'Full Name' },
          }}
        />
      );

      expect(screen.getByText('Full Name')).toBeInTheDocument();
    });

    it('should render password type when overridden', () => {
      const schema = z.object({ secret: z.string() });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            secret: { type: 'password' },
          }}
        />
      );

      const input = screen.getByLabelText(/secret/i);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render textarea when overridden', () => {
      const schema = z.object({ bio: z.string() });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            bio: { type: 'textarea' },
          }}
        />
      );

      expect(screen.getByRole('textbox')).toHaveProperty('tagName', 'TEXTAREA');
    });

    it('should use custom render function', () => {
      const schema = z.object({ custom: z.string() });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            custom: {
              render: ({ value, onChange }) => (
                <input data-testid="custom-input" value={value ?? ''} onChange={e => onChange(e.target.value)} />
              ),
            },
          }}
        />
      );

      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('should show description when provided', () => {
      const schema = z.object({ email: z.string() });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            email: { description: 'Your work email address' },
          }}
        />
      );

      expect(screen.getByText('Your work email address')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Submit Tests
  // ===========================================================================

  describe('Form Submission', () => {
    it('should call onSubmit with form values', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue({ success: true });
      const schema = z.object({ name: z.string() });

      render(<SnowForm schema={schema} onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox'), 'John Doe');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
      });
    });

    it('should call onSuccess after successful submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue({ id: '123' });
      const onSuccess = vi.fn();
      const schema = z.object({ name: z.string() });

      render(<SnowForm schema={schema} onSubmit={onSubmit} onSuccess={onSuccess} />);

      await user.type(screen.getByRole('textbox'), 'Jane');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({ id: '123' });
      });
    });

    it('should call onError on submission failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Network error');
      const onSubmit = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const schema = z.object({ name: z.string() });

      render(<SnowForm schema={schema} onSubmit={onSubmit} onSubmitError={onError} />);

      await user.type(screen.getByRole('textbox'), 'Test');
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Function), error);
      });
    });

    it('should transform empty values based on overrides', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue({});
      const schema = z.object({
        imageUrl: z.string().nullable(), // Use nullable to allow null values
      });

      render(
        <SnowForm
          schema={schema}
          onSubmit={onSubmit}
          overrides={{
            imageUrl: { emptyAsNull: true },
          }}
        />
      );

      // Leave field empty and submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ imageUrl: null });
      });
    });
  });

  // ===========================================================================
  // Children Pattern Tests
  // ===========================================================================

  describe('Children Pattern', () => {
    it('should support children render function', () => {
      const schema = z.object({
        firstName: z.string(),
        lastName: z.string(),
      });

      render(
        <SnowForm schema={schema}>
          {({ renderField }) => (
            <div data-testid="custom-layout">
              {renderField('firstName')}
              {renderField('lastName')}
            </div>
          )}
        </SnowForm>
      );

      expect(screen.getByTestId('custom-layout')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /firstname/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /lastname/i })).toBeInTheDocument();
    });

    it('should provide renderSubmitButton helper', () => {
      const schema = z.object({ name: z.string() });

      render(
        <SnowForm schema={schema}>
          {({ renderField, renderSubmitButton }) => (
            <>
              {renderField('name')}
              {renderSubmitButton({ children: 'Save Changes' })}
            </>
          )}
        </SnowForm>
      );

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should provide watch helper', async () => {
      const user = userEvent.setup();
      const schema = z.object({
        showBio: z.boolean(),
        bio: z.string().optional(),
      });

      render(
        <SnowForm schema={schema}>
          {({ renderField, form }) => (
            <>
              {renderField('showBio')}
              {form.watch('showBio') && renderField('bio')}
            </>
          )}
        </SnowForm>
      );

      // Bio should not be visible initially
      expect(screen.queryByRole('textbox', { name: /bio/i })).not.toBeInTheDocument();

      // Check the checkbox to show bio
      await user.click(screen.getByRole('checkbox'));

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /bio/i })).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Default Values Tests
  // ===========================================================================

  describe('Default Values', () => {
    it('should use provided defaultValues', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      render(<SnowForm schema={schema} defaultValues={{ name: 'John', email: 'john@example.com' }} />);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('should fetch async default values', async () => {
      const schema = z.object({ name: z.string() });
      const fetchDefaultValues = vi.fn().mockResolvedValue({ name: 'Async Name' });

      render(<SnowForm schema={schema} fetchDefaultValues={fetchDefaultValues} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Async Name')).toBeInTheDocument();
      });

      expect(fetchDefaultValues).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Registry Tests
  // ===========================================================================

  describe('Component Registry', () => {
    it('should use registered custom component', () => {
      const schema = z.object({ name: z.string() });

      // Register a custom text input
      registerComponent('text', ({ value, onChange }) => (
        <input
          data-testid="custom-text-input"
          value={(value ?? '') as string}
          onChange={e => onChange(e.target.value)}
        />
      ));

      render(<SnowForm schema={schema} />);

      expect(screen.getByTestId('custom-text-input')).toBeInTheDocument();
    });

    it('should use registered submit button', () => {
      const schema = z.object({ name: z.string() });

      registerSubmitButton(({ children, loading }) => (
        <button data-testid="custom-submit" disabled={loading}>
          {loading ? 'Processing...' : children}
        </button>
      ));

      render(<SnowForm schema={schema} />);

      expect(screen.getByTestId('custom-submit')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Translation Tests
  // ===========================================================================

  describe('Translations', () => {
    it('should use registered translation function for labels', () => {
      const schema = z.object({ email: z.string() });

      // Translation function receives field name directly
      setTranslationFunction((key: string) => {
        if (key === 'email') return 'Adresse email';
        return key;
      });

      render(<SnowForm schema={schema} />);

      expect(screen.getByText('Adresse email')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Required Field Indicator Tests
  // ===========================================================================

  describe('Required Field Indicators', () => {
    it('should show asterisk for required fields', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      render(<SnowForm schema={schema} />);

      // Required field should have asterisk
      const requiredLabel = screen.getByText(/required/i);
      expect(requiredLabel.textContent).toContain('*');

      // Optional field should NOT have asterisk
      const optionalLabel = screen.getByText(/optional/i);
      expect(optionalLabel.textContent).not.toContain('*');
    });
  });

  // ===========================================================================
  // Field Types Tests
  // ===========================================================================

  describe('Field Types', () => {
    it('should render hidden field without label', () => {
      const schema = z.object({
        visible: z.string(),
        hiddenId: z.string(),
      });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            hiddenId: { type: 'hidden' },
          }}
          defaultValues={{ hiddenId: 'secret-value' }}
        />
      );

      // Hidden field should exist but not be visible
      const hiddenInput = document.querySelector('input[type="hidden"][name="hiddenId"]');
      expect(hiddenInput).toBeInTheDocument();
      expect(hiddenInput).toHaveValue('secret-value');

      // Hidden field should not have a label
      expect(screen.queryByText(/hiddenId/i)).not.toBeInTheDocument();

      // Visible field should still be visible
      expect(screen.getByRole('textbox', { name: /visible/i })).toBeInTheDocument();
    });

    it('should render disabled field', () => {
      const schema = z.object({
        readOnly: z.string(),
      });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            readOnly: { disabled: true },
          }}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render select with custom options', () => {
      const schema = z.object({
        country: z.string(),
      });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            country: {
              type: 'select',
              options: [
                { label: 'France', value: 'FR' },
                { label: 'Germany', value: 'DE' },
                { label: 'Spain', value: 'ES' },
              ],
            },
          }}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      // Check options are present
      expect(screen.getByRole('option', { name: 'France' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Germany' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Spain' })).toBeInTheDocument();
    });

    it('should render date picker', () => {
      const schema = z.object({
        birthDate: z.date(),
      });

      render(<SnowForm schema={schema} />);

      const dateInput = screen.getByLabelText(/birthDate/i);
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('should render number input', () => {
      const schema = z.object({
        quantity: z.number(),
      });

      render(<SnowForm schema={schema} />);

      const numberInput = screen.getByRole('spinbutton');
      expect(numberInput).toBeInTheDocument();
    });

    it('should render radio buttons when specified', () => {
      const schema = z.object({
        size: z.enum(['small', 'medium', 'large']),
      });

      render(
        <SnowForm
          schema={schema}
          overrides={{
            size: { type: 'radio' },
          }}
        />
      );

      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe('Validation', () => {
    it('should show validation error for too short string', async () => {
      const user = userEvent.setup();
      const schema = z.object({
        username: z.string().min(3, 'Username must be at least 3 characters'),
      });

      render(<SnowForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'ab'); // Too short
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/at least 3 characters/i);
      });
    });

    it('should show validation error for required field', async () => {
      const user = userEvent.setup();
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
      });

      render(<SnowForm schema={schema} onSubmit={vi.fn()} />);

      // Submit without filling the field
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i);
      });
    });

    it('should clear validation error when field is corrected', async () => {
      const user = userEvent.setup();
      const schema = z.object({
        name: z.string().min(1, 'Name is required'),
      });

      render(<SnowForm schema={schema} onSubmit={vi.fn()} />);

      // Submit empty to trigger error
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Fill the field
      await user.type(screen.getByRole('textbox'), 'John');

      // Error should disappear
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });
});
