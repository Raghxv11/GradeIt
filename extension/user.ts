interface Student {
  name: string;
  id: string;
  email?: string;
  major?: string;
  year?: number;
  assignments: {
    assignment1: number;
    assignment2: number;
    assignment3: number;
  };
  finalProject?: number;
  attendance?: number;
  participation?: number;
  notes?: string;
}