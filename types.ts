
export interface Student {
  stt: number;
  fullName: string;
  grade: string;
  className: string;
  phone1: string;
  phone2: string;
  startDate: string;
  schedule: string; // JSON string of dates
  attendance: string; // JSON string of dates vắng
  tuition: string; // JSON string of paid months/years
}

export interface TeacherSchedule {
  stt: number;
  grade: string;
  days: string; // JSON string of dates
}

export enum TabType {
  LIST = 'LIST',
  ATTENDANCE = 'ATTENDANCE',
  ADD = 'ADD',
  TUITION = 'TUITION',
  STATS = 'STATS',
  TEACHER_SCHEDULE = 'TEACHER_SCHEDULE'
}

export interface AuthUser {
  username: string;
  name: string;
}
