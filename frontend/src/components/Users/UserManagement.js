import React from 'react';
import { Users } from 'lucide-react';

const UserManagement = () => {
  return (
    <div>
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage users and their roles in the system
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            User Management
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            User management functionality will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
