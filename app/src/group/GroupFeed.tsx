import { useState } from "react";
import { useAction } from "wasp/client/operations";
import { createGroupPostReply } from "wasp/client/operations";
import { Button } from "@src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@src/components/ui/card";
import { Textarea } from "@src/components/ui/textarea";
import { useToast } from "@src/hooks/use-toast";
import { cn } from "@src/lib/utils";

interface GroupPost {
  id: string;
  content: string;
  createdAt: Date;
  postType: string;
  isPinned: boolean;
  author: { id: string; user: { email: string } };
  replies: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: { id: string; user: { email: string } };
  }>;
}

interface GroupFeedProps {
  posts: GroupPost[];
  onPostReplied: () => void;
}

export function GroupFeed({ posts, onPostReplied }: GroupFeedProps) {
  const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const createReply = useAction(createGroupPostReply);
  const { toast } = useToast();

  const handleCreateReply = async (postId: string) => {
    if (!replyContent.trim()) return;

    try {
      await createReply({
        postId,
        content: replyContent,
      });
      setReplyContent("");
      setReplyingToPostId(null);
      onPostReplied();
      toast({ title: "Reply posted successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600 dark:text-gray-400">
            No posts yet. Be the first to share with the group!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card
          key={post.id}
          className={cn(
            post.isPinned &&
              "border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {post.author.user.email}
                  </CardTitle>
                  {post.isPinned && (
                    <span className="text-xs bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">
                      📌 Pinned
                    </span>
                  )}
                  {post.postType === "WIN" && (
                    <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-1 rounded">
                      🎉 Win
                    </span>
                  )}
                  {post.postType === "BLIND_REFLECTION" && (
                    <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
                      🔒 Blind
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(post.createdAt).toLocaleDateString()} at{" "}
                  {new Date(post.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Post Content */}
            <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {post.content}
            </p>

            {/* Blind Reflection Warning */}
            {post.postType === "BLIND_REFLECTION" && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>🔒 Blind Reflection Mode:</strong> Your replies are
                  hidden from other group members until you choose to share
                  them.
                </p>
              </div>
            )}

            {/* Replies Section */}
            {post.replies.length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {post.replies.length}{" "}
                  {post.replies.length === 1 ? "reply" : "replies"}
                </p>
                {post.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 ml-4 border-l-4 border-gray-300 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {reply.author.user.email}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            {replyingToPostId === post.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateReply(post.id);
                }}
                className="mt-4 space-y-3 border-t pt-4"
              >
                <Textarea
                  placeholder="Write your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-20"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setReplyingToPostId(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!replyContent.trim()}
                  >
                    Post Reply
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyingToPostId(post.id)}
                className="mt-2 w-full sm:w-auto"
              >
                Reply to Post
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
