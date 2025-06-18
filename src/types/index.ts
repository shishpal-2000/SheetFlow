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
}
