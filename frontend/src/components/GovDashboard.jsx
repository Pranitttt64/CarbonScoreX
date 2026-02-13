// GovDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

export function GovDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [distribution, setDistribution] = useState([]);

  // Active tab state
  const [activeTab, setActiveTab] = useState('companies');

  // Company list state
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companySearch, setCompanySearch] = useState('');
  const [companySortOrder, setCompanySortOrder] = useState('desc');
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Individual list state
  const [individuals, setIndividuals] = useState([]);
  const [totalIndividuals, setTotalIndividuals] = useState(0);
  const [individualSearch, setIndividualSearch] = useState('');
  const [individualSortOrder, setIndividualSortOrder] = useState('desc');
  const [individualsLoading, setIndividualsLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const response = await api.getAllGovCompanies({
        search: companySearch,
        sortOrder: companySortOrder,
        limit: 100
      });
      setCompanies(response.data.companies);
      setTotalCompanies(response.data.total);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setCompaniesLoading(false);
    }
  }, [companySearch, companySortOrder]);

  const loadIndividuals = useCallback(async () => {
    setIndividualsLoading(true);
    try {
      const response = await api.getAllGovIndividuals({
        search: individualSearch,
        sortOrder: individualSortOrder
      });
      setIndividuals(response.data.individuals);
      setTotalIndividuals(response.data.total);
    } catch (error) {
      console.error('Failed to load individuals:', error);
    } finally {
      setIndividualsLoading(false);
    }
  }, [individualSearch, individualSortOrder]);

  useEffect(() => {
    if (activeTab === 'companies') {
      loadCompanies();
    }
  }, [activeTab, loadCompanies]);

  useEffect(() => {
    if (activeTab === 'individuals') {
      loadIndividuals();
    }
  }, [activeTab, loadIndividuals]);

  const loadDashboard = async () => {
    try {
      const [dashRes, distRes] = await Promise.all([
        api.getGovDashboard(),
        api.getScoreDistribution()
      ]);
      setDashboard(dashRes.data);
      setDistribution(distRes.data.distribution);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'Excellent':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'Good':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'Fair':
        return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
      default:
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 65) return 'text-blue-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getCreditColor = (credits) => {
    if (credits >= 2000) return 'text-emerald-400';
    if (credits >= 1000) return 'text-blue-400';
    if (credits >= 500) return 'text-amber-400';
    return 'text-slate-400';
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-xl text-gray-600">Loading dashboard...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white">Gov Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor & Compliance</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveTab('companies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'companies'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="font-medium">Companies</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeTab === 'companies' ? 'bg-blue-500' : 'bg-slate-700'
              }`}>
              {totalCompanies}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('individuals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeTab === 'individuals'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">Individuals</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeTab === 'individuals' ? 'bg-blue-500' : 'bg-slate-700'
              }`}>
              {totalIndividuals}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer Stats */}
        <div className="p-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{dashboard?.statistics?.average_score?.toFixed(0) || 0}</div>
              <div className="text-xs text-slate-400">Avg Score</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-lg font-bold text-emerald-400">{dashboard?.statistics?.active_certificates || 0}</div>
              <div className="text-xs text-slate-400">Certified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">
            {activeTab === 'companies' ? 'All Companies' : 'All Individuals'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {activeTab === 'companies'
              ? 'View and monitor all registered companies with their carbon scores'
              : 'View all individual users and their carbon credit balances'}
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded-full">
                {activeTab === 'companies' ? `${totalCompanies} Companies` : `${totalIndividuals} Individuals`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={activeTab === 'companies' ? "Search companies..." : "Search individuals..."}
                  value={activeTab === 'companies' ? companySearch : individualSearch}
                  onChange={(e) => activeTab === 'companies' ? setCompanySearch(e.target.value) : setIndividualSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-all"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={activeTab === 'companies' ? companySortOrder : individualSortOrder}
                  onChange={(e) => activeTab === 'companies' ? setCompanySortOrder(e.target.value) : setIndividualSortOrder(e.target.value)}
                  className="appearance-none px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                >
                  <option value="desc">{activeTab === 'companies' ? 'Score: High → Low' : 'Credits: High → Low'}</option>
                  <option value="asc">{activeTab === 'companies' ? 'Score: Low → High' : 'Credits: Low → High'}</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-800">
          {activeTab === 'companies' ? (
            // Companies List
            companiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No companies found {companySearch && `matching "${companySearch}"`}
              </div>
            ) : (
              companies.map((company, index) => {
                const categoryStyle = getCategoryStyle(company.score_category);
                return (
                  <div
                    key={company.id}
                    className="flex items-center px-6 py-4 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 text-slate-500 font-mono text-sm">
                      {companySortOrder === 'desc' ? index + 1 : companies.length - index}.
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium group-hover:text-blue-400 transition-colors truncate">
                          {company.company_name}
                        </span>
                        {company.certificate_id && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Certified
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">{company.industry}</div>
                    </div>
                    <div className={`w-20 text-right font-bold text-lg ${getScoreColor(company.score)}`}>
                      {company.score}
                    </div>
                    <div className="w-28 flex justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}>
                        {company.score_category}
                      </span>
                    </div>
                    <div className="w-16 flex justify-end gap-0.5">
                      <div className={`w-1 h-4 rounded-full ${company.score >= 25 ? 'bg-current' : 'bg-slate-700'} ${getScoreColor(company.score)}`}></div>
                      <div className={`w-1 h-4 rounded-full ${company.score >= 50 ? 'bg-current' : 'bg-slate-700'} ${getScoreColor(company.score)}`}></div>
                      <div className={`w-1 h-4 rounded-full ${company.score >= 75 ? 'bg-current' : 'bg-slate-700'} ${getScoreColor(company.score)}`}></div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            // Individuals List
            individualsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : individuals.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No individuals found {individualSearch && `matching "${individualSearch}"`}
              </div>
            ) : (
              individuals.map((individual, index) => {
                const credits = parseFloat(individual.credit_balance);
                return (
                  <div
                    key={individual.id}
                    className="flex items-center px-6 py-4 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 text-slate-500 font-mono text-sm">
                      {individualSortOrder === 'desc' ? index + 1 : individuals.length - index}.
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {individual.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-white font-medium group-hover:text-blue-400 transition-colors truncate block">
                            {individual.full_name}
                          </span>
                          <div className="text-sm text-slate-500">{individual.email}</div>
                        </div>
                      </div>
                    </div>
                    <div className={`w-32 text-right font-bold text-lg ${getCreditColor(credits)}`}>
                      {credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="w-24 text-right text-slate-400 text-sm">
                      credits
                    </div>
                    <div className="w-16 flex justify-end gap-0.5">
                      <div className={`w-1 h-4 rounded-full ${credits >= 500 ? 'bg-current' : 'bg-slate-700'} ${getCreditColor(credits)}`}></div>
                      <div className={`w-1 h-4 rounded-full ${credits >= 1500 ? 'bg-current' : 'bg-slate-700'} ${getCreditColor(credits)}`}></div>
                      <div className={`w-1 h-4 rounded-full ${credits >= 2500 ? 'bg-current' : 'bg-slate-700'} ${getCreditColor(credits)}`}></div>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}

// PersonDashboard.jsx
export function PersonDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        api.getCreditBalance(),
        api.getTransactionHistory()
      ]);
      setBalance(balRes.data.balance);
      setTransactions(txRes.data.transactions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-xl text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Individual Dashboard</h1>
          <p className="text-gray-600">Manage your carbon credits</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Credit Balance</h2>
          <div className="text-5xl font-bold text-green-600">{balance.toFixed(2)}</div>
          <p className="text-gray-600 mt-2">Available for sale to companies</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{txn.transaction_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      +{txn.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{txn.from_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GovDashboard;