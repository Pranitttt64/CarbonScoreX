/**
 * Company Dashboard Component
 * Displays company carbon score, history, and data submission
 */
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import api from '../services/api';

function CompanyDashboard() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        energy_consumption: 0,
        renewable_energy_pct: 0,
        waste_recycled_pct: 0,
        emissions_co2: 0,
        water_usage: 0,
        employee_count: 0,
        production_volume: 0
    });
    const [recommendations, setRecommendations] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    // Marketplace state
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sellListings, setSellListings] = useState([]);
    const [loadingListings, setLoadingListings] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [purchasing, setPurchasing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Load recommendations when profile changes and has a company with a score
    useEffect(() => {
        if (profile?.company?.id && profile?.latestScore?.score) {
            loadRecommendations(profile.company.id);
        }
    }, [profile?.company?.id, profile?.latestScore?.score]);

    const loadData = async () => {
        try {
            const profileRes = await api.getProfile();
            setProfile(profileRes.data);

            if (profileRes.data.company?.id) {
                const [histRes, certRes] = await Promise.all([
                    api.getScoreHistory(profileRes.data.company.id),
                    api.getCompanyCertificates(profileRes.data.company.id)
                ]);
                setScoreHistory(histRes.data.history || []);
                setCertificates(certRes.data.certificates || []);
            } else {
                setScoreHistory([]);
                setCertificates([]);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadListings = async () => {
        setLoadingListings(true);
        try {
            const res = await api.getSellListings();
            setSellListings(res.data.listings || []);
        } catch (error) {
            console.error('Failed to load listings:', error);
        } finally {
            setLoadingListings(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'buy') {
            loadListings();
        }
    }, [activeTab]);

    const loadRecommendations = async (companyId) => {
        setLoadingRecommendations(true);
        try {
            const recRes = await api.getRecommendations(companyId);
            setRecommendations(recRes.data.recommendations || []);
        } catch (error) {
            console.error('Failed to load recommendations:', error);
            setRecommendations([]);
        } finally {
            setLoadingRecommendations(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!profile?.company?.id) return;

        setSubmitting(true);
        try {
            await api.submitCompanyData(profile.company.id, formData);
            await loadData();
            // Refresh recommendations after new data submission
            await loadRecommendations(profile.company.id);
            alert('Data submitted successfully! Your carbon score has been updated.');
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit data: ' + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (certId) => {
        try {
            const response = await api.downloadCertificate(certId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `certificate-${certId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download certificate');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const handlePurchase = async () => {
        if (!selectedListing || !purchaseAmount) return;

        const amount = parseFloat(purchaseAmount);
        if (isNaN(amount) || amount <= 0 || amount > parseFloat(selectedListing.amount)) {
            alert('Please enter a valid amount');
            return;
        }

        setPurchasing(true);
        try {
            await api.purchaseCredits({
                listingId: selectedListing.id,
                amount: amount
            });
            alert(`Successfully purchased ${amount} credits from ${selectedListing.seller_name}!`);
            setShowPurchaseModal(false);
            setSelectedListing(null);
            setPurchaseAmount('');
            loadListings();
            loadData(); // Refresh balance
        } catch (error) {
            console.error('Purchase error:', error);
            alert('Purchase failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setPurchasing(false);
        }
    };

    const openPurchaseModal = (listing) => {
        setSelectedListing(listing);
        setPurchaseAmount('');
        setShowPurchaseModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading dashboard...</div>
            </div>
        );
    }

    const latestScore = profile?.latestScore;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {profile?.company?.name || 'Company Dashboard'}
                        </h1>
                        <p className="text-gray-600">{profile?.company?.industry || 'Carbon Score Management'}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>
                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-4 border-t">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm ${activeTab === 'dashboard'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('buy')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'buy'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <span>🛒</span> Buy Credits
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase Modal */}
            {showPurchaseModal && selectedListing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold mb-4">Purchase Carbon Credits</h3>
                        <div className="mb-4">
                            <p className="text-gray-600">Seller: <span className="font-semibold">{selectedListing.seller_name}</span></p>
                            <p className="text-gray-600">Available: <span className="font-semibold">{parseFloat(selectedListing.amount).toFixed(2)} credits</span></p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount to Purchase
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                max={selectedListing.amount}
                                step="0.01"
                                value={purchaseAmount}
                                onChange={(e) => setPurchaseAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Enter amount"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPurchaseModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                disabled={purchasing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={purchasing || !purchaseAmount}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {purchasing ? 'Processing...' : 'Confirm Purchase'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Buy Credits Tab */}
                {activeTab === 'buy' && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Carbon Credit Marketplace</h2>
                                <p className="text-gray-600">Purchase credits from individuals</p>
                            </div>
                            <button
                                onClick={loadListings}
                                disabled={loadingListings}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                            >
                                {loadingListings ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>

                        {loadingListings ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Loading available credits...</p>
                            </div>
                        ) : sellListings.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-5xl mb-4">📭</p>
                                <p className="text-lg">No credits available for purchase at the moment.</p>
                                <p className="text-sm mt-2">Check back later for new listings from individuals.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available Credits</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listed Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sellListings.map((listing) => (
                                            <tr key={listing.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{listing.seller_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-lg font-semibold text-green-600">
                                                        {parseFloat(listing.amount).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(listing.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => openPurchaseModal(listing)}
                                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                                                    >
                                                        Buy
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Dashboard Content */}
                {activeTab === 'dashboard' && (
                    <>
                        {/* Score Card */}
                        <div className="bg-white rounded-lg shadow p-8 mb-8">
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="text-center">
                                    <h2 className="text-lg font-semibold text-gray-600 mb-2">Current Carbon Score</h2>
                                    <div className="text-6xl font-bold text-green-600">
                                        {latestScore?.score ? Number(latestScore.score).toFixed(1) : '—'}
                                    </div>
                                    <div className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${latestScore?.score_category === 'Excellent' ? 'bg-green-100 text-green-800' :
                                        latestScore?.score_category === 'Good' ? 'bg-blue-100 text-blue-800' :
                                            latestScore?.score_category === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {latestScore?.score_category || 'Not Scored'}
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h2 className="text-lg font-semibold text-gray-600 mb-2">Credit Balance</h2>
                                    <div className="text-4xl font-bold text-blue-600">
                                        {profile?.user?.creditBalance?.toFixed(2) || '0.00'}
                                    </div>
                                    <p className="text-gray-500 mt-2">Carbon Credits</p>
                                </div>

                                <div className="text-center">
                                    <h2 className="text-lg font-semibold text-gray-600 mb-2">Certificates</h2>
                                    <div className="text-4xl font-bold text-purple-600">
                                        {certificates.filter(c => c.status === 'active').length}
                                    </div>
                                    <p className="text-gray-500 mt-2">Active Certificates</p>
                                </div>
                            </div>
                        </div>

                        {/* AI Recommendations Section */}
                        {latestScore?.score && (
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg">💡</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-800">AI Recommendations</h2>
                                            <p className="text-sm text-gray-500">Personalized suggestions to improve your carbon score</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => loadRecommendations(profile.company.id)}
                                        disabled={loadingRecommendations}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
                                    >
                                        <svg
                                            className={`w-4 h-4 ${loadingRecommendations ? 'animate-spin' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {loadingRecommendations ? 'Refreshing...' : 'Get New Suggestions'}
                                    </button>
                                </div>

                                {loadingRecommendations ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                        <span className="ml-3 text-gray-600">Getting AI recommendations...</span>
                                    </div>
                                ) : recommendations.length > 0 ? (
                                    <ul className="space-y-3">
                                        {recommendations.map((rec, index) => (
                                            <li key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
                                                <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                    {index + 1}
                                                </span>
                                                <span className="text-gray-700">{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <p>No recommendations available. Submit environmental data to get personalized suggestions.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Score History Chart */}
                        {scoreHistory.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6 mb-8">
                                <h2 className="text-xl font-bold mb-4">Score History</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={scoreHistory.slice().reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="scoredAt"
                                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                                        />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip
                                            labelFormatter={(date) => new Date(date).toLocaleString()}
                                            formatter={(value) => [value.toFixed(1), 'Score']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            dot={{ fill: '#10b981' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Data Submission Form */}
                        <div className="bg-white rounded-lg shadow p-6 mb-8">
                            <h2 className="text-xl font-bold mb-4">Submit Environmental Data</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Renewable Energy Usage (%)
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.renewable_energy_pct}
                                            onChange={(e) => setFormData({ ...formData, renewable_energy_pct: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                        <div className="text-center text-gray-600">{formData.renewable_energy_pct}%</div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Waste Recycling Rate (%)
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={formData.waste_recycled_pct}
                                            onChange={(e) => setFormData({ ...formData, waste_recycled_pct: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                        <div className="text-center text-gray-600">{formData.waste_recycled_pct}%</div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Energy Consumption (kWh)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.energy_consumption}
                                            onChange={(e) => setFormData({ ...formData, energy_consumption: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            CO2 Emissions (tons)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.emissions_co2}
                                            onChange={(e) => setFormData({ ...formData, emissions_co2: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Water Usage (liters)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.water_usage}
                                            onChange={(e) => setFormData({ ...formData, water_usage: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Employee Count
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.employee_count}
                                            onChange={(e) => setFormData({ ...formData, employee_count: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Production Volume
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.production_volume}
                                            onChange={(e) => setFormData({ ...formData, production_volume: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Data & Get Score'}
                                </button>
                            </form>
                        </div>

                        {/* Certificates */}
                        {certificates.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-xl font-bold mb-4">Your Certificates</h2>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {certificates.map((cert) => (
                                        <div key={cert.certificate_id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-sm text-gray-500">Certificate ID</div>
                                                    <div className="font-mono text-sm">{cert.certificate_id}</div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${cert.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {cert.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-center mb-4">
                                                <QRCode
                                                    value={`${window.location.origin}/verify/${cert.certificate_id}`}
                                                    size={100}
                                                />
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold">{cert.score}</div>
                                                <div className={`text-sm ${cert.score_category === 'Excellent' ? 'text-green-600' :
                                                    cert.score_category === 'Good' ? 'text-blue-600' :
                                                        cert.score_category === 'Fair' ? 'text-yellow-600' :
                                                            'text-red-600'
                                                    }`}>
                                                    {cert.score_category}
                                                </div>
                                            </div>
                                            <div className="mt-4 text-xs text-gray-500 text-center">
                                                Valid until: {new Date(cert.valid_until).toLocaleDateString()}
                                            </div>
                                            <button
                                                onClick={() => handleDownload(cert.certificate_id)}
                                                className="w-full mt-4 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700"
                                            >
                                                Download PDF
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default CompanyDashboard;

