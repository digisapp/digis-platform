'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Send, Trash2,
  Lock, Users, Globe,
} from 'lucide-react';

interface Post {
  id: string;
  text: string | null;
  imageUrl: string | null;
  imageAspectRatio: string | null;
  visibility: 'public' | 'followers' | 'subscribers';
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  creatorAvatarUrl: string | null;
  creatorIsVerified: boolean;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface CommunityFeedProps {
  creatorId: string;
  creatorUsername: string;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}

const VISIBILITY_ICONS = {
  public: Globe,
  followers: Users,
  subscribers: Lock,
};

const VISIBILITY_LABELS = {
  public: 'Everyone',
  followers: 'Followers',
  subscribers: 'Subscribers',
};

export function CommunityFeed({ creatorId, creatorUsername: _creatorUsername, isOwnProfile, isAuthenticated }: CommunityFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeImageUrl, setComposeImageUrl] = useState('');
  const [composeVisibility, setComposeVisibility] = useState<'public' | 'followers' | 'subscribers'>('public');
  const [posting, setPosting] = useState(false);

  // Comments
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/community/posts?creatorId=${creatorId}&limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cursor) {
        setPosts(prev => [...prev, ...data.items]);
      } else {
        setPosts(data.items);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePost = async () => {
    if (!composeText.trim() && !composeImageUrl.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: composeText.trim() || null,
          imageUrl: composeImageUrl.trim() || null,
          visibility: composeVisibility,
        }),
      });
      if (res.ok) {
        setComposeText('');
        setComposeImageUrl('');
        setShowCompose(false);
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) return;
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        isLiked: !p.isLiked,
        likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
      };
    }));

    try {
      await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' });
    } catch {
      // Revert on error
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          isLiked: !p.isLiked,
          likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
        };
      }));
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      const res = await fetch(`/api/community/posts?id=${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const loadComments = async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
      return;
    }
    setExpandedComments(postId);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({ ...prev, [postId]: data.comments }));
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim() || !isAuthenticated) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({
          ...prev,
          [postId]: [data.comment, ...(prev[postId] || [])],
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
        setCommentText('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Community</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (posts.length === 0 && !isOwnProfile) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Community</h3>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            New Post
          </button>
        )}
      </div>

      {/* Compose */}
      {showCompose && isOwnProfile && (
        <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10">
          <textarea
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            placeholder="Share an update with your community..."
            className="w-full bg-transparent text-white text-sm placeholder-gray-500 resize-none outline-none min-h-[80px]"
            maxLength={2000}
          />
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <input
              type="text"
              value={composeImageUrl}
              onChange={e => setComposeImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 outline-none border border-white/10 focus:border-cyan-500/50"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {(['public', 'followers', 'subscribers'] as const).map(v => {
                const Icon = VISIBILITY_ICONS[v];
                return (
                  <button
                    key={v}
                    onClick={() => setComposeVisibility(v)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                      composeVisibility === v
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {VISIBILITY_LABELS[v]}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handlePost}
              disabled={posting || (!composeText.trim() && !composeImageUrl.trim())}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Post Header */}
            <div className="flex items-center gap-3 p-4 pb-2">
              <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                {post.creatorAvatarUrl ? (
                  <img src={post.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                    {(post.creatorDisplayName || post.creatorUsername || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {post.creatorDisplayName || post.creatorUsername}
                  {post.creatorIsVerified && <span className="ml-1 text-cyan-400 text-xs">✓</span>}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  {post.visibility !== 'public' && (
                    <>
                      <span>·</span>
                      {(() => {
                        const VIcon = VISIBILITY_ICONS[post.visibility];
                        return <VIcon className="w-3 h-3" />;
                      })()}
                    </>
                  )}
                  {post.isPinned && (
                    <>
                      <span>·</span>
                      <span className="text-cyan-400">Pinned</span>
                    </>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Post Content */}
            {post.text && (
              <p className="px-4 pb-2 text-sm text-gray-200 whitespace-pre-wrap">{post.text}</p>
            )}
            {post.imageUrl && (
              <div className="mx-4 mb-2 rounded-xl overflow-hidden">
                <img src={post.imageUrl} alt="" className="w-full object-cover max-h-[400px]" />
              </div>
            )}

            {/* Engagement Bar */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/5">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                {post.likeCount > 0 && <span>{post.likeCount}</span>}
              </button>
              <button
                onClick={() => loadComments(post.id)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {post.commentCount > 0 && <span>{post.commentCount}</span>}
              </button>
            </div>

            {/* Comments Section */}
            {expandedComments === post.id && (
              <div className="border-t border-white/5 px-4 py-3">
                {/* Comment Input */}
                {isAuthenticated && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none border border-white/10 focus:border-cyan-500/50"
                      maxLength={500}
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={commentLoading || !commentText.trim()}
                      className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-2.5">
                  {(comments[post.id] || []).map(comment => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0 mt-0.5">
                        {comment.avatarUrl ? (
                          <img src={comment.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px] font-bold">
                            {(comment.displayName || comment.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white">{comment.displayName || comment.username}</span>
                          <span className="text-[10px] text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {(comments[post.id] || []).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No comments yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {nextCursor && (
        <button
          onClick={() => { setLoadingMore(true); fetchPosts(nextCursor); }}
          disabled={loadingMore}
          className="w-full mt-4 py-2.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
        >
          {loadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}

      {posts.length === 0 && isOwnProfile && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No posts yet. Share an update with your community!</p>
        </div>
      )}
    </div>
  );
}
