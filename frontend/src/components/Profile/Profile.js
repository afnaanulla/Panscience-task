import React from 'react';
import { User } from 'lucide-react';

const Profile = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-sm text-gray-700">
          Manage your profile information and settings
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-12 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Profile Management
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Profile management functionality will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
