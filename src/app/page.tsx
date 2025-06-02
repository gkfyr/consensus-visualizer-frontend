"use client";
import React, { useEffect, useState, useMemo } from "react";

import { generateDummyData, EventData } from "@/data/generateDummyData";
import "./globals.css";
import GraphCanvas from "@/components/GraphCanvas";

function App(): React.JSX.Element {
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      const d = generateDummyData();
      console.log("Generated data length:", d.length);
      setAllEvents(d);

      const minT = d.reduce((acc, cur) => Math.min(acc, cur.timestamp), Infinity);
      const maxT = d.reduce((acc, cur) => Math.max(acc, cur.timestamp), -Infinity);
      setStartTime(minT);
      setEndTime(maxT);
    });
  }, []);

  const filteredData = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return [];
    if (startTime == null || endTime == null) return allEvents;
    return allEvents.filter((ev) => ev.timestamp >= startTime && ev.timestamp <= endTime);
  }, [allEvents, startTime, endTime]);

  const quickRanges = [
    { label: "All", value: "ALL" },
    { label: "Last 5 seconds", value: "5sec" },
    { label: "Last 30 seconds", value: "30sec" },
    { label: "Last 1 minute", value: "60sec" },
  ];

  function handleQuickRange(val: string): void {
    if (val === "ALL") {
      const minTime = Math.min(...allEvents.map((d) => d.timestamp));
      const maxTime = Math.max(...allEvents.map((d) => d.timestamp));
      setStartTime(minTime);
      setEndTime(maxTime);
    } else if (val.endsWith("sec")) {
      const seconds = parseInt(val.replace("sec", ""), 10);
      const max = Math.max(...allEvents.map((d) => d.timestamp));
      setStartTime(max - seconds * 1000);
      setEndTime(max);
    }
  }

  function handleSetCustomRange(): void {
    const stInput = document.getElementById("startTimeInput") as HTMLInputElement;
    const enInput = document.getElementById("endTimeInput") as HTMLInputElement;
    const st = parseInt(stInput.value, 10);
    const en = parseInt(enInput.value, 10);
    if (!isNaN(st) && !isNaN(en) && st < en) {
      setStartTime(st);
      setEndTime(en);
    }
  }

  function onBrushSelect(domainStart: number, domainEnd: number): void {
    setStartTime(domainStart);
    setEndTime(domainEnd);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Consensus Visualizer</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        {quickRanges.map((r) => (
          <button
            key={r.value}
            onClick={() => handleQuickRange(r.value)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            {r.label}
          </button>
        ))}

        <div className="flex items-center gap-2">
          <label htmlFor="startTimeInput">Start (ms):</label>
          <input
            id="startTimeInput"
            type="number"
            value={startTime ?? ""}
            onChange={(e) => setStartTime(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white w-[150px]"
          />
          <label htmlFor="endTimeInput">End (ms):</label>
          <input
            id="endTimeInput"
            type="number"
            value={endTime ?? ""}
            onChange={(e) => setEndTime(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-white w-[150px]"
          />
          <button
            onClick={handleSetCustomRange}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
          >
            Set Range
          </button>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-300">
        <p>
          <span className="font-semibold">Current range:</span> {startTime} ~ {endTime}
        </p>
        <p>
          <span className="font-semibold">Filtered events:</span> {filteredData.length}
        </p>
      </div>

      <GraphCanvas data={filteredData} allData={allEvents} onBrushSelect={onBrushSelect} />
    </div>
  );
}

export default App;
