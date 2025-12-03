import { useState } from "react";
import { useQuery, useAction } from "wasp/client/operations";
import type { User } from "wasp/entities";
import { getGroupFeed, createGroupPost } from "wasp/client/operations";
import { Button } from "@src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@src/components/ui/card";
import { Textarea } from "@src/components/ui/textarea";
import { useToast } from "@src/hooks/use-toast";
import { GroupFeed } from "./GroupFeed";

interface MentoringCirclesPageProps {
  user: User;
}

export default function MentoringCirclesPage({
  user,
}: MentoringCirclesPageProps) {
  const initialGroupId =
    (user as any)?.coachProfile?.mentorGroups?.[0]?.id ??
    (user as any)?.coachProfile?.groupMemberships?.[0]?.groupId ??
    null;

  const [selectedGroupId] = useState<string | null>(initialGroupId);
  const [newPostContent, setNewPostContent] = useState("");
  const { toast } = useToast();

  // Fetch group feed
  const {
    data: feed,
    isLoading,
    refetch,
  } = useQuery(
    getGroupFeed,
    selectedGroupId ? { groupId: selectedGroupId, limit: 20, offset: 0 } : null,
  );

  // Actions
  const createPost = useAction(createGroupPost);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !newPostContent.trim()) return;

    try {
      await createPost({
        groupId: selectedGroupId,
        content: newPostContent,
        postType: "STANDARD",
      });
      setNewPostContent("");
      refetch();
      toast({ title: "Post created successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mentoring Circles</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Connect with fellow coaches, share insights, and support each other
          through peer mentoring groups.
        </p>
      </div>

      {!selectedGroupId ? (
        <Card>
          <CardHeader>
            <CardTitle>Select or Create a Group</CardTitle>
            <CardDescription>
              Choose a mentoring circle to view the feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Group selection UI would go here. Mentors can create new groups
              from the dashboard.
            </p>
            <Button disabled>Create New Group</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Post Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Share with the Group</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <Textarea
                  placeholder="Share your insights, wins, or reflections with the group..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-24"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewPostContent("")}
                  >
                    Clear
                  </Button>
                  <Button type="submit" disabled={!newPostContent.trim()}>
                    Post to Group
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Group Feed */}
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-600">
                  Loading posts...
                </div>
              </CardContent>
            </Card>
          ) : feed ? (
            <GroupFeed posts={feed} onPostReplied={refetch} />
          ) : null}
        </div>
      )}
    </div>
  );
}
