
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { updateStudent } from '../services/apiService';

interface TabAttendanceProps {
  students: Student[];
  onRefresh: () => void;
}

const TabAttendance: React.FC<TabAttendanceProps> = ({ students, onRefresh }) => {
  const [mode, setMode] = useState<'today' | 'history'>('today');
  const [absentStudentsToday, setAbsentStudentsToday] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentStt, setSelectedStudentStt] = useState<number | null>(null);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [localAttendance, setLocalAttendance] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString('vi-VN');

  // Today's Attendance Logic
  const toggleAbsentToday = (stt: number) => {
    setAbsentStudentsToday(prev => 
      prev.includes(stt) ? prev.filter(id => id !== stt) : [...prev, stt]
    );
  };

  const handleSaveToday = async () => {
    if (absentStudentsToday.length === 0) {
      alert("Chưa chọn học sinh nào vắng!");
      return;
    }

    setSaving(true);
    let count = 0;
    for (const stt of absentStudentsToday) {
      const s = students.find(std => std.stt === stt);
      if (s) {
        let currentAttendance = [];
        try { currentAttendance = JSON.parse(s.attendance || '[]'); } catch(e) {}
        if (!currentAttendance.includes(today)) {
          currentAttendance.push(today);
          const success = await updateStudent({ ...s, attendance: JSON.stringify(currentAttendance) });
          if (success) count++;
        }
      }
    }

    alert(`Đã điểm danh vắng cho ${count} học sinh ngày ${today}`);
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

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone1.includes(searchTerm)
    ).slice(0, 15);
  }, [students, searchTerm]);

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

  return (
    <div className="space-y-8">
      {/* Header & Mode Switch */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
        <div>
          <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">
            {mode === 'today' ? `Điểm danh vắng ngày ${today}` : "Điểm danh cho ngày trước"}
          </h2>
          <p className="text-xs text-emerald-600 font-medium italic">
            {mode === 'today' ? "Đánh dấu nhanh những học sinh vắng mặt ngày hôm nay" : "Chọn học sinh và đánh dấu các ngày vắng trong lịch sử"}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setMode(mode === 'today' ? 'history' : 'today')}
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition border border-emerald-200"
          >
            {mode === 'today' ? "📅 ĐIỂM DANH NGÀY TRƯỚC" : "⚡ ĐIỂM DANH HÔM NAY"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map(s => (
            <div 
              key={s.stt}
              onClick={() => toggleAbsentToday(s.stt)}
              className={`cursor-pointer p-5 rounded-2xl border-2 transition-all transform active:scale-95 flex items-center gap-4 ${
                absentStudentsToday.includes(s.stt) 
                  ? 'bg-red-50 border-red-500 shadow-lg scale-[1.02]' 
                  : 'bg-white border-gray-100 hover:border-emerald-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                absentStudentsToday.includes(s.stt) ? 'bg-red-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {s.fullName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className={`font-black text-sm uppercase truncate ${absentStudentsToday.includes(s.stt) ? 'text-red-700' : 'text-emerald-900'}`}>{s.fullName}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Lớp {s.className} - Nhóm {s.grade}</p>
              </div>
              {absentStudentsToday.includes(s.stt) && (
                <div className="text-red-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Student Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-3xl border-2 border-emerald-50 shadow-sm space-y-4">
              <label className="block text-[10px] font-black uppercase text-emerald-800 tracking-widest">Chọn học sinh:</label>
              <input 
                type="text" 
                placeholder="Tìm tên hoặc SĐT..." 
                className="w-full border-2 border-emerald-50 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredStudents.map(s => (
                  <button
                    key={s.stt}
                    onClick={() => setSelectedStudentStt(s.stt)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedStudentStt === s.stt ? 'bg-emerald-900 text-white border-emerald-900 shadow-md' : 'bg-emerald-50/50 border-transparent hover:border-emerald-200'
                    }`}
                  >
                    <p className="font-black text-xs uppercase">{s.fullName}</p>
                    <p className={`text-[9px] font-bold ${selectedStudentStt === s.stt ? 'text-emerald-300' : 'text-emerald-500'}`}>LỚP {s.className} - {s.phone1}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Selector */}
          <div className="lg:col-span-8">
            {selectedStudent ? (
              <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-8 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800 pb-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest">{selectedStudent.fullName}</h3>
                    <p className="text-emerald-400 text-[10px] font-bold uppercase mt-1">LỚP {selectedStudent.className} — NHÓM {selectedStudent.grade}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-800 p-2 rounded-2xl border border-emerald-700">
                    <select 
                      className="bg-transparent text-xs font-black outline-none cursor-pointer"
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(parseInt(e.target.value))}
                    >
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m} className="bg-emerald-900">THÁNG {m}</option>)}
                    </select>
                    <select 
                      className="bg-transparent text-xs font-black outline-none cursor-pointer"
                      value={historyYear}
                      onChange={(e) => setHistoryYear(parseInt(e.target.value))}
                    >
                      {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-emerald-900">{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Đánh dấu những ngày học sinh vắng học:</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="text-center text-[9px] font-black text-emerald-500 uppercase">{d}</div>)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const dateStr = `${day.toString().padStart(2, '0')}/${historyMonth.toString().padStart(2, '0')}/${historyYear}`;
                      const isAbsent = localAttendance.includes(dateStr);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleHistoryDay(day)}
                          className={`h-11 rounded-xl flex items-center justify-center font-black transition border-2 text-xs ${
                            isAbsent 
                              ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20' 
                              : 'bg-emerald-800/30 border-emerald-700 text-emerald-500 hover:border-emerald-500'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <div className="bg-emerald-800/40 p-4 rounded-2xl flex-1 border border-emerald-700/50">
                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest mb-1">Tổng số ngày vắng</p>
                    <p className="text-2xl font-black">{localAttendance.length} <span className="text-xs font-medium opacity-50">buổi</span></p>
                  </div>
                  <button
                    onClick={handleUpdateHistory}
                    disabled={saving}
                    className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black px-10 py-4 rounded-2xl shadow-xl transition transform active:scale-95 disabled:opacity-50 text-sm uppercase tracking-[0.1em] flex items-center justify-center gap-2"
                  >
                    {saving ? "ĐANG LƯU..." : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        LƯU LỊCH SỬ VẮNG
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] bg-white border-2 border-dashed border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center">
                <div className="bg-emerald-50 p-6 rounded-full text-emerald-200 mb-4">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h4 className="text-lg font-black text-emerald-900 uppercase tracking-widest">Chưa chọn học sinh</h4>
                <p className="text-emerald-500 text-sm font-medium italic">Chọn một học sinh từ danh sách bên trái để ghi nhận ngày vắng cũ</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TabAttendance;
