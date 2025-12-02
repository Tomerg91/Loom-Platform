import { useParams } from 'react-router-dom';
import type { User } from 'wasp/entities';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  getGoals,
  toggleMilestone,
  getClientsForCoach,
  useQuery,
  useAction,
} from 'wasp/client/operations';
import GoalRoadmap from '../client/components/GoalRoadmap';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function CoachClientGoalsPage({ user }: { user: User }) {
  const params = useParams();
  const clientId = params.clientId as string;

  // Get all clients to verify this coach owns the client
  const { data: allClients = [] } = useQuery(getClientsForCoach);
  const clientExists = allClients.some((c: any) => c.id === clientId);

  const { data: goals = [], isLoading, error, refetch } = useQuery(getGoals, {
    clientId: clientId || '',
  });

  const createGoalFn = useAction(createGoal);
  const updateGoalFn = useAction(updateGoal);
  const deleteGoalFn = useAction(deleteGoal);
  const toggleMilestoneFn = useAction(toggleMilestone);

  if (!clientExists && allClients.length > 0) {
    return (
      <div className="mt-10 px-6">
        <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Client not found or you don&apos;t have access to this client.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <Button variant="ghost" className="mb-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load goals. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const client = allClients.find((c: any) => c.id === clientId);

  const handleCreateGoal = async (data: any) => {
    try {
      await createGoalFn({ ...data, clientId });
      await refetch();
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw error;
    }
  };

  const handleUpdateGoal = async (data: any) => {
    try {
      await updateGoalFn(data);
      await refetch();
    } catch (error) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoalFn({ goalId });
      await refetch();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      throw error;
    }
  };

  const handleToggleMilestone = async (milestoneId: string, completed: boolean) => {
    try {
      await toggleMilestoneFn({ milestoneId, completed });
      await refetch();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mt-10 px-6">
        <Button variant="ghost" className="mb-6" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Client
        </Button>

        {(user.username || (user as any).email) && (
          <p className="text-xs text-muted-foreground mb-4">
            Coach: {user.username || (user as any).email}
          </p>
        )}

        {client && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Goals for {(client as any).user?.username || (client as any).user?.email || 'Client'}
            </h2>
            <p className="text-gray-600">Co-create and track goals with your client</p>
          </div>
        )}

        <GoalRoadmap
          goals={goals || []}
          clientId={clientId}
          isCoach={true}
          isLoading={isLoading}
          onCreateGoal={handleCreateGoal}
          onUpdateGoal={handleUpdateGoal}
          onDeleteGoal={handleDeleteGoal}
          onToggleMilestone={handleToggleMilestone}
        />
      </div>
    </div>
  );
}
