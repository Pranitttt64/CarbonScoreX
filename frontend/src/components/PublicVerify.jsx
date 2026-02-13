import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Shield, Building, Calendar, Award } from 'lucide-react';
import api from '../services/api';

export default function PublicVerify() {
  const { certificateId } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    verifyNow();
  }, [certificateId]);

  const verifyNow = async () => {
    setLoading(true);
    try {
      const response = await api.verifyCertificate(certificateId);
      setResult(response.data);
    } catch (error) {
      setResult({
        valid: false,
        message: 'Certificate verification failed',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Certificate Verification
          </h1>
          <p className="text-gray-600">
            Certificate ID: <span className="font-mono font-medium">{certificateId}</span>
          </p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {result.valid ? (
            <>
              {/* Valid Certificate */}
              <div className="flex items-center justify-center mb-6">
                <CheckCircle className="w-20 h-20 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-center text-green-600 mb-2">
                Certificate Verified
              </h2>
              <p className="text-center text-gray-600 mb-8">
                {result.message}
              </p>

              {/* Certificate Details */}
              {result.details && (
                <div className="space-y-6">
                  <div className="border-t border-b border-gray-200 py-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="flex items-start">
                        <Building className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Company</div>
                          <div className="font-medium text-gray-900">
                            {result.details.companyName}
                          </div>
                          {result.details.registrationNumber && (
                            <div className="text-sm text-gray-500">
                              Reg: {result.details.registrationNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Award className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Carbon Score</div>
                          <div className="font-medium text-gray-900 text-2xl">
                            {result.details.score}
                          </div>
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            result.details.category === 'Excellent' ? 'bg-green-100 text-green-800' :
                            result.details.category === 'Good' ? 'bg-blue-100 text-blue-800' :
                            result.details.category === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {result.details.category}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Issue Date</div>
                          <div className="font-medium text-gray-900">
                            {new Date(result.details.issueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                        <div>
                          <div className="text-sm text-gray-500">Valid Until</div>
                          <div className="font-medium text-gray-900">
                            {new Date(result.details.validUntil).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 text-green-600 mr-2" />
                      <div className="text-sm text-green-800">
                        <span className="font-medium">Authenticity Verified</span>
                        <br />
                        This certificate has been cryptographically verified and is issued by CarbonScoreX Platform.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Invalid Certificate */}
              <div className="flex items-center justify-center mb-6">
                <XCircle className="w-20 h-20 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-center text-red-600 mb-2">
                Certificate Invalid
              </h2>
              <p className="text-center text-gray-600 mb-8">
                {result.message}
              </p>

              {result.details && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-800">
                    {result.details.expiredOn && (
                      <p>Certificate expired on: {new Date(result.details.expiredOn).toLocaleDateString()}</p>
                    )}
                    {result.details.status && (
                      <p>Status: {result.details.status}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-900 mb-3">About Certificate Verification</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Certificates are cryptographically signed using HMAC-SHA256
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Each certificate has a unique ID and cannot be forged
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Certificates are automatically revoked when new scores are issued
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Valid for 1 year from issue date
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}