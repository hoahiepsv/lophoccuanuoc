
import React, { useState, useEffect, useMemo } from 'react';
import { updateTeacherSchedule } from '../services/apiService';
import { TeacherSchedule } from '../types';
import { GRADES } from '../constants';

interface TabTeacherScheduleProps {
  schedules: TeacherSchedule[];
  onRefresh: () => void;
}

const TabTeacherSchedule: React.FC<TabTeacherScheduleProps> = ({ schedules, onRefresh }) => {
  const [grade, setGrade] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const currentMonthYear = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [viewDate]);

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Adjust for Monday start (0: Mon, 6: Sun)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    return { year, month, daysInMonth, adjustedFirstDay };
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  // Update selectedDays when grade changes (always contains ALL days for that grade across all months)
  useEffect(() => {
    if (!grade) {
      setSelectedDays([]);
      return;
    }
    const existing = schedules.find(s => s.grade.toString() === grade.toString());
    if (existing) {
      try { 
        const days = JSON.parse(existing.days || '[]'); 
        setSelectedDays(Array.isArray(days) ? days : []);
      } catch(e) { 
        setSelectedDays([]); 
      }
    } else {
      setSelectedDays([]);
    }
  }, [grade, schedules]);

  const toggleDay = (day: number) => {
    if (!grade) {
      alert("Hãy chọn nhóm trước khi lên lịch!");
      return;
    }
    const dateStr = `${currentMonthYear}-${day.toString().padStart(2, '0')}`;
    setSelectedDays(prev => 
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSave = async () => {
    if (!grade) return;
    const existing = schedules.find(s => s.grade.toString() === grade.toString());
    
    // Sort before saving for consistency
    const sortedDays = [...selectedDays].sort();
    
    const newSchedule: TeacherSchedule = {
      stt: existing?.stt || 0,
      grade,
      days: JSON.stringify(sortedDays)
    };
    
    setSaving(true);
    const success = await updateTeacherSchedule(newSchedule);
    if (success) {
      alert(`Đã cập nhật lịch dạy cho Nhóm ${grade} thành công!`);
      onRefresh();
    } else {
      alert("Lỗi khi cập nhật lịch dạy. Vui lòng thử lại.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-emerald-900 uppercase flex items-center gap-3">
          <svg className="w-8 h-8 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Thiết lập lịch dạy
        </h2>
        <div className="flex gap-2">
           <button 
            onClick={onRefresh}
            className="bg-emerald-100 text-emerald-700 font-black px-4 py-3 rounded-xl hover:bg-emerald-200 transition text-xs uppercase"
            title="Tải lại dữ liệu từ server"
          >
            Làm mới
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !grade}
            className="bg-emerald-700 text-white font-black px-8 py-3 rounded-xl shadow-lg hover:bg-emerald-800 disabled:opacity-50 transition transform active:scale-95 uppercase text-xs tracking-widest"
          >
            {saving ? 'Đang lưu...' : 'LƯU LỊCH DẠY'}
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-emerald-50 rounded-[2rem] p-8 shadow-xl space-y-8">
        <div>
          <label className="block text-[10px] font-black uppercase text-emerald-800 mb-2 ml-1">Chọn Nhóm để lên lịch dạy:</label>
          <div className="relative">
            <select 
              className="w-full border-2 border-emerald-50 bg-emerald-50/30 rounded-2xl p-4 outline-none focus:border-emerald-500 font-bold transition appearance-none"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">-- CHỌN NHÓM --</option>
              {GRADES.map(g => (
                <option key={g} value={g}>NHÓM {g}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>

        {grade && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-4 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                <button 
                  type="button" 
                  onClick={() => changeMonth(-1)}
                  className="p-1 hover:text-emerald-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="font-black text-emerald-900 uppercase text-sm tracking-tight min-w-[120px] text-center">
                  Tháng {calendarData.month + 1} / {calendarData.year}
                </h3>
                <button 
                  type="button" 
                  onClick={() => changeMonth(1)}
                  className="p-1 hover:text-emerald-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">
                {selectedDays.filter(d => d.startsWith(currentMonthYear)).length} buổi tháng này
              </span>
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-emerald-600 uppercase mb-1">{d}</div>
              ))}
              {/* Offset for empty cells */}
              {Array.from({ length: calendarData.adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12"></div>
              ))}
              {/* Days of month */}
              {Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${currentMonthYear}-${day.toString().padStart(2, '0')}`;
                const isSelected = selectedDays.includes(dateStr);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`h-12 rounded-xl flex items-center justify-center font-black transition border-2 text-sm ${
                      isSelected 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                        : 'bg-white text-gray-400 border-gray-50 hover:border-emerald-300'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!grade && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-emerald-300 italic text-sm">Vui lòng chọn nhóm học để xem và sửa lịch dạy</p>
          </div>
        )}

        <div className="p-5 bg-emerald-900/5 rounded-2xl text-[11px] text-emerald-800 leading-relaxed border border-emerald-100 italic">
          <strong>Lưu ý:</strong> Lịch này dùng để chèn tự động khi ghi danh học sinh mới. Khi thay đổi tại đây, các giáo viên ghi danh học sinh sau đó sẽ tự động được gợi ý lịch này. Toàn bộ các ngày đã chọn của nhóm sẽ được lưu lại.
        </div>
      </div>
    </div>
  );
};

export default TabTeacherSchedule;
