
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { generateTuitionReport, generateIndividualReport } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COPYRIGHT } from '../constants';

interface TabStatisticsProps {
  students: Student[];
}

const TabStatistics: React.FC<TabStatisticsProps> = ({ students }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reportContent, setReportContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'general' | 'individual' | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const today = new Date();

  // Thống kê tình trạng học phí
  const tuitionStatus = useMemo(() => {
    const paidList: Student[] = [];
    const unpaidThisMonth: Student[] = [];
    const debtList: Student[] = []; 
    const currentKey = `${currentMonth}/${currentYear}`;

    students.forEach(s => {
      let paidKeys: string[] = [];
      try { paidKeys = JSON.parse(s.tuition || '[]'); } catch(e) {}
      const hasPaidThisMonth = paidKeys.includes(currentKey);
      
      if (hasPaidThisMonth) paidList.push(s);
      else unpaidThisMonth.push(s);

      const start = new Date(s.startDate);
      let temp = new Date(start.getFullYear(), start.getMonth(), 1);
      while (temp < new Date(today.getFullYear(), today.getMonth(), 1)) {
        const checkKey = `${temp.getMonth() + 1}/${temp.getFullYear()}`;
        if (!paidKeys.includes(checkKey)) {
          if (!debtList.includes(s)) debtList.push(s);
          break;
        }
        temp.setMonth(temp.getMonth() + 1);
      }
    });

    return { paidList, unpaidThisMonth, debtList };
  }, [students, currentMonth, currentYear]);

  // Phân tích chi tiết học sinh được chọn
  const studentAnalysis = useMemo(() => {
    if (!selectedStudent) return null;

    let scheduleDays: string[] = [];
    try { scheduleDays = JSON.parse(selectedStudent.schedule || '[]'); } catch(e) {}
    
    let absentDays: string[] = [];
    try { absentDays = JSON.parse(selectedStudent.attendance || '[]'); } catch(e) {}

    let paidMonths: string[] = [];
    try { paidMonths = JSON.parse(selectedStudent.tuition || '[]'); } catch(e) {}

    const scheduledUpToNow = scheduleDays.filter(d => new Date(d) <= today).length;
    const absents = absentDays.length;
    const actualAttendance = Math.max(0, scheduledUpToNow - absents);

    const startDate = new Date(selectedStudent.startDate);
    const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth()) + 1;
    
    // Tính toán các tháng chưa đóng phí
    const unpaidMonthsList: string[] = [];
    let temp = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (temp < new Date(today.getFullYear(), today.getMonth() + 1, 1)) {
      const checkKey = `${temp.getMonth() + 1}/${temp.getFullYear()}`;
      if (!paidMonths.includes(checkKey)) {
        unpaidMonthsList.push(`T${String(temp.getMonth() + 1).padStart(2, '0')}/${temp.getFullYear()}`);
      }
      temp.setMonth(temp.getMonth() + 1);
    }

    // Format paid months for display
    const formattedPaidMonths = paidMonths.sort((a, b) => {
      const [mA, yA] = a.split('/').map(Number);
      const [mB, yB] = b.split('/').map(Number);
      if (yA !== yB) return yA - yB;
      return mA - mB;
    }).map(item => {
      const [m, y] = item.split('/');
      return `T${m.padStart(2, '0')}/${y}`;
    });

    return {
      scheduledUpToNow,
      absents,
      absentDates: absentDays,
      actualAttendance,
      paidCount: paidMonths.length,
      paidMonthsList: formattedPaidMonths,
      unpaidCount: unpaidMonthsList.length,
      unpaidMonthsList,
      totalMonths: monthsDiff
    };
  }, [selectedStudent, today]);

  const statsData = [
    { name: 'Đã đóng', value: tuitionStatus.paidList.length, color: '#065f46' },
    { name: 'Chưa đóng', value: tuitionStatus.unpaidThisMonth.length, color: '#b91c1c' },
    { name: 'Nợ phí', value: tuitionStatus.debtList.length, color: '#c2410c' }
  ];

  // Hàm tạo báo cáo tổng hợp
  const handleGenerateGeneralReport = async () => {
    setReportType('general');
    setIsGenerating(true);
    const content = await generateTuitionReport(students);
    setReportContent(content);
    setIsGenerating(false);
  };

  // Hàm tạo báo cáo cá nhân
  const handleGenerateIndividualReport = async () => {
    if (!selectedStudent || !studentAnalysis) return;
    setReportType('individual');
    setIsGenerating(true);
    const content = await generateIndividualReport(selectedStudent, studentAnalysis);
    setReportContent(content);
    setIsGenerating(false);
  };

  // Hàm tải file PDF báo cáo
  const handleDownloadPDF = () => {
    const element = document.querySelector('.report-canvas');
    if (!element) return;
    
    const opt = {
      margin: 20,
      filename: `Bao_cao_${reportType === 'general' ? 'Lop_hoc' : selectedStudent?.fullName || 'HS'}_${today.getTime()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 4, 
        useCORS: true, 
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
    };
    
    // @ts-ignore
    html2pdf().set(opt).from(element).save();
  };

  // Hàm format Markdown sang JSX
  const formatMarkdown = (text: string) => {
    const sanitizedText = text
      .replace(/\*\*/g, '') 
      .replace(/###?\s*/g, '')
      .replace(/BẢNG\s*\d+:?/gi, '')
      .trim();
    
    const lines = sanitizedText.split('\n');
    const result: React.ReactNode[] = [];
    let tableLines: string[] = [];

    const flushTable = (key: number) => {
        if (tableLines.length === 0) return null;
        const currentTable = [...tableLines];
        tableLines = [];
        return (
            <div key={`table-${key}`} className="overflow-x-auto my-4 border border-black">
                <table className="min-w-full border-collapse">
                    <tbody>
                        {currentTable.map((tLine, idx) => {
                            const cells = tLine.split('|').filter(c => c.trim() !== '' || (tLine.startsWith('|') && tLine.endsWith('|'))).map(c => c.trim());
                            if (cells.length === 0) return null;
                            const isHeader = idx === 0;
                            const isDivider = tLine.includes('---');
                            if (isDivider) return null;

                            return (
                                <tr key={idx} className={isHeader ? "bg-gray-100 font-bold" : "border-t border-black"}>
                                    {cells.map((cell, cIdx) => (
                                        <td key={cIdx} className="border border-black px-3 py-2 text-[11pt] text-black leading-tight">
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    let titleCount = 0;
    lines.forEach((line, i) => {
      const trimmedLine = line.trim();
      const isTableLine = trimmedLine.startsWith('|');
      
      if (isTableLine) {
        tableLines.push(line);
      } else {
        if (tableLines.length > 0) {
          result.push(flushTable(i));
        }
        if (trimmedLine) {
           const isTitle = (/^[A-Z0-9À-Ỹ\s\-]+$/.test(trimmedLine) || trimmedLine.toUpperCase().startsWith('TIÊU ĐỀ')) && trimmedLine.length < 120;
           if (isTitle) titleCount++;
           
           result.push(
             <p key={i} className={`mb-2 text-black leading-relaxed ${isTitle ? `text-[14pt] font-bold uppercase text-left ${titleCount > 1 ? 'mt-6' : 'mt-2'}` : 'text-[13pt]'}`}>
               {trimmedLine}
             </p>
           );
        }
      }
    });
    
    if (tableLines.length > 0) {
      result.push(flushTable(9999));
    }

    return result;
  };

  return (
    <div className="space-y-10">
      {/* Dashboard Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-emerald-800 opacity-60 mb-1">Đã đóng học phí T.{currentMonth}</p>
          <p className="text-4xl font-black text-emerald-900">{tuitionStatus.paidList.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.paidList.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-emerald-100 pb-1 flex justify-between">
                 <span className="font-bold text-emerald-900">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">Nhóm {s.grade}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-red-800 opacity-60 mb-1">Chưa đóng học phí T.{currentMonth}</p>
          <p className="text-4xl font-black text-red-900">{tuitionStatus.unpaidThisMonth.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.unpaidThisMonth.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-red-100 pb-1 flex justify-between">
                 <span className="font-bold text-red-700">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">{s.phone1}</span>
               </div>
             ))}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-orange-800 opacity-60 mb-1">Học sinh nợ phí cũ</p>
          <p className="text-4xl font-black text-orange-900">{tuitionStatus.debtList.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.debtList.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-orange-100 pb-1 flex justify-between">
                 <span className="font-bold text-orange-700">{s.fullName} - {s.className}</span>
                 <span className="opacity-60">Nhóm {s.grade}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 no-print">
        {/* Class Overview Chart */}
        <div className="flex-1 bg-white p-8 rounded-3xl border border-emerald-100 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-emerald-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Toàn bộ lớp học</h2>
            <button 
              onClick={handleGenerateGeneralReport}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase transition shadow-md"
            >
              BÁO CÁO TOÀN BỘ
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Student Selection & Insights */}
        <div className="flex-1 bg-emerald-900 p-8 rounded-3xl shadow-xl space-y-6 text-white overflow-hidden">
          <h2 className="text-xl font-black uppercase tracking-widest border-l-4 border-emerald-400 pl-4">Thông tin học sinh</h2>
          <div className="space-y-6">
            <select 
              className="w-full bg-emerald-800 text-white border-2 border-emerald-700 rounded-2xl p-4 outline-none focus:border-emerald-400 font-bold transition appearance-none"
              onChange={(e) => setSelectedStudent(students.find(s => s.stt === parseInt(e.target.value)) || null)}
            >
              <option value="">CHỌN HỌC SINH ĐỂ XEM CHI TIẾT</option>
              {students.map(s => <option key={s.stt} value={s.stt}>{s.fullName} - {s.className}</option>)}
            </select>
            
            {selectedStudent && studentAnalysis ? (
              <div className="animate-fadeIn space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  {/* Box 1: Ngày bắt đầu */}
                  <div className="bg-emerald-800/50 p-5 rounded-2xl border border-emerald-700 flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Ngày bắt đầu học:</span>
                    <span className="font-black text-xl text-white">{selectedStudent.startDate}</span>
                  </div>
                  
                  {/* Box 2: Số buổi vắng học */}
                  <div className="bg-red-900/60 p-5 rounded-2xl border border-red-500/50 space-y-3 shadow-lg transform hover:scale-[1.01] transition">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-red-200 tracking-widest">Số buổi vắng học</p>
                      <p className="text-3xl font-black text-red-400 drop-shadow-sm">{studentAnalysis.absents}</p>
                    </div>
                    {studentAnalysis.absentDates.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-red-800/50">
                        {studentAnalysis.absentDates.map(date => (
                          <span key={date} className="bg-red-950/40 text-red-300 text-[9px] font-bold px-2 py-0.5 rounded border border-red-800/30 whitespace-nowrap">
                            {date}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box 3: Số tháng đã đóng phí */}
                  <div className="bg-emerald-700/40 p-5 rounded-2xl border border-emerald-400/50 space-y-3 shadow-lg transform hover:scale-[1.01] transition">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-emerald-200 tracking-widest">Số tháng đã đóng phí</p>
                      <p className="text-3xl font-black text-emerald-300 drop-shadow-sm">{studentAnalysis.paidCount}</p>
                    </div>
                    {studentAnalysis.paidMonthsList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-800/50">
                        {studentAnalysis.paidMonthsList.map(month => (
                          <span key={month} className="bg-emerald-950/40 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded border border-emerald-800/30 whitespace-nowrap">
                            {month}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Box 4: Số tháng chưa đóng phí */}
                  <div className="bg-amber-600/40 p-5 rounded-2xl border border-amber-400/50 space-y-3 shadow-lg transform hover:scale-[1.01] transition">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-amber-200 tracking-widest">Số tháng chưa đóng</p>
                      <p className="text-3xl font-black text-amber-400 drop-shadow-sm">{studentAnalysis.unpaidCount}</p>
                    </div>
                    {studentAnalysis.unpaidMonthsList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-amber-800/50">
                        {studentAnalysis.unpaidMonthsList.map(month => (
                          <span key={month} className="bg-amber-950/40 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-800/30 whitespace-nowrap">
                            {month}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleGenerateIndividualReport}
                  className="w-full bg-white text-emerald-900 hover:bg-emerald-50 font-black py-4 rounded-2xl shadow-xl transition uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  TẠO PHIẾU CÁ NHÂN
                </button>
              </div>
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-emerald-700 rounded-3xl opacity-30">
                <p className="italic text-sm">Vui lòng chọn học sinh để xem thông tin</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Report Generation UI */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-emerald-100 shadow-xl no-print">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-emerald-900 border-opacity-50 mb-4"></div>
          <p className="text-emerald-900 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Đang phân tích dữ liệu & khởi tạo báo cáo AI...</p>
        </div>
      )}

      {reportContent && !isGenerating && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-end no-print">
             <button 
               onClick={handleDownloadPDF}
               className="bg-emerald-900 text-white font-black px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-950 transition transform active:scale-95 flex items-center gap-3 uppercase text-xs tracking-widest"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               XUẤT FILE PDF BÁO CÁO
             </button>
          </div>

          <div className="report-canvas bg-white p-12 md:p-16 rounded-[2rem] shadow-2xl border border-gray-100 min-h-[1000px] text-black">
             {/* PDF Report Header */}
             <div className="border-b-4 border-black pb-6 mb-10 flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">HỆ THỐNG QUẢN LÝ LỚP HỌC</h1>
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-600">GIÁO VIÊN: LÊ XUÂN NƯỚC</p>
                </div>
                <div className="text-right">
                  <p className="text-[10pt] font-bold">Ngày lập báo cáo: {today.toLocaleDateString('vi-VN')}</p>
                  <p className="text-[10pt] italic">Mã báo cáo: #{today.getTime()}</p>
                </div>
             </div>

             {/* AI Generated Markdown Content rendered to JSX */}
             <div className="report-content">
                {formatMarkdown(reportContent)}
             </div>

             <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center italic text-gray-400 text-[9pt]">
                <p>{COPYRIGHT}</p>
                <p>Trang 1/1</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabStatistics;
