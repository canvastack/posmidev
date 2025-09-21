import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusIcon } from '@heroicons/react/24/outline';

export const UsersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users in your organization
          </p>
        </div>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">User management coming soon</p>
            <p className="text-sm text-gray-400 mt-1">
              This feature will allow you to invite and manage users within your tenant
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};