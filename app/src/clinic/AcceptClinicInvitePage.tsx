import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { acceptClinicInvitation } from "wasp/client/operations";

const AcceptClinicInvitePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<
    "IDLE" | "PROCESSING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [location]);

  const handleAccept = async () => {
    if (!token) {
      setErrorMessage("No invitation token found.");
      return;
    }

    setStatus("PROCESSING");
    try {
      await acceptClinicInvitation({ token });
      setStatus("SUCCESS");
      // Redirect after a short delay
      setTimeout(() => {
        navigate("/coach");
      }, 2000);
    } catch (err: any) {
      setStatus("ERROR");
      setErrorMessage(err.message || "Failed to accept invitation.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Join a Clinic
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You have been invited to join a clinic on Loom.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === "IDLE" && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-gray-700"
                >
                  Invitation Token
                </label>
                <div className="mt-1">
                  <input
                    id="token"
                    name="token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Enter token if not auto-filled"
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={handleAccept}
                  disabled={!token}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Accept Invitation
                </button>
              </div>
            </div>
          )}

          {status === "PROCESSING" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Processing your invitation...</p>
            </div>
          )}

          {status === "SUCCESS" && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Welcome to the Clinic!
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                You have successfully joined. Redirecting you to your
                dashboard...
              </p>
            </div>
          )}

          {status === "ERROR" && (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Invitation Failed
              </h3>
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
              <button
                onClick={() => setStatus("IDLE")}
                className="mt-4 text-primary-600 hover:text-primary-500 font-medium"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptClinicInvitePage;
