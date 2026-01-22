
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
    
    const paidCount = paidMonths.length;
    const unpaidCount = Math.max(0, monthsDiff - paidCount);

    return {
      scheduledUpToNow,
      absents,
      actualAttendance,
      paidCount,
      unpaidCount,
      totalMonths: monthsDiff
    };
  }, [selectedStudent, today]);

  const statsData = [
    { name: 'Đã đóng', value: tuitionStatus.paidList.length, color: '#065f46' },
    { name: 'Chưa đóng', value: tuitionStatus.unpaidThisMonth.length, color: '#b91c1c' },
    { name: 'Nợ phí', value: tuitionStatus.debtList.length, color: '#c2410c' }
  ];

  const handleGenerateGeneralReport = async () => {
    setReportType('general');
    setIsGenerating(true);
    const content = await generateTuitionReport(students);
    setReportContent(content);
    setIsGenerating(false);
  };

  const handleGenerateIndividualReport = async () => {
    if (!selectedStudent || !studentAnalysis) return;
    setReportType('individual');
    setIsGenerating(true);
    const content = await generateIndividualReport(selectedStudent, studentAnalysis);
    setReportContent(content);
    setIsGenerating(false);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black uppercase text-emerald-800 opacity-60 mb-1">Đã đóng học phí T.{currentMonth}</p>
          <p className="text-4xl font-black text-emerald-900">{tuitionStatus.paidList.length}</p>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
             {tuitionStatus.paidList.map(s => (
               <div key={s.stt} className="text-[10px] border-b border-emerald-100 pb-1 flex justify-between">
                 <span className="font-bold text-emerald-900">{s.fullName}</span>
                 <span className="opacity-60">{s.className}</span>
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
                 <span className="font-bold text-red-700">{s.fullName}</span>
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
                 <span className="font-bold text-orange-700">{s.fullName}</span>
                 <span className="opacity-60">Lớp {s.className}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 no-print">
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

        <div className="flex-1 bg-emerald-900 p-8 rounded-3xl shadow-xl space-y-6 text-white">
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
              <div className="animate-fadeIn space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Box 1: Ngày bắt đầu */}
                  <div className="bg-emerald-800/50 p-4 rounded-2xl border border-emerald-700 col-span-1 sm:col-span-2 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-emerald-400">Ngày bắt đầu:</span>
                    <span className="font-black text-lg">{selectedStudent.startDate}</span>
                  </div>
                  
                  {/* Box 2: Số buổi đã học */}
                  <div className="bg-emerald-800/50 p-4 rounded-2xl border border-emerald-700">
                    <p className="text-[9px] font-black uppercase text-emerald-400 opacity-60 mb-1">Số buổi đã học:</p>
                    <p className="text-2xl font-black text-emerald-300">{studentAnalysis.actualAttendance}</p>
                  </div>

                  {/* Box 3: Số buổi vắng học */}
                  <div className="bg-red-900/40 p-4 rounded-2xl border border-red-800/50">
                    <p className="text-[9px] font-black uppercase text-red-300 opacity-60 mb-1">Số buổi vắng học:</p>
                    <p className="text-2xl font-black text-red-400">{studentAnalysis.absents}</p>
                  </div>

                  {/* Box 4: Số tháng đã đóng phí */}
                  <div className="bg-emerald-800/50 p-4 rounded-2xl border border-emerald-700">
                    <p className="text-[9px] font-black uppercase text-emerald-400 opacity-60 mb-1">Số tháng đã đóng phí:</p>
                    <p className="text-2xl font-black text-emerald-300">{studentAnalysis.paidCount}</p>
                  </div>

                  {/* Box 5: Số tháng chưa đóng phí */}
                  <div className="bg-amber-900/40 p-4 rounded-2xl border border-amber-800/50">
                    <p className="text-[9px] font-black uppercase text-amber-300 opacity-60 mb-1">Số tháng chưa đóng phí:</p>
                    <p className="text-2xl font-black text-amber-400">{studentAnalysis.unpaidCount}</p>
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

      {isGenerating && (
        <div className="flex flex-col items-center py-20 animate-pulse no-print">
          <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
          <p className="text-emerald-900 font-black text-lg tracking-widest uppercase text-center">AI đang tổng hợp dữ liệu bảng biểu...</p>
        </div>
      )}

      {reportContent && !isGenerating && (
        <div className="bg-white border-2 border-emerald-100 rounded-[2rem] p-8 md:p-12 relative shadow-2xl overflow-hidden animate-fadeIn">
          <div className="flex justify-end gap-3 mb-8 no-print">
            <button 
              onClick={handleDownloadPDF}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition shadow-lg transform active:scale-95 uppercase"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              TẢI XUỐNG PDF (CHUẨN IN)
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-emerald-900 text-white hover:bg-black px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 transition shadow-lg transform active:scale-95 uppercase"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              MỞ HỘP THOẠI IN
            </button>
          </div>
          
          <div className="report-canvas-wrapper no-print bg-gray-100 p-8 flex flex-col items-center overflow-auto max-h-[1000px] border border-gray-300 rounded-2xl shadow-inner">
              <div className="report-canvas bg-white shadow-2xl" 
                style={{ 
                  fontFamily: '"Times New Roman", Times, serif', 
                  fontSize: '13pt', 
                  color: 'black', 
                  width: '210mm', 
                  padding: '0', 
                  boxSizing: 'border-box',
                  position: 'relative',
                  backgroundColor: 'white',
                  display: 'block'
                }}>
                <div className="text-center mb-8 border-b-2 border-black pb-4 mt-0">
                  <h1 className="text-xl font-bold uppercase mt-0 pt-2">HỆ THỐNG GIÁO DỤC LÊ XUÂN NƯỚC</h1>
                  <p className="text-[10pt] font-bold italic mt-1">{COPYRIGHT}</p>
                  <h2 className="text-2xl font-bold mt-8 uppercase decoration-1 underline underline-offset-8">
                    {reportType === 'general' ? 'BÁO CÁO THỐNG KÊ LỚP HỌC' : 'PHIẾU THEO DÕI HỌC TẬP CHI TIẾT'}
                  </h2>
                  <p className="mt-4 italic">Thời điểm lập báo cáo: {today.toLocaleDateString('vi-VN')} {today.getHours()}:{today.getMinutes()}</p>
                </div>
                
                <div className="report-body whitespace-pre-wrap leading-relaxed text-justify mb-10 overflow-hidden">
                  {formatMarkdown(reportContent)}
                </div>

                <div className="mt-20 pt-10 flex justify-between items-start">
                  <div className="text-center w-56">
                    <p className="font-bold mb-20">GIÁO VIÊN CHỦ NHIỆM</p>
                    <p className="font-bold">Lê Xuân Nước</p>
                  </div>
                  <div className="text-right w-64 text-[10pt] text-gray-400 italic">
                    <p className="mb-2 opacity-50">Báo cáo hệ thống bảo mật</p>
                    <p className="font-bold uppercase tracking-widest leading-tight">{COPYRIGHT}</p>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          #root { background: white !important; }
          .report-canvas-wrapper { padding: 0 !important; background: transparent !important; overflow: visible !important; max-height: none !important; display: block !important; }
          .report-canvas { 
            box-shadow: none !important; 
            width: 170mm !important;
            margin: 20mm !important; 
            padding: 0 !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
        .report-canvas table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-bottom: 1.5rem;
          page-break-inside: auto;
          font-family: inherit;
        }
        .report-canvas tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .report-canvas td {
          word-break: break-word;
        }
        .report-body p {
          page-break-inside: avoid;
        }
      `}</style>
    </div>
  );
};

export default TabStatistics;
