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
    const d = generateDummyData();
    console.log("Generated data length:", d.length);
    setAllEvents(d);

    const minT = d.reduce((acc, cur) => Math.min(acc, cur.timestamp), Infinity);
    const maxT = d.reduce((acc, cur) => Math.max(acc, cur.timestamp), -Infinity);
    setStartTime(minT);
    setEndTime(maxT);
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
    <div className="App">
      <h1>Dark Theme Consensus Visualizer (Arrows + Brush)</h1>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        {quickRanges.map((r) => (
          <button key={r.value} onClick={() => handleQuickRange(r.value)}>
            {r.label}
          </button>
        ))}

        <div style={{ marginLeft: 10 }}>
          <label>Start (ms): </label>
          <input id="startTimeInput" type="number" defaultValue={startTime ?? ""} style={{ width: 120 }} />
          <label>End (ms): </label>
          <input id="endTimeInput" type="number" defaultValue={endTime ?? ""} style={{ width: 120 }} />
          <button onClick={handleSetCustomRange}>Set Range</button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <p>
          Current range: {startTime} ~ {endTime}
        </p>
        <p>Filtered events: {filteredData.length}</p>
      </div>

      <GraphCanvas data={filteredData} allData={allEvents} onBrushSelect={onBrushSelect} />
    </div>
  );
}

export default App;
