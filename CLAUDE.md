# CLAUDE.md - @snowpact/snowform

Automatic form generation from Zod schemas with react-hook-form.

## Project Context

This is a standalone npm package extracted from a larger monorepo. It provides:
- Automatic form field generation from Zod schemas
- Extensible component registry for custom UI components
- Translation hook support (i18next, next-intl, etc.)
- Children render pattern for custom layouts
- Zero runtime dependencies (only peer dependencies)

## Quick Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build the library
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm typecheck        # Type check without emitting
```

## Architecture

```
src/
├── index.ts           # Public exports
├── SnowForm.tsx       # Main component
├── SnowFormField.tsx  # Field renderer
├── FormProvider.tsx   # Form context and layout components
├── types.ts           # TypeScript types
├── utils/             # Utility functions
│   ├── index.ts       # Barrel exports
│   ├── cn.ts          # Class name merger (no dependencies)
│   ├── form.ts        # Form helpers (defaultValues, overrides, fieldType)
│   ├── date.ts        # Date utilities
│   └── zod.ts         # Zod schema analysis
├── registry/          # Extensibility registries
│   ├── componentRegistry.tsx
│   ├── translationRegistry.ts
│   ├── formUIRegistry.ts
│   └── behaviorRegistry.ts
├── components/        # Default HTML components
│   ├── DefaultInput.tsx
│   ├── DefaultTextarea.tsx
│   ├── DefaultSelect.tsx
│   ├── DefaultNumberInput.tsx
│   ├── DefaultDatePicker.tsx
│   ├── DefaultCheckbox.tsx
│   └── DefaultRadio.tsx
└── __tests__/         # Tests
```

## Key Decisions

- **Zod 4+ only** - No support for Zod 3.x
- **No runtime dependencies** - Only peer dependencies
- **Specialized for Zod** - No adapter pattern, direct Zod integration
- **ESM + CJS** - Dual module format via Vite library mode
- **React 18+** - Modern React features

## Peer Dependencies

```json
{
  "react": ">=18.0.0",
  "react-dom": ">=18.0.0",
  "react-hook-form": ">=7.0.0",
  "zod": ">=4.0.0",
  "@hookform/resolvers": ">=3.0.0"
}
```

## Testing

Tests use Vitest + React Testing Library + jsdom.

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
```

## Publishing

```bash
pnpm build             # Build first
npm publish --access public  # Publish to npm
```

## Development Notes

- The `cn()` function in `utils/cn.ts` is a simple class name merger with no dependencies
- Form utilities (default values, overrides, field type resolution) are in `utils/form.ts`
- Zod schema analysis is in `zodUtils.ts` (simplified from adapter pattern)
- Component registry allows replacing default HTML components
- Translation hook can be set for i18n support
- Form UI styles can be registered for default CSS classes
