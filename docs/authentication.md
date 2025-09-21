# Authentication

POSMID uses Laravel Sanctum for API authentication, providing token-based authentication for both web and mobile clients. This guide covers authentication setup, configuration, and usage.

## Overview

POSMID authentication is built on Laravel Sanctum, which provides:

- **SPA Authentication** - Cookie-based auth for single-page applications
- **API Token Authentication** - Bearer token authentication for mobile apps and third-party clients
- **Multi-Guard Support** - Separate guards for different authentication contexts
- **Automatic Token Management** - Token creation, refresh, and expiration

## Configuration

### Sanctum Configuration

Located in `config/sanctum.php`:

```php
<?php

return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1,::1')),

    'guard' => ['web'],

    'expiration' => env('SANCTUM_EXPIRATION', 525600), // 1 year in minutes

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'Bearer'),

    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
    ],
];
```

**Configuration Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `stateful` | array | ['localhost', '127.0.0.1'] | Domains that should receive stateful authentication |
| `guard` | array | ['web'] | Guards that Sanctum should use |
| `expiration` | integer | 525600 | Token expiration time in minutes |
| `token_prefix` | string | 'Bearer' | Prefix for authorization header |
| `middleware` | array | [...] | Middleware classes for CSRF and cookie encryption |

### Environment Variables

```env
SANCTUM_STATEFUL_DOMAINS=localhost,127.0.0.1,::1
SANCTUM_GUARD=web
SANCTUM_EXPIRATION=525600
SANCTUM_TOKEN_PREFIX=Bearer
```

## Authentication Guards

### Web Guard (SPA Authentication)

Used for frontend React application:

```php
// config/auth.php
'guards' => [
    'web' => [
        'driver' => 'session',
        'provider' => 'users',
    ],
],
```

### API Guard (Token Authentication)

Used for mobile apps and third-party APIs:

```php
'guards' => [
    'api' => [
        'driver' => 'sanctum',
        'provider' => 'users',
    ],
],
```

## User Model

The User model includes Sanctum traits and permission relationships:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Relationships
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    // Sanctum tokens relationship
    public function tokens()
    {
        return $this->morphMany(PersonalAccessToken::class, 'tokenable');
    }
}
```

## Authentication Routes

### API Routes

Located in `routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');
```

### Web Routes (SPA)

Located in `routes/web.php`:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*')->middleware('auth');
```

## Authentication Controllers

### AuthController

Handles authentication logic:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();
        $token = $user->createToken('API Token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}
```

## API Authentication Middleware

### Sanctum Middleware

Applied to protected routes:

```php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('products', ProductController::class);
    Route::apiResource('orders', OrderController::class);
    Route::apiResource('customers', CustomerController::class);
});
```

### Custom Middleware

For additional authentication logic:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (!$request->user()->can($permission)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $next($request);
    }
}
```

## Frontend Authentication

### React Authentication Context

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, password_confirmation: password }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const value = {
    user,
    token,
    login,
    logout,
    register,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### API Client with Authentication

```typescript
// src/api/client.ts
import { useAuth } from '../contexts/AuthContext';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const { token } = useAuth();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Products
  async getProducts(params?: any) {
    return this.request('/products', { method: 'GET' });
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Add other API methods...
}

export const apiClient = new ApiClient();
```

## Token Management

### Creating Tokens

```php
// Create a token for a user
$token = $user->createToken('API Token')->plainTextToken;

// Create token with abilities
$token = $user->createToken('API Token', ['products:read', 'products:write']);
```

### Token Abilities

Define token permissions:

```php
$user->createToken('Limited Token', ['products:read']);
$user->createToken('Full Access Token', ['*']);
```

### Checking Token Abilities

```php
if ($request->user()->tokenCan('products:write')) {
    // User can write products
}
```

### Revoking Tokens

```php
// Revoke current token
$request->user()->currentAccessToken()->delete();

// Revoke all tokens
$user->tokens()->delete();

// Revoke specific token
$user->tokens()->where('id', $tokenId)->delete();
```

## Multi-Tenancy Authentication

### Tenant-Scoped Authentication

Users are scoped to tenants:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;

class User extends Authenticatable
{
    // ... other methods

    protected static function booted()
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (tenant()) {
                $builder->where('tenant_id', tenant()->id);
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

### Tenant Middleware

Apply tenant context to requests:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SetTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Extract tenant from subdomain, header, or route
        $tenant = $this->resolveTenant($request);

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Set tenant context
        config(['database.connections.tenant.database' => $tenant->database]);
        DB::setDefaultConnection('tenant');

        return $next($request);
    }

    private function resolveTenant(Request $request)
    {
        // Implement tenant resolution logic
        // From subdomain, header, or route parameter
    }
}
```

## Security Best Practices

### Password Requirements

```php
// In AuthController
$request->validate([
    'password' => [
        'required',
        'string',
        'min:8',
        'regex:/[a-z]/',
        'regex:/[A-Z]/',
        'regex:/[0-9]/',
        'regex:/[@$!%*#?&]/',
    ],
]);
```

### Rate Limiting

```php
// In routes/api.php
Route::middleware(['throttle:login'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(['throttle:api'])->group(function () {
    Route::middleware('auth:sanctum')->group(function () {
        // Protected routes
    });
});
```

### CSRF Protection

Sanctum handles CSRF for SPA authentication automatically.

### Token Expiration

Configure appropriate token expiration:

```env
SANCTUM_EXPIRATION=525600  # 1 year
```

## Testing Authentication

### Unit Tests

```php
<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_token()
    {
        $user = User::factory()->create();

        $token = $user->createToken('Test Token');

        $this->assertNotNull($token);
        $this->assertNotEmpty($token->plainTextToken);
    }

    public function test_user_can_authenticate_with_token()
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test Token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/user');

        $response->assertOk()
                ->assertJson(['id' => $user->id]);
    }
}
```

### Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register()
    {
        $userData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->post('/api/register', $userData);

        $response->assertCreated()
                ->assertJsonStructure(['user', 'token']);
    }

    public function test_user_can_login()
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
        ]);

        $response = $this->post('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ]);

        $response->assertOk()
                ->assertJsonStructure(['user', 'token']);
    }

    public function test_authenticated_user_can_access_protected_route()
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test Token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/user');

        $response->assertOk();
    }
}
```

## Troubleshooting

### Common Issues

1. **CORS Issues**
   - Ensure frontend domain is in `SANCTUM_STATEFUL_DOMAINS`
   - Check CORS configuration in `config/cors.php`

2. **Token Not Working**
   - Verify token is sent with correct format: `Bearer {token}`
   - Check token expiration
   - Ensure user has proper permissions

3. **Session Issues**
   - Clear browser cookies and localStorage
   - Check session configuration
   - Verify CSRF token handling

4. **Multi-tenancy Problems**
   - Ensure tenant context is set correctly
   - Check tenant database connection
   - Verify user belongs to correct tenant

### Debugging Commands

```bash
# Check Sanctum configuration
php artisan sanctum:check

# List user tokens
php artisan tinker
$user = App\Models\User::find(1);
$user->tokens

# Clear all tokens
$user->tokens()->delete()
```

## Next Steps

- [Authorization](authorization.md) - Role-based permissions and access control
- [API Reference](api.md) - Complete API endpoints documentation
- [Testing](testing.md) - Authentication testing guidelines

---

[← Configuration](configuration.md) | [Authorization →](authorization.md)