
import React, { useState, useMemo } from 'react';
import { addStudent } from '../services/apiService';
import { TeacherSchedule } from '../types';
import { GRADES } from '../constants';

interface TabAddStudentProps {
  teacherSchedules: TeacherSchedule[];
  onRefresh: () => void;
}

const TabAddStudent: React.FC<TabAddStudentProps> = ({ teacherSchedules, onRefresh }) => {
  const getTodayStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    fullName: '',
    grade: '',
    className: '',
    phone1: '',
    phone2: '',
    startDate: getTodayStr(),
  });

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [paidMonths, setPaidMonths] = useState<string[]>([]);
  const [tuitionYear, setTuitionYear] = useState<number>(new Date().getFullYear());
  
  // State cho việc điều hướng lịch hiển thị
  const [viewDate, setViewDate] = useState(new Date());

  const handleInsertTeacherSchedule = () => {
    if (!formData.grade) {
      alert("Vui lòng chọn NHÓM của học sinh trước để lấy lịch tương ứng!");
      return;
    }
    
    // Tìm lịch dạy của giáo viên tương ứng với NHÓM đã chọn từ DATASHEET2
    const schedule = teacherSchedules.find(ts => ts.grade.toString() === formData.grade.toString());
    
    if (!schedule) {
      alert(`Không tìm thấy lịch dạy đã lưu cho NHÓM ${formData.grade} trong hệ thống!`);
      return;
    }
    
    let days: string[] = [];
    try { 
      days = JSON.parse(schedule.days || '[]'); 
    } catch(e) {
      console.error("Lỗi parse lịch dạy:", e);
    }
    
    // Chèn những ngày từ ngày bắt đầu học trở đi
    const validDays = days.filter(d => d >= formData.startDate);
    
    if (validDays.length === 0) {
      alert(`Lịch dạy của giáo viên Nhóm ${formData.grade} không có ngày nào sau ngày đăng ký (${formData.startDate}).`);
      return;
    }

    // Gộp lịch dạy vào lịch của học sinh (tự động stick)
    const newSchedule = Array.from(new Set([...selectedDays, ...validDays])).sort();
    setSelectedDays(newSchedule);
    
    // Tự động chuyển lịch xem đến tháng đăng ký
    setViewDate(new Date(formData.startDate));
    
    alert(`Đã tự động chèn ${validDays.length} ngày học từ kế hoạch dạy của giáo viên Nhóm ${formData.grade}. Bạn có thể chỉnh sửa thủ công nếu cần.`);
  };

  const toggleMonth = (m: number) => {
    const key = `${m}/${tuitionYear}`;
    setPaidMonths(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSpecificDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    setSelectedDays(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.grade || !formData.className || !formData.phone1) {
      alert("Vui lòng điền các thông tin bắt buộc có dấu (*)");
      return;
    }

    const newStudent = {
      ...formData,
      schedule: JSON.stringify(selectedDays),
      attendance: '[]',
      tuition: JSON.stringify(paidMonths),
    };

    const success = await addStudent(newStudent);
    if (success) {
      alert("Học sinh đã được ghi danh thành công!");
      setFormData({
        fullName: '',
        grade: '',
        className: '',
        phone1: '',
        phone2: '',
        startDate: getTodayStr(),
      });
      setSelectedDays([]);
      setPaidMonths([]);
      onRefresh();
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

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-black text-emerald-900 mb-12 text-center uppercase tracking-widest border-b-4 border-emerald-500 pb-4 inline-block mx-auto flex justify-center w-full">
        <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
        Ghi Danh Học Sinh Mới
      </h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-emerald-800 uppercase flex items-center gap-3">
                <span className="bg-emerald-800 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xs">01</span>
                Hồ sơ học sinh
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">Họ và tên HS (*)</label>
                  <input 
                    className="w-full border-2 border-white bg-white rounded-2xl p-4 outline-none focus:border-emerald-500 font-bold shadow-sm transition"
                    placeholder="Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">Nhóm (*)</label>
                    <select 
                      className="w-full border-2 border-white bg-white rounded-2xl p-4 font-bold shadow-sm outline-none focus:border-emerald-500 appearance-none"
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      required
                    >
                      <option value="">Chọn nhóm</option>
                      {GRADES.map(g => (
                        <option key={g} value={g}>Nhóm {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">Lớp (*)</label>
                    <input 
                      className="w-full border-2 border-white bg-white rounded-2xl p-4 font-bold shadow-sm"
                      placeholder="6A1"
                      value={formData.className}
                      onChange={(e) => setFormData({...formData, className: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">SĐT Chính (*)</label>
                    <input 
                      className="w-full border-2 border-white bg-white rounded-2xl p-4 font-bold shadow-sm"
                      placeholder="09..."
                      value={formData.phone1}
                      onChange={(e) => setFormData({...formData, phone1: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">SĐT Phụ</label>
                    <input 
                      className="w-full border-2 border-white bg-white rounded-2xl p-4 font-bold shadow-sm"
                      value={formData.phone2}
                      onChange={(e) => setFormData({...formData, phone2: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-emerald-700 mb-1 ml-1">Ngày bắt đầu học (*)</label>
                  <input 
                    type="date"
                    className="w-full border-2 border-white bg-white rounded-2xl p-4 font-bold shadow-sm"
                    value={formData.startDate}
                    onChange={(e) => {
                      setFormData({...formData, startDate: e.target.value});
                      setViewDate(new Date(e.target.value));
                    }}
                    required
                  />
                </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="bg-emerald-900 text-emerald-50 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
            <h3 className="text-lg font-black uppercase flex items-center gap-3">
              <span className="bg-white text-emerald-900 w-8 h-8 rounded-xl flex items-center justify-center text-xs">02</span>
              Lịch học & Tài chính
            </h3>

            <div className="space-y-5 bg-emerald-800/40 p-6 rounded-3xl border border-emerald-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest">Đóng học phí năm:</span>
                <div className="flex items-center gap-4 bg-emerald-900 px-4 py-2 rounded-xl border border-emerald-700">
                  <button type="button" onClick={() => setTuitionYear(prev => prev - 1)} className="hover:text-emerald-400 font-bold transition-colors">❮</button>
                  <span className="font-black text-lg min-w-[50px] text-center">{tuitionYear}</span>
                  <button type="button" onClick={() => setTuitionYear(prev => prev + 1)} className="hover:text-emerald-400 font-bold transition-colors">❯</button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const isPaid = paidMonths.includes(`${m}/${tuitionYear}`);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 uppercase tracking-tighter transform active:scale-95 ${
                        isPaid ? 'bg-white text-emerald-900 border-white shadow-lg' : 'border-emerald-700 text-emerald-500 hover:border-emerald-500'
                      }`}
                    >
                      Tháng {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest">LỊCH HỌC RIÊNG CỦA HS:</span>
                <button 
                  type="button"
                  onClick={handleInsertTeacherSchedule}
                  className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition shadow-lg flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Chèn lịch dạy giáo viên
                </button>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-emerald-700/50">
                <div className="flex items-center justify-between mb-6 bg-emerald-800/50 p-3 rounded-2xl border border-emerald-700">
                  <button type="button" onClick={() => changeViewMonth(-1)} className="p-2 hover:bg-emerald-700 rounded-lg transition-colors">❮</button>
                  <h4 className="font-black text-sm uppercase tracking-widest">
                    Tháng {calendarData.month + 1} / {calendarData.year}
                  </h4>
                  <button type="button" onClick={() => changeViewMonth(1)} className="p-2 hover:bg-emerald-700 rounded-lg transition-colors">❯</button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="text-center text-[8px] font-black text-emerald-600 mb-2 uppercase">{d}</div>)}
                  {Array.from({ length: calendarData.adjustedFirstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10"></div>
                  ))}
                  {Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = selectedDays.includes(dateStr);
                    const isBeforeStart = dateStr < formData.startDate;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => !isBeforeStart && toggleSpecificDay(day)}
                        disabled={isBeforeStart}
                        className={`h-10 rounded-lg flex items-center justify-center text-xs font-black transition-all border transform active:scale-90 ${
                          isSelected 
                            ? 'bg-emerald-400 text-emerald-950 border-emerald-400 shadow-lg shadow-emerald-400/20' 
                            : isBeforeStart
                              ? 'bg-transparent text-emerald-800 border-transparent opacity-20 cursor-not-allowed'
                              : 'bg-transparent text-emerald-500 border-emerald-800 hover:border-emerald-600'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-8 pt-6 border-t border-emerald-800/50 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-500">Danh sách ngày học ({selectedDays.length}):</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedDays([])}
                      className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase underline"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedDays.sort().map(d => (
                      <span key={d} className="bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-lg text-[9px] font-bold border border-emerald-700 flex items-center gap-2 group transition-colors hover:border-red-400">
                        {new Date(d).toLocaleDateString('vi-VN')}
                        <button 
                          type="button"
                          onClick={() => setSelectedDays(prev => prev.filter(day => day !== d))} 
                          className="text-emerald-500 font-bold hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {selectedDays.length === 0 && <p className="text-[10px] italic text-emerald-600 py-2">Chưa có buổi học nào được chọn</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="submit"
            className="w-full bg-emerald-700 text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-emerald-800 transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-9 1a9 9 0 1118 0 9 9 0 0118 0z" /></svg>
            Xác nhận ghi danh học sinh
          </button>
        </div>
      </form>
    </div>
  );
};

export default TabAddStudent;
