import type { DemoConfig } from './types';

export function generateInstallCode(): string {
  return `npm install react-hook-form @hookform/resolvers zod
npm install @snowpact/snowform`;
}

export function generateSetupCode(): string {
  return `// Run once at app startup (e.g., app/setup.ts, _app.tsx, main.tsx)
import { setupSnowForm } from '@snowpact/snowform';
import type { RegisteredComponentProps } from '@snowpact/snowform';

// Your input component
function MyInput({ value, onChange, placeholder, disabled, name }: RegisteredComponentProps<string>) {
  return (
    <input
      id={name}
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md
                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  );
}

setupSnowForm({
  translate: (key) => key,
  components: {
    text: MyInput,
    email: (props) => <MyInput {...props} type="email" />,
    password: (props) => <MyInput {...props} type="password" />,
    textarea: MyTextarea,
    select: MySelect,
    checkbox: MyCheckbox,
    number: MyNumberInput,
    date: MyDatePicker,
  },
  formUI: {
    label: ({ children, required, htmlFor }) => (
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    ),
    description: ({ children }) => <p className="text-sm text-gray-500">{children}</p>,
    errorMessage: ({ message }) => <p className="text-sm text-red-600">{message}</p>,
  },
  submitButton: ({ loading, disabled, children }) => (
    <button
      type="submit"
      disabled={disabled || loading}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white
                 font-medium rounded-md disabled:opacity-50"
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
  styles: {
    form: 'space-y-4',
    formItem: 'space-y-1',
    chip: 'inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded-full mr-1 mt-1',
  },
});`;
}

export function generateFormCode(config: DemoConfig): string {
  const debugProp = config.showDebugMode ? '\n      debug={true}' : '';

  if (config.renderMode === 'children') {
    return `import { SnowForm } from '@snowpact/snowform';
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  acceptTerms: z.boolean().refine(val => val === true, 'Required'),
});

function MyForm() {
  return (
    <SnowForm
      schema={schema}
      defaultValues={{ firstName: '' }}${debugProp}
      onSubmit={async (data) => {
        await saveToApi(data);
      }}
      overrides={{
        firstName: { label: 'First Name', placeholder: 'John' },
        lastName: { label: 'Last Name', placeholder: 'Doe' },
        email: { label: 'Email', type: 'email' },
        bio: { label: 'Bio', type: 'textarea' },
        role: {
          label: 'Role',
          options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' },
          ],
        },
        acceptTerms: { label: 'I accept the terms' },
      }}
    >
      {({ renderField, renderSubmitButton }) => (
        <div className="grid grid-cols-2 gap-4">
          <div>{renderField('firstName')}</div>
          <div>{renderField('lastName')}</div>
          <div className="col-span-2">{renderField('email')}</div>
          <div className="col-span-2">{renderField('bio')}</div>
          <div>{renderField('role')}</div>
          <div>{renderField('acceptTerms')}</div>
          <div className="col-span-2">
            {renderSubmitButton({ children: 'Create Account' })}
          </div>
        </div>
      )}
    </SnowForm>
  );
}`;
  }

  return `import { SnowForm } from '@snowpact/snowform';
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18'),
  bio: z.string().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  satisfaction: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  interests: z.array(z.enum(['tech', 'design', 'business', 'marketing'])).default([]),
  acceptTerms: z.boolean().refine(val => val === true, 'Required'),
});

function MyForm() {
  return (
    <SnowForm
      schema={schema}
      defaultValues={{ firstName: '' }}${debugProp}
      onSubmit={async (data) => {
        await saveToApi(data);
      }}
      overrides={{
        firstName: { label: 'First Name', placeholder: 'John' },
        lastName: { label: 'Last Name', placeholder: 'Doe' },
        email: {
          label: 'Email',
          type: 'email',
          description: 'We will never share your email',
        },
        age: { label: 'Age' },
        bio: { label: 'Bio', type: 'textarea' },
        role: {
          label: 'Role',
          options: [
            { value: 'admin', label: 'Administrator' },
            { value: 'user', label: 'User' },
            { value: 'guest', label: 'Guest' },
          ],
        },
        satisfaction: {
          label: 'Satisfaction',
          render: ({ value, onChange }) => (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onChange(star)}
                  className={value >= star ? 'text-yellow-400' : 'text-gray-300'}
                >
                  ★
                </button>
              ))}
            </div>
          ),
        },
        tags: { label: 'Tags', placeholder: 'Enter a tag' },
        interests: { label: 'Interests', description: 'Select your areas of interest' },
        acceptTerms: { label: 'I accept the terms' },
      }}
    />
  );
}`;
}
