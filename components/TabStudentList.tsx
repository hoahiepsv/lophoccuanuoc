
import React, { useState, useMemo } from 'react';
import { Student, TeacherSchedule } from '../types';
import { updateStudent } from '../services/apiService';
import { GRADES } from '../constants';

interface TabStudentListProps {
  students: Student[];
  teacherSchedules: TeacherSchedule[];
  onRefresh: () => void;
}

const TabStudentList: React.FC<TabStudentListProps> = ({ students, teacherSchedules, onRefresh }) => {
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const total = students.length;
    const byGrade: Record<string, number> = {};
    
    students.forEach(s => {
      const g = String(s.grade);
      byGrade[g] = (byGrade[g] || 0) + 1;
    });

    // Sắp xếp các nhóm theo thứ tự số học sinh hoặc thứ tự nhóm
    const sortedGrades = Object.keys(byGrade).sort((a, b) => Number(a) - Number(b));

    return { total, byGrade, sortedGrades };
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (filterGrade !== 'all') {
      result = result.filter(s => String(s.grade) === filterGrade);
    }
    
    result.sort((a, b) => {
      const gradeA = String(a.grade || '');
      const gradeB = String(b.grade || '');
      const gradeComp = gradeA.localeCompare(gradeB, undefined, { numeric: true });
      
      if (gradeComp !== 0) return gradeComp;
      
      const nameA = String(a.fullName || '');
      const nameB = String(b.fullName || '');
      return nameA.localeCompare(nameB);
    });
    return result;
  }, [students, filterGrade]);

  const handleEdit = (student: Student) => {
    setEditingStudent({ ...student });
    if (student.startDate) {
      setViewDate(new Date(student.startDate));
    } else {
      setViewDate(new Date());
    }
  };

  const handleInsertTeacherSchedule = () => {
    if (!editingStudent) return;
    
    const schedule = teacherSchedules.find(ts => ts.grade.toString() === editingStudent.grade.toString());
    
    if (!schedule) {
      alert(`Không tìm thấy lịch dạy của giáo viên cho Nhóm ${editingStudent.grade}`);
      return;
    }
    
    let days: string[] = [];
    try { days = JSON.parse(schedule.days || '[]'); } catch(e) {}
    
    const validDays = days.filter(d => d >= editingStudent.startDate);
    
    if (validDays.length === 0) {
      alert("Không có ngày dạy nào của GV sau ngày đăng ký của HS này.");
      return;
    }

    let currentSchedule: string[] = [];
    try { currentSchedule = JSON.parse(editingStudent.schedule || '[]'); } catch(e) {}

    const newSchedule = Array.from(new Set([...currentSchedule, ...validDays])).sort();
    
    setEditingStudent({
      ...editingStudent,
      schedule: JSON.stringify(newSchedule)
    });
    alert(`Đã chèn thêm ${validDays.length} buổi học từ lịch giáo viên.`);
  };

  const toggleDayInSchedule = (day: number) => {
    if (!editingStudent) return;
    
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;

    if (dateStr < editingStudent.startDate) return;

    let currentSchedule: string[] = [];
    try {
      currentSchedule = JSON.parse(editingStudent.schedule || '[]');
    } catch (e) {
      currentSchedule = [];
    }

    const newSchedule = currentSchedule.includes(dateStr)
      ? currentSchedule.filter(d => d !== dateStr)
      : [...currentSchedule, dateStr];

    setEditingStudent({
      ...editingStudent,
      schedule: JSON.stringify(newSchedule.sort())
    });
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    const sanitizedStudent = {
      ...editingStudent,
      startDate: editingStudent.startDate.split('T')[0].split(' ')[0]
    };
    const success = await updateStudent(sanitizedStudent);
    if (success) {
      alert("Cập nhật thông tin học sinh thành công!");
      setEditingStudent(null);
      onRefresh();
    } else {
      alert("Lỗi khi kết nối server.");
    }
  };

  const getAbsentCount = (attendanceStr: string) => {
    try {
      const arr = JSON.parse(attendanceStr || '[]');
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) {
      return 0;
    }
  };

  // Hàm lấy danh sách các tháng đã đóng phí và định dạng lại
  const getPaidMonthsList = (tuitionStr: string) => {
    try {
      const arr = JSON.parse(tuitionStr || '[]');
      if (!Array.isArray(arr)) return [];
      
      // Sắp xếp theo thời gian
      return arr.sort((a, b) => {
        const [mA, yA] = a.split('/').map(Number);
        const [mB, yB] = b.split('/').map(Number);
        if (yA !== yB) return yA - yB;
        return mA - mB;
      }).map(item => {
        const [m, y] = item.split('/');
        return `T${m.padStart(2, '0')}/${y}`;
      });
    } catch (e) {
      return [];
    }
  };

  const getAttendedCount = (s: Student) => {
    try {
      const schedule = JSON.parse(s.schedule || '[]');
      const attendance = JSON.parse(s.attendance || '[]');
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Tính số buổi trong lịch tính đến hiện tại (định dạng YYYY-MM-DD)
      const scheduledUntilNow = schedule.filter((d: string) => new Date(d) <= today).length;
      
      // Tính số buổi vắng (định dạng DD/MM/YYYY)
      const absentsUntilNow = attendance.filter((d: string) => {
        const [day, month, year] = d.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date <= today;
      }).length;

      return Math.max(0, scheduledUntilNow - absentsUntilNow);
    } catch (e) {
      return 0;
    }
  };

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { year, month, daysInMonth, adjustedFirstDay };
  }, [viewDate]);

  const changeViewMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const isDaySelected = (day: number) => {
    if (!editingStudent) return false;
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    try {
      const schedule = JSON.parse(editingStudent.schedule || '[]');
      return schedule.includes(dateStr);
    } catch (e) {
      return false;
    }
  };

  const getScheduleList = () => {
    if (!editingStudent) return [];
    try {
      return JSON.parse(editingStudent.schedule || '[]').sort();
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-lg border border-emerald-800 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Tổng số học sinh</p>
          <p className="text-3xl font-black">{stats.total}</p>
        </div>
        
        <div className="md:col-span-3 bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex flex-col overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800 opacity-60 mb-3">Số lượng học sinh từng nhóm</p>
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {stats.sortedGrades.map(g => (
              <div key={g} className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-3 min-w-[100px]">
                <span className="bg-emerald-700 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black">N{g}</span>
                <span className="text-sm font-black text-emerald-900">{stats.byGrade[g]} <span className="text-[10px] font-medium opacity-50">HS</span></span>
              </div>
            ))}
            {stats.sortedGrades.length === 0 && <p className="text-xs italic text-gray-400">Chưa có dữ liệu học sinh</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
        <h2 className="text-xl font-black text-emerald-900 uppercase flex items-center gap-2">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.994 7.994 0 0113 4a7.99 7.99 0 0110 7.72V14a2 2 0 01-2 2H3a2 2 0 01-2-2V11.72C1 8.847 2.625 6.353 5.176 4.981A7.99 7.99 0 019 4.804zM5 11.72V14h14v-2.28a6.01 6.01 0 00-4-5.659V7a2 2 0 10-4 0v1.061A6.01 6.01 0 005 11.72zM11 7v1h2V7h-2z" /></svg>
          Danh Sách Học Sinh
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-emerald-800 uppercase">Lọc theo nhóm:</label>
          <select 
            className="bg-white border-2 border-emerald-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:border-emerald-500 transition shadow-sm"
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
          >
            <option value="all">TẤT CẢ NHÓM</option>
            {GRADES.map(g => <option key={g} value={g}>NHÓM {g}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-emerald-100 shadow-sm">
        <table className="min-w-full divide-y divide-emerald-100">
          <thead className="bg-emerald-900 text-white uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="px-4 py-4 text-left">STT</th>
              <th className="px-4 py-4 text-left">Họ tên HS</th>
              <th className="px-4 py-4 text-center">Nhóm</th>
              <th className="px-4 py-4 text-left">Lớp</th>
              <th className="px-4 py-4 text-left">SĐT Phụ Huynh</th>
              <th className="px-4 py-4 text-left">Ngày BĐ</th>
              <th className="px-4 py-4 text-center">Số buổi đã học</th>
              <th className="px-4 py-4 text-center">Số buổi vắng</th>
              <th className="px-4 py-4 text-center max-w-[200px]">Đóng phí</th>
              <th className="px-4 py-4 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50 text-sm font-medium text-gray-700">
            {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
              <tr key={s.stt} className="hover:bg-emerald-50/50 transition-colors group">
                <td className="px-4 py-4 font-bold text-emerald-900/40">{idx + 1}</td>
                <td className="px-4 py-4 font-bold text-emerald-900">{s.fullName}</td>
                <td className="px-4 py-4 text-center">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black">NHÓM {s.grade}</span>
                </td>
                <td className="px-4 py-4">{s.className}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs">{s.phone1}</span>
                    {s.phone2 && <span className="text-[10px] opacity-60 italic">{s.phone2}</span>}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-bold text-gray-500">{s.startDate}</td>
                <td className="px-4 py-4 text-center">
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black border border-emerald-100">
                    {getAttendedCount(s)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`font-black px-2 py-1 rounded-lg ${getAbsentCount(s.attendance) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    {getAbsentCount(s.attendance)}
                  </span>
                </td>
                <td className="px-4 py-4 text-center max-w-[200px]">
                  <div className="flex flex-wrap gap-1 justify-center max-h-16 overflow-y-auto custom-scrollbar p-1">
                    {getPaidMonthsList(s.tuition).length > 0 ? getPaidMonthsList(s.tuition).map(m => (
                      <span key={m} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-blue-100 whitespace-nowrap">
                        {m}
                      </span>
                    )) : (
                      <span className="text-[10px] text-gray-300 italic">Chưa đóng</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <button 
                    onClick={() => handleEdit(s)}
                    className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-lg text-xs font-black uppercase hover:bg-amber-200 transition shadow-sm border border-amber-200"
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={10} className="px-4 py-20 text-center text-gray-400 italic">Không có dữ liệu học sinh trong nhóm này</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-5xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border border-emerald-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8 border-b-2 border-emerald-500 pb-4">
              <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">Hồ sơ & Lịch học chi tiết</h3>
              <button onClick={() => setEditingStudent(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-inner space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest border-b border-emerald-200 pb-2">Thông tin cơ bản</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1 ml-1">Họ tên HS</label>
                      <input type="text" className="w-full border-2 border-white bg-white rounded-xl p-3 outline-none focus:border-emerald-500 font-bold shadow-sm" value={editingStudent.fullName} onChange={(e) => setEditingStudent({...editingStudent, fullName: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1 ml-1">Nhóm</label>
                        <select className="w-full border-2 border-white bg-white rounded-xl p-3 outline-none focus:border-emerald-500 font-bold shadow-sm appearance-none" value={editingStudent.grade} onChange={(e) => setEditingStudent({...editingStudent, grade: e.target.value})}>
                          {GRADES.map(g => <option key={g} value={g}>Nhóm {g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1 ml-1">Lớp</label>
                        <input type="text" className="w-full border-2 border-white bg-white rounded-xl p-3 outline-none focus:border-emerald-500 font-bold shadow-sm" value={editingStudent.className} onChange={(e) => setEditingStudent({...editingStudent, className: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1 ml-1">SĐT Chính</label>
                      <input type="text" className="w-full border-2 border-white bg-white rounded-xl p-3 outline-none focus:border-emerald-500 font-bold shadow-sm" value={editingStudent.phone1} onChange={(e) => setEditingStudent({...editingStudent, phone1: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-emerald-700 mb-1 ml-1">Ngày bắt đầu học</label>
                      <input type="date" className="w-full border-2 border-white bg-white rounded-xl p-3 outline-none focus:border-emerald-500 font-bold shadow-sm text-xs" value={editingStudent.startDate} onChange={(e) => setEditingStudent({...editingStudent, startDate: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-800 space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between border-b border-emerald-800 pb-4 gap-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Lịch học chi tiết của HS</h4>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handleInsertTeacherSchedule} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-400 transition shadow-lg">Chèn lịch giáo viên</button>
                      <div className="flex items-center gap-4 bg-emerald-800/50 px-3 py-1.5 rounded-xl border border-emerald-700">
                        <button onClick={() => changeViewMonth(-1)} className="hover:text-emerald-400 transition-colors font-bold">❮</button>
                        <span className="font-black text-[10px] min-w-[100px] text-center uppercase tracking-tighter">Tháng {calendarData.month + 1} / {calendarData.year}</span>
                        <button onClick={() => changeViewMonth(1)} className="hover:text-emerald-400 transition-colors font-bold">❯</button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                      <div key={d} className="text-center text-[8px] font-black text-emerald-600 uppercase">{d}</div>
                    ))}
                    {Array.from({ length: calendarData.adjustedFirstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-9"></div>
                    ))}
                    {Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1).map(day => {
                      const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const selected = isDaySelected(day);
                      const isBeforeStart = dateStr < editingStudent.startDate;
                      
                      return (
                        <button
                          key={day}
                          disabled={isBeforeStart}
                          onClick={() => toggleDayInSchedule(day)}
                          className={`h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all border transform active:scale-90 ${
                            selected 
                              ? 'bg-emerald-400 text-emerald-950 border-emerald-400 shadow-lg shadow-emerald-400/20' 
                              : isBeforeStart
                                ? 'bg-transparent text-emerald-900 border-transparent opacity-20 cursor-not-allowed'
                                : 'bg-emerald-800/30 border-emerald-700 text-emerald-500 hover:border-emerald-500'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-emerald-800/40 p-4 rounded-2xl border border-emerald-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Danh sách ngày học ({getScheduleList().length} buổi):</p>
                      <button type="button" onClick={() => setEditingStudent({...editingStudent, schedule: '[]'})} className="text-[8px] font-black text-red-400 hover:text-red-300 uppercase underline">Xóa tất cả</button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                      {getScheduleList().map((d: string) => (
                        <span key={d} className="bg-emerald-800 text-emerald-200 px-2 py-1 rounded text-[8px] font-bold border border-emerald-700 flex items-center gap-1">
                          {new Date(d).toLocaleDateString('vi-VN')}
                          <button onClick={() => setEditingStudent({...editingStudent, schedule: JSON.stringify(getScheduleList().filter((day: string) => day !== d))})} className="text-emerald-500 hover:text-red-400 transition-colors ml-1">✕</button>
                        </span>
                      ))}
                      {getScheduleList().length === 0 && <p className="text-[9px] italic text-emerald-600">Chưa chọn buổi học nào (từ ngày đăng ký trở đi)</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8 border-t border-emerald-50 pt-6">
              <button onClick={() => setEditingStudent(null)} className="px-6 py-3 text-gray-500 font-black uppercase text-xs hover:text-red-500 transition-colors tracking-widest">Hủy bỏ</button>
              <button onClick={handleUpdate} className="px-10 py-3 bg-emerald-700 text-white rounded-xl font-black uppercase text-xs shadow-xl hover:bg-emerald-800 transition transform active:scale-95 tracking-[0.1em]">Lưu toàn bộ thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabStudentList;
