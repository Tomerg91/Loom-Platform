"use client";

import React, { useState, useMemo } from "react";
import {
  Target,
  Calendar,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Progress } from "../../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// ============================================
// TYPES
// ============================================

export interface Milestone {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  type: "OKR" | "SMART" | "HABIT";
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  progress: number;
  dueDate: Date | null;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
}

interface GoalRoadmapProps {
  goals: Goal[];
  clientId: string;
  isCoach?: boolean;
  onCreateGoal?: (data: any) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  onToggleMilestone?: (
    milestoneId: string,
    completed: boolean,
  ) => Promise<void>;
  isLoading?: boolean;
}

// ============================================
// CELEBRATION COMPONENT
// ============================================

const Celebration: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-20px",
            animation: `celebration ${2 + Math.random()}s ease-in forwards`,
          }}
        >
          <span className="text-2xl">
            {["🎉", "✨", "🌟", "⭐"][Math.floor(Math.random() * 4)]}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes celebration {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// PROGRESS INDICATOR
// ============================================

const CircularProgress: React.FC<{ progress: number; size?: number }> = ({
  progress,
  size = 120,
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-gray-900">{progress}%</div>
        <div className="text-xs text-gray-500">Overall</div>
      </div>
    </div>
  );
};

// ============================================
// STATUS BADGE
// ============================================

const StatusBadge: React.FC<{ status: Goal["status"] }> = ({ status }) => {
  const styles: Record<Goal["status"], string> = {
    NOT_STARTED: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
  };

  const labels: Record<Goal["status"], string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

// ============================================
// GOAL STATUS INDICATOR
// ============================================

const getGoalStatusColor = (goal: Goal): string => {
  if (goal.status === "COMPLETED") return "border-l-4 border-l-green-500";
  if (goal.progress >= 75) return "border-l-4 border-l-green-500";
  if (goal.progress >= 40) return "border-l-4 border-l-yellow-500";
  return "border-l-4 border-l-gray-300";
};

const getGoalStatusLabel = (goal: Goal): string => {
  if (goal.status === "COMPLETED") return "Completed";
  if (goal.progress >= 75) return "On Track";
  if (goal.progress >= 40) return "At Risk";
  return "Not Started";
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function GoalRoadmap({
  goals,
  clientId,
  isCoach = false,
  onCreateGoal,
  onDeleteGoal,
  onToggleMilestone,
  isLoading = false,
}: GoalRoadmapProps) {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [celebrationGoalId, setCelebrationGoalId] = useState<string | null>(
    null,
  );
  const [newGoalData, setNewGoalData] = useState({
    title: "",
    type: "OKR" as const,
    dueDate: "",
    milestones: [{ text: "" }, { text: "" }],
  });

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0);
    return Math.round(totalProgress / goals.length);
  }, [goals]);

  // Handle milestone toggle with celebration
  const handleMilestoneToggle = async (milestone: Milestone, goal: Goal) => {
    if (!onToggleMilestone) return;

    try {
      await onToggleMilestone(milestone.id, !milestone.completed);

      // Trigger celebration if goal reaches 100%
      const completedCount = goal.milestones.filter((m) =>
        m.id === milestone.id ? !milestone.completed : m.completed,
      ).length;
      const newProgress = Math.round(
        (completedCount / goal.milestones.length) * 100,
      );

      if (newProgress === 100 && goal.progress !== 100) {
        setCelebrationGoalId(goal.id);
        setTimeout(() => setCelebrationGoalId(null), 2000);
      }
    } catch (error) {
      console.error("Failed to toggle milestone:", error);
    }
  };

  // Handle goal creation
  const handleCreateGoal = async () => {
    if (!onCreateGoal || !newGoalData.title.trim()) return;

    try {
      setIsCreatingGoal(true);
      await onCreateGoal({
        title: newGoalData.title,
        type: newGoalData.type,
        dueDate: newGoalData.dueDate || undefined,
        milestones: newGoalData.milestones.filter((m) => m.text.trim()),
        clientId,
      });

      setNewGoalData({
        title: "",
        type: "OKR",
        dueDate: "",
        milestones: [{ text: "" }, { text: "" }],
      });
    } catch (error) {
      console.error("Failed to create goal:", error);
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // Handle goal deletion
  const handleDeleteGoal = async (goalId: string) => {
    if (!onDeleteGoal || !confirm("Are you sure you want to delete this goal?"))
      return;

    try {
      await onDeleteGoal(goalId);
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const formatDueDate = (date: Date | string | null): string => {
    if (!date) return "No due date";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isToday(dateObj)) return "Due today";
    if (isTomorrow(dateObj)) return "Due tomorrow";
    if (isPast(dateObj)) return `Overdue: ${format(dateObj, "MMM d")}`;
    return format(dateObj, "MMM d, yyyy");
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading goals&hellip;</p>
      </div>
    );
  }

  const headerSubtitle = isCoach
    ? "Monitor and support your client goals with clear milestones"
    : "Co-create and track your goals with clear milestones";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Celebration show={celebrationGoalId !== null} />

      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">
          Goal & Milestone Roadmap
        </h1>
        <p className="text-gray-600">{headerSubtitle}</p>
      </div>

      {/* DASHBOARD OVERVIEW */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <TrendingUp className="w-5 h-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex justify-center">
              <CircularProgress progress={overallProgress} />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">Active Goals</div>
                <div className="text-3xl font-bold text-gray-900">
                  {goals.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Completed</div>
                <div className="text-3xl font-bold text-green-600">
                  {goals.filter((g) => g.status === "COMPLETED").length}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">In Progress</div>
                <div className="text-3xl font-bold text-blue-600">
                  {goals.filter((g) => g.status === "IN_PROGRESS").length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Not Started</div>
                <div className="text-3xl font-bold text-gray-400">
                  {goals.filter((g) => g.status === "NOT_STARTED").length}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CREATE GOAL BUTTON */}
      {onCreateGoal && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto gap-2" size="lg">
              <Plus className="w-4 h-4" />
              Create New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Goal Title */}
              <div className="space-y-2">
                <label
                  htmlFor="goal-title-input"
                  className="text-sm font-medium text-gray-700"
                >
                  Goal Title
                </label>
                <Input
                  id="goal-title-input"
                  placeholder="e.g., Complete project X by end of quarter"
                  value={newGoalData.title}
                  onChange={(e) =>
                    setNewGoalData({ ...newGoalData, title: e.target.value })
                  }
                  className="text-base"
                />
              </div>

              {/* Goal Type */}
              <div className="space-y-2">
                <label
                  htmlFor="goal-type-select"
                  className="text-sm font-medium text-gray-700"
                >
                  Goal Type
                </label>
                <Select
                  value={newGoalData.type}
                  onValueChange={(value: any) =>
                    setNewGoalData({ ...newGoalData, type: value })
                  }
                >
                  <SelectTrigger id="goal-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OKR">
                      OKR (Objectives & Key Results)
                    </SelectItem>
                    <SelectItem value="SMART">SMART Goal</SelectItem>
                    <SelectItem value="HABIT">Habit Building</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label
                  htmlFor="goal-due-date"
                  className="text-sm font-medium text-gray-700"
                >
                  Due Date
                </label>
                <Input
                  type="date"
                  id="goal-due-date"
                  value={newGoalData.dueDate}
                  onChange={(e) =>
                    setNewGoalData({ ...newGoalData, dueDate: e.target.value })
                  }
                />
              </div>

              {/* Milestones */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  Milestones (optional)
                </p>
                {newGoalData.milestones.map((milestone, index) => (
                  <Input
                    key={index}
                    placeholder={`Milestone ${index + 1}`}
                    value={milestone.text}
                    onChange={(e) => {
                      const updated = [...newGoalData.milestones];
                      updated[index].text = e.target.value;
                      setNewGoalData({ ...newGoalData, milestones: updated });
                    }}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setNewGoalData({
                      ...newGoalData,
                      milestones: [...newGoalData.milestones, { text: "" }],
                    })
                  }
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Milestone
                </Button>
              </div>

              <Button
                onClick={handleCreateGoal}
                disabled={isCreatingGoal || !newGoalData.title.trim()}
                className="w-full"
              >
                {isCreatingGoal ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* GOALS ROADMAP */}
      {goals.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No goals yet. Create one to get started!
            </p>
            {onCreateGoal && (
              <Button variant="outline">Create Your First Goal</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              className={`transition-all duration-200 hover:shadow-md ${getGoalStatusColor(
                goal,
              )}`}
            >
              <CardHeader
                className="cursor-pointer"
                onClick={() =>
                  setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {goal.title}
                        </h3>
                      </div>
                      {expandedGoalId === goal.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <StatusBadge status={goal.status} />
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          goal.progress >= 75
                            ? "bg-green-100 text-green-700"
                            : goal.progress >= 40
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getGoalStatusLabel(goal)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDueDate(goal.dueDate)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                          Progress
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {goal.progress}%
                        </span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* EXPANDED CONTENT */}
              {expandedGoalId === goal.id && (
                <CardContent className="pt-0 space-y-4 border-t">
                  {/* Goal Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                    <div>
                      <div className="text-xs text-gray-600">Type</div>
                      <div className="font-medium text-gray-900">
                        {goal.type}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Status</div>
                      <div className="font-medium text-gray-900">
                        {goal.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Created</div>
                      <div className="font-medium text-gray-900">
                        {format(new Date(goal.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Milestones ({goal.milestones.length})
                    </h4>
                    {goal.milestones.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No milestones added yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {goal.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            {onToggleMilestone ? (
                              <Checkbox
                                checked={milestone.completed}
                                onCheckedChange={() =>
                                  handleMilestoneToggle(milestone, goal)
                                }
                                className="cursor-pointer"
                              />
                            ) : milestone.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            )}
                            <span
                              className={`flex-1 text-sm ${
                                milestone.completed
                                  ? "text-gray-500 line-through"
                                  : "text-gray-700"
                              }`}
                            >
                              {milestone.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  {onDeleteGoal && (
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Goal
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
