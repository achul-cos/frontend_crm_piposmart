"use client";

import React, { useState } from "react";
import { type TrainingItem } from "@/app/lib/api";
import { AnimatedListItem } from "@/app/components/motion/primitives";

interface CalendarTabProps {
  trainings: TrainingItem[];
  onSelectTraining: (training: TrainingItem) => void;
}

export default function CalendarTab({ trainings, onSelectTraining }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const days = [];
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const getEventsForDay = (day: number) => {
    if (!day) return [];
    
    // Create a YYYY-MM-DD string for comparison to avoid timezone issues
    const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return trainings.filter((t) => {
      if (!t.scheduled_at) return false;
      const tDate = new Date(t.scheduled_at);
      // Format training date to local YYYY-MM-DD
      const tDateStr = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}-${String(tDate.getDate()).padStart(2, "0")}`;
      return tDateStr === targetDateStr;
    });
  };

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 className="text-lg font-black text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition text-gray-600"
            title="Bulan Sebelumnya"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition text-sm font-bold text-gray-700"
          >
            Hari Ini
          </button>
          <button
            onClick={nextMonth}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition text-gray-600"
            title="Bulan Selanjutnya"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border-b border-gray-100">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-black uppercase text-gray-500 tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-gray-200 gap-px">
          {days.map((day, idx) => {
            const isToday =
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();
              
            const events = getEventsForDay(day || 0);

            return (
              <div
                key={idx}
                className={`min-h-[120px] bg-white p-1 transition ${!day ? "bg-gray-50/50" : "hover:bg-gray-50"} ${isToday ? "bg-blue-50/20" : ""}`}
              >
                {day && (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-between items-start mb-1 px-1">
                      <span
                        className={`text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                          isToday ? "bg-[#C92C1E] text-white" : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 mt-1 pb-1 px-0.5" style={{ maxHeight: '100px' }}>
                      {events.map((evt, evtIndex) => {
                        let bgColor = "bg-blue-100";
                        let textColor = "text-blue-700";
                        let borderLeftColor = "border-l-blue-500";

                        if (evt.status === "COMPLETED") {
                          bgColor = "bg-emerald-100";
                          textColor = "text-emerald-700";
                          borderLeftColor = "border-l-emerald-500";
                        } else if (evt.status === "CANCELED") {
                          bgColor = "bg-red-100";
                          textColor = "text-red-700";
                          borderLeftColor = "border-l-red-500";
                        } else if (evt.training_type === "ONLINE") {
                          bgColor = "bg-purple-100";
                          textColor = "text-purple-700";
                          borderLeftColor = "border-l-purple-500";
                        } else if (evt.training_type === "OFFLINE") {
                          bgColor = "bg-orange-100";
                          textColor = "text-orange-700";
                          borderLeftColor = "border-l-orange-500";
                        }

                        return (
                          <AnimatedListItem
                            key={evt.id}
                            as="div"
                            index={evtIndex}
                            className={`text-[10px] p-1 rounded border-l-2 ${borderLeftColor} ${bgColor} ${textColor} truncate cursor-pointer hover:opacity-80 transition group relative`}
                          >
                            <div
                              onClick={() => onSelectTraining(evt)}
                              title={`${formatTime(evt.scheduled_at)} - ${evt.training_type} (${evt.sales?.name})`}
                            >
                              <span className="font-bold mr-1">{formatTime(evt.scheduled_at)}</span>
                              {evt.training_type === "ONLINE" ? "Virtual" : "Praktek"}

                              {/* Simple tooltip simulation */}
                              <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[200px] p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-normal pointer-events-none">
                                <div className="font-bold border-b border-gray-700 pb-1 mb-1">
                                  {formatTime(evt.scheduled_at)} - {evt.training_type}
                                </div>
                                <div className="text-gray-300">Status: {evt.status}</div>
                                <div className="text-gray-300">Sales: {evt.sales?.name || "-"}</div>
                                {evt.location && <div className="text-gray-300">Lok: {evt.location}</div>}
                              </div>
                            </div>
                          </AnimatedListItem>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
