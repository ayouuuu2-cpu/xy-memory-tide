export type QuestVariant = "trace" | "wish";

export type QuestPhotoRecord = {
  id: string;
  publicUrl: string;
  storagePath: string;
  mediaType: "image" | "video";
  mimeType: string;
  caption: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
};
