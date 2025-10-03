import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/authApi';
import type { RegisterForm } from '@/types';

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterForm>({
    tenant_name: '',
    user_name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.register(form);
      login(response.user, response.token);
      navigate('/admin/dashboard');
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <AuthLayout>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Create your account
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Input
          label="Store Name"
          name="tenant_name"
          type="text"
          required
          value={form.tenant_name}
          onChange={handleChange}
          placeholder="My Awesome Store"
        />

        <Input
          label="Your Name"
          name="user_name"
          type="text"
          required
          value={form.user_name}
          onChange={handleChange}
          placeholder="John Doe"
        />

        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder="john@example.com"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={handleChange}
          placeholder="Minimum 8 characters"
        />

        <Button
          type="submit"
          className="w-full"
          loading={loading}
        >
          Create Account
        </Button>

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}