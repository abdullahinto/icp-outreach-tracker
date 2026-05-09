export type ICPStatus = 'done' | 'draft' | 'active';
export type ResponseType = 'No Reply' | 'Replied' | 'Booked' | 'Positive';

export interface ICP {
  id: string;
  name: string;
  topic: string;
  point: string;
  transcript: string;
  timestamps: string;
  link: string;
  status: ICPStatus;
  title: string;
  company: string;
  linkedinUrl: string;
  trojanHorseSent: boolean;
  dateSent: string | null;
  response: ResponseType;
  createdAt?: number;
}
