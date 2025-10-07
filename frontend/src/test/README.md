# Testing Guide

This directory contains test utilities and configuration for the frontend application.

## 📁 Directory Structure

```
src/test/
├── README.md           # This file
├── setup.ts           # Global test setup (Vitest)
└── test-utils.tsx     # Custom render functions & helpers
```

## 🚀 Quick Start

### Run Tests

```bash
# Watch mode (recommended for development)
npm run test

# UI mode (visual test runner)
npm run test:ui

# Run once (CI mode)
npm run test:run

# With coverage report
npm run test:coverage
```

### Write Your First Test

```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('handles button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

## 🛠️ Test Utilities

### renderWithProviders()

Custom render function that wraps components with necessary providers:
- React Query QueryClientProvider
- React Router BrowserRouter

```typescript
import { renderWithProviders } from '@/test/test-utils';

const { getByText, getByRole } = renderWithProviders(<MyComponent />);
```

### Mock Data Generators

```typescript
import {
  mockTenantId,
  mockProductId,
  mockVariantId,
  mockProductVariant,
  mockVariantListResponse,
} from '@/test/test-utils';

// Generate mock IDs
const tenantId = mockTenantId(); // UUID
const productId = mockProductId(); // UUID
const variantId = mockVariantId(); // UUID

// Generate mock objects
const variant = mockProductVariant({
  sku: 'CUSTOM-SKU',
  price: 150,
});

const listResponse = mockVariantListResponse(10); // 10 variants
```

### Mock API Functions

```typescript
import { mockApiSuccess, mockApiError } from '@/test/test-utils';

// Mock successful API call
const mockFetch = mockApiSuccess({ data: 'result' });

// Mock failed API call
const mockFetchError = mockApiError('Network error');
```

## 📚 Testing Patterns

### 1. Component Testing

```typescript
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('renders and interacts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyComponent />);
    
    // Query elements
    const button = screen.getByRole('button');
    const input = screen.getByLabelText(/search/i);
    
    // Simulate user actions
    await user.type(input, 'test');
    await user.click(button);
    
    // Assert results
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

### 2. Hook Testing

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useMyHook', () => {
  it('fetches data', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### 3. API Mocking

```typescript
import { vi } from 'vitest';
import * as api from '@/api/myApi';

vi.spyOn(api, 'fetchData').mockResolvedValue({ data: 'mock' });

// Your test...

expect(api.fetchData).toHaveBeenCalledWith({ id: '123' });
```

### 4. Async Testing

```typescript
import { waitFor } from '@testing-library/react';

it('handles async operations', async () => {
  renderWithProviders(<AsyncComponent />);
  
  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
  
  // Assert final state
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

## 🎯 Best Practices

### 1. Query Priority

Use queries in this order (from most to least preferred):

1. **getByRole** - Best for accessibility
2. **getByLabelText** - Good for form fields
3. **getByPlaceholderText** - OK for inputs
4. **getByText** - Good for non-interactive elements
5. **getByTestId** - Last resort

```typescript
// ✅ Good
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');

// ❌ Avoid
screen.getByTestId('submit-button');
```

### 2. User-Centric Testing

Test behavior, not implementation:

```typescript
// ✅ Good - Tests user behavior
it('submits form', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Form />);
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// ❌ Bad - Tests implementation
it('calls handleSubmit', () => {
  const handleSubmit = vi.fn();
  renderWithProviders(<Form onSubmit={handleSubmit} />);
  
  // Directly calling internal methods
  component.handleSubmit();
  expect(handleSubmit).toHaveBeenCalled();
});
```

### 3. Async Handling

Always use `waitFor` for async operations:

```typescript
// ✅ Good
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ❌ Bad
setTimeout(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, 1000);
```

### 4. Mock External Dependencies

Mock API calls, localStorage, etc.:

```typescript
import { vi } from 'vitest';

// Mock API
vi.mock('@/api/myApi', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mock' }),
}));

// Mock localStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
};
global.localStorage = mockStorage as any;
```

### 5. Clean Tests

Each test should be independent:

```typescript
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Setup before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  cleanup();
});
```

## 🔒 IMMUTABLE RULES Testing

All tests must verify IMMUTABLE RULES compliance:

```typescript
describe('IMMUTABLE RULES Compliance', () => {
  it('requires tenantId prop', () => {
    // @ts-expect-error Testing required prop
    expect(() => renderWithProviders(<Component />)).toThrow();
  });

  it('passes tenant-scoped parameters', async () => {
    const mockApi = vi.spyOn(api, 'fetchVariants');
    
    renderWithProviders(<Component tenantId={mockTenantId()} />);
    
    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId(),
        })
      );
    });
  });

  it('all data includes tenant_id', async () => {
    const { result } = renderHook(() => useVariants(mockTenantId()), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => {
      result.current.data?.forEach((item) => {
        expect(item.tenant_id).toBe(mockTenantId());
      });
    });
  });
});
```

## 📊 Coverage

Check test coverage:

```bash
npm run test:coverage
```

Open the HTML report:

```bash
# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html

# Windows
start coverage/index.html
```

Coverage targets:
- **Statements:** 80%+
- **Branches:** 80%+
- **Functions:** 80%+
- **Lines:** 80%+

## 🐛 Debugging Tests

### 1. Use test.only

```typescript
it.only('this test runs alone', () => {
  // Debug this specific test
});
```

### 2. Use debug()

```typescript
import { screen } from '@testing-library/react';

it('debugs output', () => {
  renderWithProviders(<Component />);
  
  // Print current DOM
  screen.debug();
  
  // Print specific element
  screen.debug(screen.getByRole('button'));
});
```

### 3. Use Vitest UI

```bash
npm run test:ui
```

Opens visual test runner in browser with:
- Test file explorer
- Test results
- Coverage visualization
- Console output

### 4. Check Query Errors

If query fails, Testing Library shows helpful error:

```
TestingLibraryElementError: Unable to find an accessible element with the role "button"

Here are the accessible roles:

  heading:
  Name "Title":
  <h1 />

  textbox:
  Name "Search":
  <input />
```

## 📝 Common Scenarios

### Testing Forms

```typescript
it('submits form with validation', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  renderWithProviders(<MyForm onSubmit={onSubmit} />);
  
  // Fill form
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  
  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  // Verify
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  });
});
```

### Testing Modals

```typescript
it('opens and closes modal', async () => {
  const user = userEvent.setup();
  
  renderWithProviders(<ComponentWithModal />);
  
  // Open modal
  await user.click(screen.getByRole('button', { name: /open/i }));
  
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Modal Content')).toBeInTheDocument();
  
  // Close modal
  await user.click(screen.getByRole('button', { name: /close/i }));
  
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

### Testing Lists with Pagination

```typescript
it('paginates list', async () => {
  const user = userEvent.setup();
  
  renderWithProviders(<PaginatedList />);
  
  // Check first page
  expect(screen.getByText('Item 1')).toBeInTheDocument();
  
  // Go to next page
  await user.click(screen.getByRole('button', { name: /next/i }));
  
  // Check second page
  expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  expect(screen.getByText('Item 11')).toBeInTheDocument();
});
```

## 🔗 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event](https://testing-library.com/docs/user-event/intro)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 💡 Tips

1. **Write tests alongside code** - Don't wait until the end
2. **Test user behavior** - Not implementation details
3. **Keep tests simple** - One concept per test
4. **Use descriptive names** - Test name = documentation
5. **Mock external dependencies** - Tests should be isolated
6. **Avoid test IDs** - Use accessible queries
7. **Test error states** - Not just happy paths
8. **Run tests before commit** - Catch issues early

## ❓ FAQ

**Q: Tests are slow, how to speed up?**
A: Use `test.concurrent()` for independent tests, mock heavy operations, reduce timeout values.

**Q: How to test components with React Query?**
A: Use `renderWithProviders()` which wraps in QueryClientProvider.

**Q: How to test components with React Router?**
A: Use `renderWithProviders()` which wraps in BrowserRouter.

**Q: Test fails intermittently?**
A: Usually timing issues. Use `waitFor()` for async operations, increase timeout if needed.

**Q: How to test component that uses localStorage?**
A: Mock it:
```typescript
const mockStorage = { getItem: vi.fn(), setItem: vi.fn() };
global.localStorage = mockStorage as any;
```

---

**Happy Testing!** 🧪✨