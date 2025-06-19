export interface IssueImage {
  id: string;
  url: string;
  file: File;
  name: string;
}

export interface Issue {
  id: string;
  description: string;
  images: IssueImage[];
  status?: string;
  priority?: string;
  createdDate?: string;
}
