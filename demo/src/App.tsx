import { useState } from 'react';
import { z } from 'zod';
import {
  SnowForm,
  setupSnowForm,
  resetSnowForm,
} from '../../src';
import {
  CodePanel,
  ConfigPanel,
  SubmittedDataDisplay,
  type DemoConfig,
  CUSTOM_COMPONENTS,
  CUSTOM_FORM_UI,
  CUSTOM_SUBMIT_BUTTON,
} from './components';

// Setup with custom components
resetSnowForm();
setupSnowForm({
  translate: key => key,
  components: CUSTOM_COMPONENTS,
  formUI: CUSTOM_FORM_UI,
  submitButton: CUSTOM_SUBMIT_BUTTON,
  styles: {
    form: 'space-y-4',
    formItem: 'space-y-1',
    chip: 'inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full mr-1 mt-1',
  },
  onError: (formRef, errors) => {
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const element = formRef?.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
});

// Complete schema showcasing all field types
const schema = z.object({
  // Text inputs
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Number
  age: z.number().min(18, 'Must be at least 18').max(120, 'Invalid age'),
  // Textarea
  bio: z.string().optional(),
  // Select (enum)
  role: z.enum(['admin', 'user', 'guest']),
  // Custom field type: rating (only shown in custom mode)
  satisfaction: z.number().min(1).max(5).optional(),
  // Array fields
  tags: z.array(z.string()).default([]),
  interests: z.array(z.enum(['tech', 'design', 'business', 'marketing'])).default([]),
  // Checkbox
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
});

type FormData = z.infer<typeof schema>;

// Simulated async data (like from an API)
const fetchUserData = async (): Promise<Partial<FormData>> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'securepassword123',
    age: 28,
    bio: 'Software developer passionate about open source.',
    role: 'admin',
  };
};

export function App() {
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [asyncData, setAsyncData] = useState<Partial<FormData> | null>(null);
  const [isLoadingAsync, setIsLoadingAsync] = useState(false);
  const [config, setConfig] = useState<DemoConfig>({
    renderMode: 'auto',
    simulateSlowSubmission: false,
    simulateEndpointError: false,
    showDebugMode: true,
  });

  const handleSubmit = async (data: FormData) => {
    if (config.simulateSlowSubmission) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (config.simulateEndpointError) {
      const error = new Error('API_VALIDATION_ERROR');
      (error as Error & { fieldErrors: Record<string, string> }).fieldErrors = {
        firstName: 'This first name is already taken',
        email: 'This email is already registered',
      };
      throw error;
    }

    setSubmittedData(data);
    return data;
  };

  const handleSubmitError = (setManualErrors: (errors: Record<string, string> | null) => void, error: unknown) => {
    if (error instanceof Error && 'fieldErrors' in error) {
      const fieldErrors = (error as Error & { fieldErrors: Record<string, string> }).fieldErrors;
      setManualErrors(fieldErrors);
    }
  };

  const handleConfigChange = <K extends keyof DemoConfig>(key: K, value: DemoConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleFillAsync = async () => {
    setIsLoadingAsync(true);
    const data = await fetchUserData();
    setAsyncData(data);
    setFormKey(prev => prev + 1);
    setIsLoadingAsync(false);
  };

  const renderForm = () => {
    const commonProps = {
      key: formKey,
      debug: config.showDebugMode,
      schema,
      defaultValues: asyncData ?? { firstName: '' },
      onSubmit: handleSubmit,
      onSubmitError: handleSubmitError,
      onSuccess: () => alert('Form submitted successfully!'),
      overrides: {
        firstName: { label: 'First Name', placeholder: 'John' },
        lastName: { label: 'Last Name', placeholder: 'Doe' },
        email: {
          label: 'Email Address',
          type: 'email' as const,
          placeholder: 'john@example.com',
          description: 'We will never share your email',
        },
        password: {
          label: 'Password',
          type: 'password' as const,
          placeholder: '••••••••',
          description: 'Must be at least 8 characters',
        },
        age: { label: 'Age', description: 'Must be 18 or older' },
        bio: {
          label: 'Biography',
          type: 'textarea' as const,
          placeholder: 'Tell us about yourself...',
          description: 'Optional',
        },
        role: {
          label: 'Role',
          type: 'select' as const,
          options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'Regular User' },
            { value: 'guest', label: 'Guest' },
          ],
        },
        satisfaction: {
          label: 'Satisfaction Rating',
          description: 'Custom component via render override',
          render: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onChange(star)}
                  className={`text-2xl transition-colors ${
                    (value ?? 0) >= star
                      ? 'text-yellow-400 hover:text-yellow-500'
                      : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          ),
        },
        // Array fields
        tags: {
          label: 'Tags',
          description: 'Press Enter to add a tag',
          placeholder: 'Enter a tag',
        },
        interests: {
          label: 'Interests',
          description: 'Select your areas of interest',
          options: [
            { value: 'tech', label: 'Technology' },
            { value: 'design', label: 'Design' },
            { value: 'business', label: 'Business' },
            { value: 'marketing', label: 'Marketing' },
          ],
        },
        acceptTerms: {
          hideLabel: true,
          render: ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value ?? false}
                onChange={e => onChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">I accept the terms and conditions</span>
            </label>
          ),
        },
      },
    };

    if (config.renderMode === 'children') {
      return (
        <SnowForm {...commonProps}>
          {({ renderField, renderSubmitButton }) => (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>{renderField('firstName')}</div>
                <div>{renderField('lastName')}</div>
              </div>
              {renderField('email')}
              {renderField('password')}
              <div className="grid grid-cols-2 gap-4">
                <div>{renderField('age')}</div>
                <div>{renderField('role')}</div>
              </div>
              {renderField('bio')}
              {renderField('satisfaction')}
              {renderField('tags')}
              {renderField('interests')}
              {renderField('acceptTerms')}
              <div className="pt-4">{renderSubmitButton({ children: 'Create Account' })}</div>
            </div>
          )}
        </SnowForm>
      );
    }

    return <SnowForm {...commonProps} />;
  };

  return (
    <div className="min-h-screen flex">
      {/* Code Panel - Left Side */}
      <div className="w-96 flex-shrink-0 h-screen sticky top-0">
        <CodePanel config={config} />
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">@snowpact/snowform</h1>
          <p className="text-gray-600 mb-8">
            Automatic form generation from Zod schemas with react-hook-form
          </p>

          <div className="rounded-lg shadow-md p-6 mb-8 bg-white">
            {renderForm()}
          </div>

          <SubmittedDataDisplay data={submittedData} />
        </div>
      </div>

      {/* Config Panel - Right Side Fixed */}
      <div className="w-72 flex-shrink-0 h-screen sticky top-0">
        <ConfigPanel
          config={config}
          onConfigChange={handleConfigChange}
          onFillAsync={handleFillAsync}
          isLoadingAsync={isLoadingAsync}
        />
      </div>
    </div>
  );
}
