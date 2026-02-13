/**
 * Individual/Person Dashboard Component
 * Displays carbon credit balance and transaction history
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

function PersonDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sell listing state
  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [sellAmount, setSellAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(null);

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
      loadMyListings();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyListings = async () => {
    setLoadingListings(true);
    try {
      const res = await api.getMyListings();
      setMyListings(res.data.listings || []);
    } catch (error) {
      console.error('Failed to load listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Calculate available balance (total - already listed)
    const listedAmount = myListings
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);
    const availableBalance = balance - listedAmount;

    if (amount > availableBalance) {
      alert(`You can only list up to ${availableBalance.toFixed(2)} credits (${balance.toFixed(2)} total - ${listedAmount.toFixed(2)} already listed)`);
      return;
    }

    setCreating(true);
    try {
      await api.createSellListing({ amount });
      alert(`Successfully listed ${amount} credits for sale!`);
      setSellAmount('');
      loadMyListings();
    } catch (error) {
      console.error('Create listing error:', error);
      alert('Failed to create listing: ' + (error.response?.data?.error || error.message));
    } finally {
      setCreating(false);
    }
  };

  const handleCancelListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to cancel this listing?')) return;

    setCancelling(listingId);
    try {
      await api.cancelSellListing(listingId);
      alert('Listing cancelled successfully');
      loadMyListings();
    } catch (error) {
      console.error('Cancel listing error:', error);
      alert('Failed to cancel listing: ' + (error.response?.data?.error || error.message));
    } finally {
      setCancelling(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Calculate available balance
  const listedAmount = myListings
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);
  const availableBalance = balance - listedAmount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Individual Dashboard</h1>
            <p className="text-gray-600">Manage your carbon credits</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Credit Balance</h2>
              <div className="text-5xl font-bold text-green-600">{balance.toFixed(2)}</div>
              <p className="text-gray-600 mt-2">Total carbon credits</p>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Available to Sell</h2>
              <div className="text-5xl font-bold text-blue-600">{availableBalance.toFixed(2)}</div>
              <p className="text-gray-600 mt-2">
                {listedAmount > 0 ? `${listedAmount.toFixed(2)} credits currently listed` : 'No credits currently listed'}
              </p>
            </div>
          </div>
        </div>

        {/* Sell Credits Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>💰</span> Sell Your Credits
          </h2>
          <p className="text-gray-600 mb-4">
            List your carbon credits for sale. Companies can browse and purchase your listed credits.
          </p>

          <form onSubmit={handleCreateListing} className="flex gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to List for Sale
              </label>
              <input
                type="number"
                min="0.01"
                max={availableBalance}
                step="0.01"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={`Max: ${availableBalance.toFixed(2)}`}
                disabled={availableBalance <= 0}
              />
            </div>
            <button
              type="submit"
              disabled={creating || !sellAmount || availableBalance <= 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'List for Sale'}
            </button>
          </form>

          {/* My Active Listings */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Your Active Listings</h3>
              <button
                onClick={loadMyListings}
                disabled={loadingListings}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {loadingListings ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loadingListings ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : myListings.filter(l => l.status === 'active').length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active listings</p>
            ) : (
              <div className="space-y-3">
                {myListings
                  .filter(l => l.status === 'active')
                  .map((listing) => (
                    <div key={listing.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-lg font-semibold text-green-600">
                          {parseFloat(listing.amount).toFixed(2)} credits
                        </span>
                        <span className="text-gray-500 ml-3 text-sm">
                          Listed on {new Date(listing.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        disabled={cancelling === listing.id}
                        className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancelling === listing.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{txn.transaction_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        +{txn.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{txn.from_name || txn.to_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PersonDashboard;