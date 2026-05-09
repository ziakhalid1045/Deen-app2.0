export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username?: string;
  bio?: string;
  photoURL?: string;
  coverURL?: string;
  country?: string;
  createdAt: any;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isPremium?: boolean;
  isVerified?: boolean;
  verificationType?: 'lifetime' | 'subscription' | 'none';
  isPrivate?: boolean;
  paymentStatus?: 'none' | 'paid' | 'expired';
  kycStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  subscriptionExpiry?: any;
  kycDocuments?: {
    idCardUrl: string;
    selfieUrl: string;
  };
  kycRejectionReason?: string;
  isManuallyVerified?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorIsVerified?: boolean;
  authorIsPremium?: boolean;
  authorCountry?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  isShort?: boolean;
  videoDuration?: number | null;
  privacy?: 'public' | 'private';
  createdAt: any;
  recentLikers?: { uid: string; photoURL: string }[];
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: any;
  chatId: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request';
  fromId: string;
  fromName: string;
  fromPhoto?: string;
  targetId: string;
  postId?: string;
  read: boolean;
  createdAt: any;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  mediaUrl: string;
  createdAt: any;
  expiresAt: any;
}
