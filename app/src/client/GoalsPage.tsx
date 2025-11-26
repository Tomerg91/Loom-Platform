import { useState } from 'react';
import type { User } from 'wasp/entities';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  getGoals,
  toggleMilestone,
  useQuery,
  useAction,
} from 'wasp/client/operations';
import GoalRoadmap from './components/GoalRoadmap';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function ClientGoalsPage({ user }: { user: User }) {
  const clientId = (user as any).clientProfile?.id;

  const { data: goals = [], isLoading, error, refetch } = useQuery(getGoals, {
    clientId: clientId || '',
  });

  const createGoalFn = useAction(createGoal);
  const updateGoalFn = useAction(updateGoal);
  const deleteGoalFn = useAction(deleteGoal);
  const toggleMilestoneFn = useAction(toggleMilestone);

  if (!clientId) {
    return (
      <div className="mt-10 px-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You are not set up as a client. Please contact your coach.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 px-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load goals. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateGoal = async (data: any) => {
    try {
      await createGoalFn(data);
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
        <GoalRoadmap
          goals={goals || []}
          clientId={clientId}
          isCoach={false}
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
