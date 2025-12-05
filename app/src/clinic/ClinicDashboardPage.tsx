import React, { useState } from "react";
import {
  useQuery,
  getClinicDetails,
  inviteCoachToClinic,
  removeCoachFromClinic,
  cancelClinicInvitation,
} from "wasp/client/operations";
import { Link } from "wasp/client/router";

const ClinicDashboardPage = () => {
  const {
    data: clinic,
    isLoading,
    error,
    refetch,
  } = useQuery(getClinicDetails);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      await inviteCoachToClinic({ email: inviteEmail });
      setInviteEmail("");
      refetch();
      alert("Invitation sent!");
    } catch (err: any) {
      alert("Error sending invitation: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (coachId: string) => {
    if (
      !confirm("Are you sure you want to remove this coach from your clinic?")
    )
      return;
    try {
      await removeCoachFromClinic({ coachId });
      refetch();
    } catch (err: any) {
      alert("Error removing member: " + err.message);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await cancelClinicInvitation({ invitationId });
      refetch();
    } catch (err: any) {
      alert("Error cancelling invitation: " + err.message);
    }
  };

  if (isLoading)
    return <div className="p-10 text-center">Loading clinic details...</div>;
  if (error)
    return (
      <div className="p-10 text-center text-red-500">
        Error: {error.message}
      </div>
    );

  if (!clinic) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">No Clinic Found</h1>
          <p className="text-gray-600 mb-6">
            You do not appear to be the owner of a clinic.
          </p>
          <Link
            to="/pricing"
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Upgrade to Clinic Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">{clinic.name}</h1>
        <p className="text-gray-500 mt-1">
          Manage your clinic members and invitations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Members Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Team Members
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {clinic.members.length} Active
              </span>
            </div>

            {clinic.members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No members yet. Invite your first coach!
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {clinic.members.map((member: any) => (
                  <li
                    key={member.id}
                    className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {member.user.username?.[0]?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.user.username || "Unknown Coach"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    {member.userId !== clinic.ownerId && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    {member.userId === clinic.ownerId && (
                      <span className="text-gray-400 text-sm italic px-3">
                        Owner
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sidebar: Invite & Pending */}
        <div className="space-y-6">
          {/* Invite Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Invite Coach
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isInviting}
                className="w-full bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isInviting ? "Sending..." : "Send Invitation"}
              </button>
            </form>
          </div>

          {/* Pending Invitations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                Pending Invites
              </h2>
            </div>

            {clinic.invitations.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                No pending invitations
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {clinic.invitations.map((invite: any) => (
                  <li key={invite.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className="font-medium text-gray-800 truncate block max-w-[180px]"
                        title={invite.email}
                      >
                        {invite.email}
                      </span>
                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200 break-all font-mono">
                      Token: {invite.token}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Share this token or link with the coach.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicDashboardPage;
