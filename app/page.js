'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const TIME_SLOTS = [
  '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00',
  '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
  '18:00-19:00', '19:00-20:00', '20:00-21:00'
];

export default function Home() {
  const [reservations, setReservations] = useState([]);
  const [userName, setUserName] = useState('');
  const [category, setCategory] = useState('개인연습');
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchReservations();

    // 실시간 동기화 구독
    const channel = supabase
      .channel('realtime-reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReservations = async () => {
    const { data } = await supabase.from('reservations').select('*');
    if (data) setReservations(data);
  };

  const handleReserve = async (day, timeSlot) => {
    if (!userName.trim() || !pin.trim()) {
      alert('이름과 4자리 비밀번호(PIN)를 먼저 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('reservations').insert([
      { day, time_slot: timeSlot, user_name: userName, category, pin }
    ]);

    if (error) {
      if (error.code === '23505') alert('이미 예약된 시간대입니다.');
      else alert('예약 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id, targetPin) => {
    const inputPin = prompt('예약 취소를 위해 4자리 비밀번호를 입력하세요:');
    if (inputPin !== targetPin) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    await supabase.from('reservations').delete().eq('id', id);
  };

  return (
    <main className="p-4 max-w-5xl mx-auto min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        🎸 동아리방 실시간 시간표
      </h1>

      {/* 입력 영역 */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center items-center bg-gray-100 p-4 rounded-xl">
        <input
          type="text"
          placeholder="이름 (예: 박재민)"
          className="border p-2 rounded-lg text-sm outline-none"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <select
          className="border p-2 rounded-lg text-sm bg-white outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="개인연습">개인연습</option>
          <option value="멘토링">멘토링</option>
          <option value="정기공연">정기공연</option>
          <option value="합주">팀 합주</option>
        </select>
        <input
          type="password"
          maxLength={4}
          placeholder="비번 4자리"
          className="border p-2 rounded-lg text-sm w-24 outline-none"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </div>

      {/* 그리드 시간표 */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 overflow-x-auto">
        {DAYS.map((day) => (
          <div key={day} className="text-center font-bold py-2 bg-indigo-50 text-indigo-700 rounded-t-lg">
            {day}
          </div>
        ))}

        {DAYS.map((day) => (
          <div key={day} className="flex flex-col gap-1 md:gap-2">
            {TIME_SLOTS.map((slot) => {
              const reserved = reservations.find(
                (r) => r.day === day && r.time_slot === slot
              );

              return (
                <div
                  key={slot}
                  onClick={() => !reserved && handleReserve(day, slot)}
                  className={`p-2 text-xs rounded-md border min-h-[64px] flex flex-col justify-between transition ${
                    reserved
                      ? 'bg-indigo-100 border-indigo-300'
                      : 'bg-white hover:bg-green-50 cursor-pointer border-gray-200'
                  }`}
                >
                  <div className="text-[10px] text-gray-400 font-mono">{slot}</div>
                  {reserved ? (
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="font-bold text-gray-800">{reserved.user_name}</div>
                        <div className="text-[10px] text-gray-500">{reserved.category}</div>
                      </div>
                      <button
                        className="text-red-400 font-bold hover:text-red-600 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(reserved.id, reserved.pin);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-[11px]">예약하기</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}