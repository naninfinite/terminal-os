export type YouMessage = {
  id: string;
  body: string;
  displayName: string | null;
  isAnon: boolean;
  createdAt: string;
};

export type CreateYouMessageInput = {
  body: string;
  displayName?: string;
};

export type ListYouMessagesInput = {
  before?: string;
  limit?: number;
};

export type YouDisplayMode = 'panel' | 'fullscreen';
