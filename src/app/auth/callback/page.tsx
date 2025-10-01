'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Disable static generation for this page since it uses search params
export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get OAuth parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔐 OAuth callback received:', { code: code?.substring(0, 10) + '...', state, error });

        // Handle OAuth error
        if (error) {
          console.error('❌ OAuth error:', error);
          setError(`OAuth error: ${error}`);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('❌ Missing authorization code');
          setError('Missing authorization code from OAuth provider');
          return;
        }

        setStatus('Exchanging authorization code...');

        // Forward the OAuth callback to backend
        const backendCallbackUrl = `${process.env.NEXT_PUBLIC_API_BASE}/api/auth/google/callback`;
        const callbackUrl = `${backendCallbackUrl}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`;

        console.log('🔄 Forwarding to backend:', backendCallbackUrl);

        // Forward to backend - this will handle the OAuth exchange and create session
        const response = await fetch(callbackUrl, {
          method: 'GET',
          credentials: 'include', // Important: include cookies for session
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log('📡 Backend response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Authentication successful:', result);
          
          setStatus('Authentication successful! Redirecting...');
          
          // Redirect to main page after successful auth
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Backend authentication failed:', errorData);
          setError(`Authentication failed: ${errorData.error || 'Unknown error'}`);
        }

      } catch (err) {
        console.error('❌ OAuth callback error:', err);
        setError(`Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Authentication Failed
          </h1>
          <p className="text-gray-600 text-center mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          PT Benwin Indonesia
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {status}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          PT Benwin Indonesia
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Loading authentication...
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '30%' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}