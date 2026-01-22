
import { Student, TeacherSchedule } from '../types';
import { DATASHEET1_URL, DATASHEET2_URL } from '../constants';

// Mock data fallbacks
const MOCK_STUDENTS: Student[] = [
  { stt: 1, fullName: "Dữ liệu mẫu - Đang kết nối...", grade: "6", className: "6A1", phone1: "0987654321", phone2: "", startDate: "2024-01-01", schedule: "[]", attendance: "[]", tuition: "[]" }
];

const MOCK_TEACHER_SCHEDULES: TeacherSchedule[] = [];

/**
 * Cleanup date string to remove time component (e.g. T17:00:00.000Z)
 */
const cleanDate = (dateStr: string | any): string => {
  if (!dateStr) return "";
  const str = String(dateStr);
  return str.split('T')[0].split(' ')[0];
};

export const fetchStudents = async (): Promise<Student[]> => {
  try {
    const response = await fetch(`${DATASHEET1_URL}?action=read`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map(s => ({
        ...s,
        startDate: cleanDate(s.startDate)
      }));
    }
    return MOCK_STUDENTS;
  } catch (error) {
    console.warn("Error fetching students, using mock data:", error);
    return MOCK_STUDENTS;
  }
};

export const updateStudent = async (student: Student): Promise<boolean> => {
  try {
    const sanitizedStudent = {
      ...student,
      startDate: cleanDate(student.startDate)
    };
    await fetch(DATASHEET1_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', ...sanitizedStudent })
    });
    return true; 
  } catch (error) {
    console.error("Error updating student:", error);
    return false;
  }
};

export const addStudent = async (student: Omit<Student, 'stt'>): Promise<boolean> => {
  try {
    const sanitizedStudent = {
      ...student,
      startDate: cleanDate(student.startDate)
    };
    await fetch(DATASHEET1_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create', ...sanitizedStudent })
    });
    return true;
  } catch (error) {
    console.error("Error adding student:", error);
    return false;
  }
};

export const fetchTeacherSchedules = async (): Promise<TeacherSchedule[]> => {
  try {
    const response = await fetch(`${DATASHEET2_URL}?action=read`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return Array.isArray(data) ? data : MOCK_TEACHER_SCHEDULES;
  } catch (error) {
    console.warn("Error fetching teacher schedules:", error);
    return MOCK_TEACHER_SCHEDULES;
  }
};

export const updateTeacherSchedule = async (schedule: TeacherSchedule): Promise<boolean> => {
  try {
    await fetch(DATASHEET2_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update', ...schedule })
    });
    return true;
  } catch (error) {
    console.error("Error updating teacher schedule:", error);
    return false;
  }
};
