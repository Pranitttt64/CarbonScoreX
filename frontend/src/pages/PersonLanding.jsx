/**
 * Individual/Person Landing Page
 * Marketing page for individual tree owners
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, DollarSign, TrendingUp } from 'lucide-react';

function PersonLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Leaf className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">CarbonScoreX</span>
          </div>
          <div className="flex space-x-4">
            <Link to="/login" className="text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link to="/register" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Register
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Monetize Your Trees
            <br />
            <span className="text-green-600">Sell Carbon Credits</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Own trees? Turn them into carbon credits and sell to companies
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <Leaf className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Register Trees</h3>
            <p className="text-gray-600">Document your tree ownership and carbon sequestration</p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <DollarSign className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Earn Credits</h3>
            <p className="text-gray-600">Receive carbon credits based on your trees</p>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <TrendingUp className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Sell on Marketplace</h3>
            <p className="text-gray-600">Trade credits directly with companies</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonLanding;