"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  commentsApi,
  TranscriptComment,
  User as UserType,
} from "@/services/api";
import { toast } from "sonner";

interface TranscriptCommentsProps {
  caseId: number;
  caseNumber: string;
  currentUser: UserType;
}

const COMMENT_TYPES = [
  { value: "general", label: "General", color: "bg-blue-100 text-blue-800" },
  { value: "error", label: "Error", color: "bg-red-100 text-red-800" },
  { value: "note", label: "Note", color: "bg-yellow-100 text-yellow-800" },
  {
    value: "question",
    label: "Question",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    color: "bg-green-100 text-green-800",
  },
];

export function TranscriptComments({
  caseId,
  caseNumber,
  currentUser,
}: TranscriptCommentsProps) {
  const [comments, setComments] = useState<TranscriptComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComment, setEditingComment] =
    useState<TranscriptComment | null>(null);
  const [commentType, setCommentType] = useState<string>("general");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [caseId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      console.log("Loading comments for case:", caseId);
      const items = await commentsApi.getComments(caseId);
      setComments(items);
    } catch (error) {
      console.error("Failed to load comments:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load comments: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    console.log("Adding comment for case:", caseId, "user:", currentUser);
    console.log("Current user details:", {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
    });
    console.log("Comment type:", commentType, "text:", commentText.trim());

    setIsSubmitting(true);
    try {
      const commenterId = currentUser?.id;
      if (!commenterId) {
        throw new Error("Missing current user id");
      }
      await commentsApi.addComment(
        caseId,
        commenterId,
        commentType,
        commentText.trim()
      );
      toast.success("Comment added successfully");
      setIsAddDialogOpen(false);
      setCommentText("");
      setCommentType("general");
      loadComments();
    } catch (error) {
      console.error("Failed to add comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to add comment: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async () => {
    if (!editingComment || !commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    console.log("Updating comment ID:", editingComment.id);
    console.log("New comment type:", commentType, "text:", commentText.trim());

    setIsSubmitting(true);
    try {
      await commentsApi.updateComment(
        editingComment.id,
        commentType,
        commentText.trim()
      );
      toast.success("Comment updated successfully");
      setIsEditDialogOpen(false);
      setEditingComment(null);
      setCommentText("");
      setCommentType("general");
      loadComments();
    } catch (error) {
      console.error("Failed to update comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update comment: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    console.log("Deleting comment with ID:", commentId);
    try {
      await commentsApi.deleteComment(commentId);
      toast.success("Comment deleted successfully");
      loadComments();
    } catch (error) {
      console.error("Failed to delete comment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete comment: ${errorMessage}`);
    }
  };

  const openEditDialog = (comment: TranscriptComment) => {
    setEditingComment(comment);
    setCommentType(comment.comment_type);
    setCommentText(comment.comment_text);
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditingComment(null);
    setCommentText("");
    setCommentType("general");
    setIsEditDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCommentTypeInfo = (type: string) => {
    return COMMENT_TYPES.find((t) => t.value === type) || COMMENT_TYPES[0];
  };

  const canEditComment = (comment: TranscriptComment) => {
    return (
      comment.commenter_id === currentUser.id ||
      currentUser.role === "admin" ||
      currentUser.role === "super_admin"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
          <Badge variant="outline" className="ml-2">
            {comments.length} comments
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading comments...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add Comment Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Comment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comment to Case {caseNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="comment-type">Comment Type</Label>
                    <Select value={commentType} onValueChange={setCommentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select comment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={type.color}>{type.label}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="comment-text">Comment</Label>
                    <Textarea
                      id="comment-text"
                      placeholder="Enter your comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddComment}
                      disabled={isSubmitting || !commentText.trim()}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Comment"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Comment Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={closeEditDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Comment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-comment-type">Comment Type</Label>
                    <Select value={commentType} onValueChange={setCommentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select comment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={type.color}>{type.label}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-comment-text">Comment</Label>
                    <Textarea
                      id="edit-comment-text"
                      placeholder="Enter your comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeEditDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditComment}
                      disabled={isSubmitting || !commentText.trim()}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Comment"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No comments yet</p>
                <p className="text-sm">Click "Add Comment" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const typeInfo = getCommentTypeInfo(comment.comment_type);
                  const canEdit = canEditComment(comment);

                  return (
                    <div
                      key={comment.id}
                      className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {comment.commenter_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(comment.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(comment)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}>
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Comment
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this
                                        comment? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleDeleteComment(comment.id)
                                        }
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      <div className="pl-10">
                        <p className="text-sm whitespace-pre-wrap">
                          {comment.comment_text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
