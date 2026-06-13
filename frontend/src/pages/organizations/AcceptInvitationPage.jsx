/**
 * Accept Invitation Page
 *
 * Handles accepting organization invitations.
 */

import Loader from '../../components/common/Loader.jsx';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import organizationApi from '../../services/api/organization.api.js';
import Button from '../../components/common/Button.jsx';
import { showToast } from '../../utils/toasts.js';

function AcceptInvitationPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState(null);

  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setError('Invalid invitation link. Please check your email for the correct link.');
      return;
    }

    acceptInvitation();
  }, [token, email]);

  const acceptInvitation = async () => {
    try {
      setStatus('loading');
      const result = await organizationApi.acceptInvitation(token, email);
      setOrganization(result.organization);
      setStatus('success');
      showToast.invitationAccepted();
    } catch (err) {
      setStatus('error');
      const errorMessage = err.response?.data?.message || 'Failed to accept invitation';
      setError(errorMessage);
      showToast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Organization Invitation
          </h2>
        </div>

        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Accepting invitation...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Welcome to {organization?.name}!
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                You have successfully joined the organization.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Invitation Failed
              </h3>
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-500">
                  Make sure you're logged in with the email that received the invitation.
                </p>
                <Link to="/login" className="block">
                  <Button variant="secondary" className="w-full">
                    Go to Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvitationPage;