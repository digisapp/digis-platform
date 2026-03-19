export const en = {
  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    next: 'Next',
    back: 'Back',
    close: 'Close',
    share: 'Share',
    follow: 'Follow',
    following: 'Following',
    unfollow: 'Unfollow',
    explore: 'Explore',
    search: 'Search',
    coins: 'coins',
    viewProfile: 'View Profile',
    seeAll: 'See All',
    tryAgain: 'Try Again',
    noResults: 'No results found',
    or: 'or',
  },

  // Navigation
  nav: {
    home: 'Home',
    explore: 'Explore',
    streams: 'Streams',
    messages: 'Messages',
    wallet: 'Wallet',
    settings: 'Settings',
    forYou: 'For You',
    clips: 'Clips',
  },

  // Auth
  auth: {
    signUp: 'Sign Up',
    signIn: 'Sign In',
    logOut: 'Log Out',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    imAFan: "I'm a Fan",
    imACreator: "I'm a Creator",
    fanDescription: 'Watch live streams, book video calls & access exclusive content',
    creatorDescription: 'Go live, offer paid calls & earn from your content',
    checkEmail: 'Check your email to verify your account',
  },

  // Onboarding
  onboarding: {
    welcomeTitle: 'Welcome to Digis!',
    welcomeDesc: 'Follow creators to see their streams, content, and updates in your feed.',
    coinsTitle: 'Coins Power Everything',
    coinsDesc: 'Use coins to support creators and unlock exclusive experiences.',
    sendTips: 'Send tips',
    sendTipsDesc: 'Support creators during streams and in DMs',
    unlockContent: 'Unlock exclusive content',
    unlockContentDesc: 'Access premium photos and videos',
    bookCalls: 'Book video calls',
    bookCallsDesc: '1-on-1 video and voice calls with creators',
    claimFreeCoins: 'Claim 10 Free Coins',
    claiming: 'Claiming...',
    coinsClaimed: '10 Coins Claimed!',
    allSetTitle: "You're All Set!",
    allSetFollowing: "You're following {count} creator{s}. Their content will appear in your feed.",
    allSetExplore: 'Explore creators, watch live streams, and discover exclusive content.',
    findCreators: 'Find creators',
    browseContent: 'Browse content',
    startExploring: 'Start Exploring',
  },

  // Dashboard
  dashboard: {
    liveNow: 'Live Now',
    discoverCreators: 'Discover Creators',
    searchCreators: 'Search creators...',
    noCreators: 'No creators found',
    checkBackLater: 'Check back later for new creators',
    all: 'All',
    live: 'Live',
    online: 'Online',
    new: 'New',
  },

  // For You Feed
  feed: {
    forYou: 'For You',
    clips: 'Clips',
    nothingYet: 'Nothing here yet',
    contentWillAppear: 'Content will show up as creators start posting',
    exploreCreators: 'Explore Creators',
    videoFailed: 'Video failed to load',
    exclusiveContent: 'Exclusive Content',
    loadingFeed: 'Loading your feed...',
  },

  // Chat / Messages
  chat: {
    yourMessages: 'Your Messages',
    messagesDesc: 'Message creators directly, send tips, and request video calls.',
    selectConversation: 'Select a conversation or find a creator to start chatting.',
    noChatsYet: 'No chats yet',
    noUnreadChats: 'No unread chats',
    allCaughtUp: "You're all caught up!",
    startConversation: 'Message creators to chat, send tips, or request calls',
    findCreators: 'Find Creators',
    typeMessage: 'Type a message...',
  },

  // Wallet
  wallet: {
    balance: 'Balance',
    buyCoins: 'Buy Coins',
    transactions: 'Transactions',
    noTransactions: 'No transactions yet',
    welcomeBonus: 'Welcome bonus — free coins for new fans',
  },

  // Streams
  streams: {
    noLiveStreams: 'No Live Streams Right Now',
    checkSchedule: 'Check out the schedule or watch some replays!',
    viewSchedule: 'View Schedule',
    watchReplays: 'Watch Replays',
    noScheduled: 'No Scheduled Shows',
    noReplays: 'No Replays Yet',
  },

  // Profile
  profile: {
    sendTip: 'Send Tip',
    message: 'Message',
    subscribe: 'Subscribe',
    subscribed: 'Subscribed',
    callRates: 'Call Rates',
    perMinute: '/min',
  },

  // Settings
  settings: {
    profile: 'Profile',
    social: 'Social',
    language: 'Language',
    languageDesc: 'Choose your preferred language',
    deleteAccount: 'Delete Account',
    becomeCreator: 'Become a Creator',
  },

  // Milestones
  milestones: {
    firstFollow: 'You followed your first creator! Their content will appear in your feed.',
    firstLike: 'First like! Creators love knowing fans enjoy their content.',
    firstTip: "First tip sent! You just made a creator's day.",
    firstMessage: 'First message sent! Creators typically reply within a few hours.',
    firstPurchase: 'Content unlocked! Enjoy your exclusive access.',
  },

  // Emails
  emails: {
    welcomeSubject: 'Welcome to Digis!',
    nudge12hSubject: '{name}, discover creators you\'ll love on Digis',
    nudge36hSubject: '{name}, you haven\'t followed anyone on Digis yet',
    nudge72hSubject: 'Creators are going live on Digis — don\'t miss out, {name}',
  },

  // Marketing / Landing
  landing: {
    heroTitle: "what's your digis?",
    heroCta: 'Become a Creator',
    heroFanCta: 'Explore Creators',
    featureLiveStreams: 'Live Streams',
    featureVideoCalls: 'Video Calls',
    featureChats: 'Chats',
    featureEvents: 'Exclusive Events',
    featureGifts: 'Virtual Gifts',
    featureDigitals: 'Digitals',
    modelsTitle: 'Models & Influencers',
    modelsDesc: 'Go live, sell exclusive content, and connect with fans through video calls.',
    fitnessTitle: 'Fitness Creators',
    fitnessDesc: 'Offer workout sessions, coaching calls, and premium fitness content.',
    companionsTitle: 'Virtual Companions',
    companionsDesc: 'Build meaningful connections through video calls, chats, and exclusive content.',
    footerTerms: 'Terms of Service',
    footerPrivacy: 'Privacy Policy',
    footerExplore: 'Explore',
    footerBecomeCreator: 'Become a Creator',
  },
};

export type Dictionary = typeof en;
export type DictionaryKey = keyof Dictionary;
