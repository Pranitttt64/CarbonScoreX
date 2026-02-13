/**
 * Government Landing Page
 * Marketing page for government users
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, BarChart3, Users, FileCheck } from 'lucide-react';

function GovLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-bold">CarbonScoreX Gov</span>
          </div>
          <Link to="/login" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Sign In
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Government Dashboard
            <br />
            <span className="text-indigo-600">Monitor & Regulate</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Track carbon scores, manage tenders, and enforce environmental compliance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <BarChart3 className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600">Real-time industry trends and compliance statistics</p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <Users className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Company Monitoring</h3>
            <p className="text-gray-600">Track all registered companies and their carbon scores</p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <FileCheck className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Tender Management</h3>
            <p className="text-gray-600">Create and manage procurement opportunities</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GovLanding;