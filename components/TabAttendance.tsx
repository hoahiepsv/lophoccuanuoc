
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { updateStudent } from '../services/apiService';
import { GRADES } from '../constants';

interface TabAttendanceProps {
  students: Student[];
  onRefresh: () => void;
}

const TabAttendance: React.FC<TabAttendanceProps> = ({ students, onRefresh }) => {
  const [mode, setMode] = useState<'today' | 'history'>('today');
  const [absentStudentsToday, setAbsentStudentsToday] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [selectedStudentStt, setSelectedStudentStt] = useState<number | null>(null);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [localAttendance, setLocalAttendance] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toLocaleDateString('vi-VN');

  // Today's Attendance Logic
  const toggleAbsentToday = (stt: number, isAlreadyAbsent: boolean) => {
    if (isAlreadyAbsent) return; 
    setAbsentStudentsToday(prev => 
      prev.includes(stt) ? prev.filter(id => id !== stt) : [...prev, stt]
    );
  };

  const handleSaveToday = async () => {
    if (absentStudentsToday.length === 0) {
      alert("Chưa chọn thêm học sinh nào vắng!");
      return;
    }

    setSaving(true);
    let count = 0;
    for (const stt of absentStudentsToday) {
      const s = students.find(std => std.stt === stt);
      if (s) {
        let currentAttendance = [];
        try { currentAttendance = JSON.parse(s.attendance || '[]'); } catch(e) {}
        if (!currentAttendance.includes(todayStr)) {
          currentAttendance.push(todayStr);
          const success = await updateStudent({ ...s, attendance: JSON.stringify(currentAttendance) });
          if (success) count++;
        }
      }
    }

    alert(`Đã điểm danh vắng bổ sung cho ${count} học sinh ngày ${todayStr}`);
    setAbsentStudentsToday([]);
    setSaving(false);
    onRefresh();
  };

  // History Logic
  const selectedStudent = useMemo(() => 
    students.find(s => s.stt === selectedStudentStt), 
    [students, selectedStudentStt]
  );

  useEffect(() => {
    if (selectedStudent) {
      try {
        setLocalAttendance(JSON.parse(selectedStudent.attendance || '[]'));
      } catch (e) {
        setLocalAttendance([]);
      }
    }
  }, [selectedStudentStt, students]);

  const studentsToDisplayToday = useMemo(() => {
    return students.filter(s => {
      const matchGrade = filterGrade === 'all' || s.grade.toString() === filterGrade.toString();
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.phone1.includes(searchTerm) || 
                          s.className.toLowerCase().includes(searchTerm.toLowerCase());
      return matchGrade && matchSearch;
    });
  }, [students, filterGrade, searchTerm]);

  const filteredStudentsHistory = useMemo(() => {
    return students.filter(s => {
      const matchGrade = filterGrade === 'all' || s.grade.toString() === filterGrade.toString();
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.phone1.includes(searchTerm);
      return matchGrade && matchSearch;
    }); // Đã bỏ slice(0, 15) để cuộn hết danh sách
  }, [students, searchTerm, filterGrade]);

  const toggleHistoryDay = (day: number) => {
    const dateStr = `${day.toString().padStart(2, '0')}/${historyMonth.toString().padStart(2, '0')}/${historyYear}`;
    setLocalAttendance(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleUpdateHistory = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    const success = await updateStudent({ ...selectedStudent, attendance: JSON.stringify(localAttendance) });
    if (success) {
      alert("Cập nhật lịch sử vắng thành công!");
      onRefresh();
    } else {
      alert("Lỗi khi cập nhật.");
    }
    setSaving(false);
  };

  const daysInMonth = new Date(historyYear, historyMonth, 0).getDate();
  const firstDayOfMonth = new Date(historyYear, historyMonth - 1, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Sắp xếp các ngày vắng để hiển thị danh sách
  const sortedAbsences = useMemo(() => {
    return [...localAttendance].sort((a, b) => {
      const [dA, mA, yA] = a.split('/').map(Number);
      const [dB, mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yB - yA;
      if (mA !== mB) return mB - mA;
      return dB - dA;
    });
  }, [localAttendance]);

  return (
    <div className="space-y-8">
      {/* Header & Mode Switch */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">
            {mode === 'today' ? `Điểm danh vắng ngày ${todayStr}` : "Điều chỉnh lịch sử vắng"}
          </h2>
          <p className="text-xs text-emerald-600 font-medium italic">
            {mode === 'today' ? "Đánh dấu nhanh những học sinh vắng mặt trong buổi học hôm nay" : "Xem và sửa lại các ngày vắng của học sinh trong quá khứ"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
          {/* Ô lọc nhóm luôn hiển thị theo yêu cầu */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
            <label className="text-[10px] font-black uppercase text-emerald-800">Nhóm:</label>
            <select 
              className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="all">TẤT CẢ</option>
              {GRADES.map(g => <option key={g} value={g}>NHÓM {g}</option>)}
              <option value="Kèm riêng">KÈM RIÊNG</option>
            </select>
          </div>

          <button 
            onClick={() => {
              setMode(mode === 'today' ? 'history' : 'today');
              setSearchTerm('');
              setSelectedStudentStt(null);
            }}
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition border border-emerald-200"
          >
            {mode === 'today' ? "📅 XEM LỊCH SỬ VẮNG" : "⚡ ĐIỂM DANH NHANH"}
          </button>
          
          {mode === 'today' && (
            <button 
              onClick={handleSaveToday}
              disabled={saving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-8 py-2.5 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              {saving ? "ĐANG LƯU..." : "LƯU ĐIỂM DANH"}
            </button>
          )}
        </div>
      </div>

      {mode === 'today' ? (
        <div className="space-y-6">
          <div className="relative max-w-md mx-auto">
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh tên, lớp, sđt..." 
              className="w-full border-2 border-emerald-50 rounded-2xl p-4 pl-12 font-bold shadow-sm outline-none focus:border-emerald-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
            {studentsToDisplayToday.length > 0 ? studentsToDisplayToday.map(s => {
              const attendanceArr = JSON.parse(s.attendance || '[]');
              const isAlreadyAbsent = attendanceArr.includes(todayStr);
              const isSelectedNow = absentStudentsToday.includes(s.stt);
              
              return (
                <div 
                  key={s.stt}
                  onClick={() => toggleAbsentToday(s.stt, isAlreadyAbsent)}
                  className={`relative p-5 rounded-2xl border-2 transition-all transform active:scale-95 flex items-center gap-4 ${
                    isAlreadyAbsent
                      ? 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed grayscale'
                      : isSelectedNow
                        ? 'bg-red-50 border-red-500 shadow-lg scale-[1.02] cursor-pointer' 
                        : 'bg-white border-gray-100 hover:border-emerald-200 cursor-pointer'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    isAlreadyAbsent 
                      ? 'bg-gray-400 text-gray-100' 
                      : isSelectedNow 
                        ? 'bg-red-500 text-white shadow-md' 
                        : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className={`font-black text-sm uppercase truncate ${
                      isAlreadyAbsent ? 'text-gray-500 line-through' : isSelectedNow ? 'text-red-700' : 'text-emerald-900'
                    }`}>{s.fullName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Lớp {s.className} - Nhóm {s.grade}</p>
                  </div>
                  
                  {isAlreadyAbsent && (
                    <div className="bg-gray-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase absolute -top-2 -right-2 shadow-sm">
                      Đã ghi nhận
                    </div>
                  )}

                  {isSelectedNow && !isAlreadyAbsent && (
                    <div className="text-red-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="col-span-full py-20 text-center text-gray-400 italic">
                Không tìm thấy học sinh nào phù hợp
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel: Student Selection */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-50 shadow-sm space-y-4">
              <label className="block text-[10px] font-black uppercase text-emerald-800 tracking-widest">Tìm học sinh cần sửa lịch sử:</label>
              <input 
                type="text" 
                placeholder="Nhập tên hoặc số điện thoại..." 
                className="w-full border-2 border-emerald-50 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredStudentsHistory.length > 0 ? filteredStudentsHistory.map(s => (
                  <button
                    key={s.stt}
                    onClick={() => setSelectedStudentStt(s.stt)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedStudentStt === s.stt ? 'bg-emerald-900 text-white border-emerald-900 shadow-md' : 'bg-emerald-50/50 border-transparent hover:border-emerald-200'
                    }`}
                  >
                    <p className="font-black text-xs uppercase">{s.fullName}</p>
                    <p className={`text-[9px] font-bold ${selectedStudentStt === s.stt ? 'text-emerald-300' : 'text-emerald-500'}`}>LỚP {s.className} - {s.phone1}</p>
                  </button>
                )) : (
                  <p className="text-center py-10 text-emerald-300 italic text-xs">Không có học sinh phù hợp lọc</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: History Calendar & List */}
          <div className="lg:col-span-8">
            {selectedStudent ? (
              <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-8 animate-fadeIn h-full flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800 pb-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-emerald-50">{selectedStudent.fullName}</h3>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase mt-1">HỒ SƠ STT#{selectedStudent.stt} — NHÓM {selectedStudent.grade}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-800 p-2 rounded-2xl border border-emerald-700">
                    <select 
                      className="bg-transparent text-xs font-black outline-none cursor-pointer p-1"
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(parseInt(e.target.value))}
                    >
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m} className="bg-emerald-900">THÁNG {m}</option>)}
                    </select>
                    <select 
                      className="bg-transparent text-xs font-black outline-none cursor-pointer p-1"
                      value={historyYear}
                      onChange={(e) => setHistoryYear(parseInt(e.target.value))}
                    >
                      {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-emerald-900">{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-grow">
                  {/* Interactive Calendar */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-600 rounded shadow-sm"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Ngày vắng (Tô đậm)</span>
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 italic">Click vào ngày để đánh dấu vắng/có mặt</div>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1.5">
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                        <div key={d} className="text-center text-[10px] font-black text-emerald-500 uppercase pb-2">{d}</div>
                      ))}
                      {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-11"></div>
                      ))}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const dateStr = `${day.toString().padStart(2, '0')}/${historyMonth.toString().padStart(2, '0')}/${historyYear}`;
                        const isAbsent = localAttendance.includes(dateStr);
                        return (
                          <button
                            key={day}
                            onClick={() => toggleHistoryDay(day)}
                            className={`h-11 rounded-xl flex items-center justify-center font-black transition-all border-2 text-xs relative ${
                              isAbsent 
                                ? 'bg-red-600 border-red-400 text-white shadow-[0_4px_10px_rgba(220,38,38,0.5)] scale-105 z-10' 
                                : 'bg-emerald-800/30 border-emerald-700 text-emerald-600 hover:border-emerald-500'
                            }`}
                          >
                            {day}
                            {isAbsent && <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Absent Days Summary List */}
                  <div className="bg-emerald-800/40 rounded-3xl p-5 border border-emerald-700 flex flex-col max-h-[300px] xl:max-h-full">
                    <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-4 border-b border-emerald-700 pb-2">
                      DANH SÁCH TỔNG CỘNG ({localAttendance.length} NGÀY VẮNG)
                    </h4>
                    <div className="overflow-y-auto flex-grow custom-scrollbar space-y-2 pr-2">
                      {sortedAbsences.length > 0 ? sortedAbsences.map(date => (
                        <div key={date} className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700 flex justify-between items-center group">
                          <span className="text-xs font-black text-emerald-100">{date}</span>
                          <button 
                            onClick={() => setLocalAttendance(prev => prev.filter(d => d !== date))}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )) : (
                        <div className="text-center py-10 text-emerald-600 italic text-xs">Học sinh chưa có ngày vắng nào</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-auto border-t border-emerald-800">
                  <div className="bg-emerald-800/60 p-4 rounded-2xl flex-1 border border-emerald-700">
                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest mb-1">Trạng thái hiện tại</p>
                    <p className="text-xl font-black">Tổng vắng: {localAttendance.length} <span className="text-[10px] font-medium opacity-50">buổi học</span></p>
                  </div>
                  <button
                    onClick={handleUpdateHistory}
                    disabled={saving}
                    className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black px-10 py-4 rounded-2xl shadow-xl transition transform active:scale-95 disabled:opacity-50 text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3"
                  >
                    {saving ? "ĐANG CẬP NHẬT..." : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        LƯU TOÀN BỘ LỊCH SỬ
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] bg-white border-2 border-dashed border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-emerald-50 p-8 rounded-full text-emerald-100 mb-6">
                  <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <h4 className="text-lg font-black text-emerald-900 uppercase tracking-widest">Vui lòng chọn học sinh</h4>
                <p className="text-emerald-500 text-sm font-medium italic max-w-xs mt-2">Chọn một học sinh từ danh sách bên trái để bắt đầu quản lý lịch sử điểm danh vắng mặt</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabAttendance;
