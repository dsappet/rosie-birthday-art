// types/index.ts
export interface Image {
  id: string;
  fileName: string;
  url: string;
}

export interface StreamResponse {
  status: "processing" | "complete" | "error";
  images?: Image[];
  hasMore?: boolean;
  continuationToken?: string;
  progress?: {
    processed: number;
    total: number;
  };
  error?: string;
}
