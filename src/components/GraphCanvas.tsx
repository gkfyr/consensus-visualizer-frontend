"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";

interface EventData {
  event_type: string;
  from?: string;
  to?: string;
  message_type?: string;
  height?: number;
  round?: number;
  timestamp: number;
  node?: string;
  prev_state?: string;
  next_state?: string;
}

interface ArrowData {
  type: "arrow";
  fromNode: string;
  toNode: string;
  msgType: string;
  height: number;
  round: number;
  sendTime: number;
  recvTime: number;
}

interface StateChangePoint {
  type: "state_change";
  timestamp: number;
  node: string;
  prev_state?: string;
  next_state?: string;
}

interface GraphCanvasProps {
  data: EventData[];
  allData: EventData[];
  onBrushSelect: (start: number, end: number) => void;
}

function GraphCanvas({ data, onBrushSelect }: GraphCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const [margin] = useState({ top: 50, right: 50, bottom: 50, left: 80 });

  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const yScaleRef = useRef<d3.ScaleBand<string> | null>(null);

  const arrowDataRef = useRef<ArrowData[]>([]);
  const pointDataRef = useRef<StateChangePoint[]>([]);

  const [isBrushing, setIsBrushing] = useState(false);
  const [brushStart, setBrushStart] = useState<number | null>(null);
  const [brushEnd, setBrushEnd] = useState<number | null>(null);

  const stateAbbr: Record<string, string> = {
    Prevote: "PV",
    Precommit: "PC",
    Commit: "C",
    NewRound: "NR",
  };

  const drawAll = (highlightObj: ArrowData | StateChangePoint | null): void => {
    const canvasEl = canvasRef.current;
    const context = contextRef.current;
    if (!canvasEl || !context) return;

    const { width, height } = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width * dpr, height * dpr);

    context.translate(margin.left, margin.top);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    context.fillStyle = "#222";
    context.fillRect(0, 0, innerWidth, innerHeight);

    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    if (!xScale || !yScale) return;

    const scArr = pointDataRef.current;
    context.strokeStyle = "#444";
    context.fillStyle = "#aaa";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.font = "12px sans-serif";

    const domain = xScale.domain();
    const visibleSC = scArr.filter((sc) => sc.timestamp >= domain[0] && sc.timestamp <= domain[1]);
    visibleSC.forEach((sc) => {
      const x = xScale(sc.timestamp);
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, innerHeight);
      context.stroke();

      const prevLabel = stateAbbr[sc.prev_state ?? ""] || sc.prev_state;
      const nextLabel = stateAbbr[sc.next_state ?? ""] || sc.next_state;
      context.fillText(`${prevLabel}→${nextLabel}`, x, innerHeight + 2);
    });

    context.strokeStyle = "#555";
    context.fillStyle = "#ccc";
    context.textBaseline = "middle";
    context.textAlign = "right";

    const nodes = yScale.domain();
    nodes.forEach((nd) => {
      const yC = yScale(nd)! + yScale.bandwidth() / 2;
      context.beginPath();
      context.moveTo(0, yC);
      context.lineTo(innerWidth, yC);
      context.stroke();
      context.fillText(nd, -10, yC);
    });

    const arrowArr = arrowDataRef.current;
    arrowArr.forEach((ar) => {
      const isHighlight = highlightObj === ar;
      let arrowColor = "#65AFFF";
      if (ar.msgType === "BlockPart") arrowColor = "#6fbf6f";
      if (isHighlight) arrowColor = "#ff9800";

      context.strokeStyle = arrowColor;
      context.fillStyle = arrowColor;

      const x1 = xScale(ar.sendTime);
      const x2 = xScale(ar.recvTime);
      const y1 = yScale(ar.fromNode)! + yScale.bandwidth() / 2;
      const y2 = yScale(ar.toNode)! + yScale.bandwidth() / 2;

      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len >= 1) {
        const arrowSize = 8;
        const angle = Math.PI / 7;
        const bx = x2 - (dx / len) * arrowSize;
        const by = y2 - (dy / len) * arrowSize;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const leftX = bx + (-(dx / len) * cos + -(dy / len) * sin) * arrowSize;
        const leftY = by + ((dx / len) * sin + -(dy / len) * cos) * arrowSize;
        const rightX = bx + (-(dx / len) * cos - -(dy / len) * sin) * arrowSize;
        const rightY = by + (-(dx / len) * sin - (dy / len) * cos) * arrowSize;
        context.beginPath();
        context.moveTo(x2, y2);
        context.lineTo(leftX, leftY);
        context.lineTo(rightX, rightY);
        context.closePath();
        context.fill();
      }
    });

    scArr.forEach((pt) => {
      const isHighlight = highlightObj === pt;
      let color = "#cf6679";
      if (isHighlight) color = "#ff9800";

      const cx = xScale(pt.timestamp);
      const cy = yScale(pt.node)! + yScale.bandwidth() / 2;

      context.beginPath();
      context.arc(cx, cy, 5, 0, 2 * Math.PI);
      context.fillStyle = color;
      context.fill();
    });

    if (isBrushing && brushStart !== null && brushEnd !== null) {
      const xMin = Math.min(brushStart, brushEnd);
      const xMax = Math.max(brushStart, brushEnd);
      context.save();
      context.fillStyle = "rgba(100, 100, 255, 0.3)";
      context.fillRect(xMin, 0, xMax - xMin, innerHeight);
      context.restore();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    const mouseY = e.clientY - rect.top - margin.top;

    if (isBrushing) {
      setBrushEnd(mouseX);
      drawAll(null);
      return;
    }

    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;
    if (!xScale || !yScale) return;

    let found: ArrowData | StateChangePoint | null = null;
    let minDist = 10;

    const arrs = arrowDataRef.current;
    for (const ar of arrs) {
      const x1 = xScale(ar.sendTime);
      const x2 = xScale(ar.recvTime);
      const y1 = yScale(ar.fromNode)! + yScale.bandwidth() / 2;
      const y2 = yScale(ar.toNode)! + yScale.bandwidth() / 2;
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      let t = ((mouseX - x1) * (x2 - x1) + (mouseY - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + t * (x2 - x1);
      const cy = y1 + t * (y2 - y1);
      const dist = Math.sqrt((mouseX - cx) ** 2 + (mouseY - cy) ** 2);
      if (dist < minDist) {
        minDist = dist;
        found = ar;
      }
    }

    if (!found) {
      const scArr = pointDataRef.current;
      for (const sc of scArr) {
        const dx = mouseX - xScale(sc.timestamp);
        const dy = mouseY - (yScale(sc.node)! + yScale.bandwidth() / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          found = sc;
        }
      }
    }

    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    if (found) {
      let html = "";
      if (found.type === "arrow") {
        html = `
          <b>Message</b><br/>
          msgType: ${found.msgType}<br/>
          from: ${found.fromNode}<br/>
          to: ${found.toNode}<br/>
          sendTime: ${found.sendTime}<br/>
          recvTime: ${found.recvTime}
        `;
      } else if (found.type === "state_change") {
        html = `
          <b>StateChange</b><br/>
          node: ${found.node}<br/>
          time: ${found.timestamp}<br/>
          ${found.prev_state} → ${found.next_state}
        `;
      }
      tooltipEl.innerHTML = html;
      tooltipEl.style.left = e.clientX + 10 + "px";
      tooltipEl.style.top = e.clientY + 10 + "px";
      tooltipEl.style.visibility = "visible";
      drawAll(found);
    } else {
      tooltipEl.style.visibility = "hidden";
      drawAll(null);
    }
  };

  const handleMouseLeave = (): void => {
    if (tooltipRef.current) {
      tooltipRef.current.style.visibility = "hidden";
    }
    if (isBrushing) {
      setIsBrushing(false);
      setBrushStart(null);
      setBrushEnd(null);
    }
    drawAll(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    setIsBrushing(true);
    setBrushStart(mouseX);
    setBrushEnd(mouseX);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!isBrushing) return;
    setIsBrushing(false);

    if (brushStart !== null && brushEnd !== null && brushStart !== brushEnd) {
      const xScale = xScaleRef.current;
      const pixelMin = Math.min(brushStart, brushEnd);
      const pixelMax = Math.max(brushStart, brushEnd);
      const tMin = xScale!.invert(pixelMin);
      const tMax = xScale!.invert(pixelMax);

      if (onBrushSelect) {
        onBrushSelect(Math.floor(tMin), Math.floor(tMax));
      }
    }
    setBrushStart(null);
    setBrushEnd(null);
    drawAll(null);
  };

  const onResize = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl || !data || data.length === 0) return;

    const context = canvasEl.getContext("2d");
    if (!context) return;
    contextRef.current = context;

    const { width, height } = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;
    context.scale(dpr, dpr);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const minTime = d3.min(data, (d) => d.timestamp) ?? 0;
    const maxTime = d3.max(data, (d) => d.timestamp) ?? 0;
    const domainPadding = 50;
    const xMin = minTime - domainPadding;
    const xMax = maxTime + domainPadding;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    xScaleRef.current = xScale;

    const nodeSet = new Set<string>();
    data.forEach((d) => {
      if (d.from) nodeSet.add(d.from);
      if (d.to) nodeSet.add(d.to);
      if (d.node) nodeSet.add(d.node);
    });
    const nodes = Array.from(nodeSet).sort();
    const yScale = d3.scaleBand<string>().domain(nodes).range([0, innerHeight]).padding(0.3);
    yScaleRef.current = yScale;

    drawAll(null);
  }, [data, margin]);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [onResize]);

  useEffect(() => {
    if (!data || data.length === 0) return;
    requestAnimationFrame(() => {
      onResize();
      drawAll(null);
    });
  }, [data, onResize]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const sendEvents = data.filter((d) => d.event_type === "send_message");
    const receiveEvents = data.filter((d) => d.event_type === "receive_message");
    const stateChanges = data.filter((d) => d.event_type === "state_change");

    const arrows: ArrowData[] = [];
    sendEvents.forEach((s) => {
      const r = receiveEvents.find(
        (x) =>
          x.from === s.from &&
          x.to === s.to &&
          x.message_type === s.message_type &&
          x.height === s.height &&
          x.round === s.round &&
          x.timestamp > s.timestamp
      );
      if (r) {
        arrows.push({
          type: "arrow",
          fromNode: s.from!,
          toNode: r.to!,
          msgType: s.message_type!,
          height: s.height!,
          round: s.round!,
          sendTime: s.timestamp,
          recvTime: r.timestamp,
        });
      }
    });

    const points: StateChangePoint[] = [];
    stateChanges.forEach((e) => {
      points.push({
        type: "state_change",
        timestamp: e.timestamp,
        node: e.node!,
        prev_state: e.prev_state,
        next_state: e.next_state,
      });
    });

    arrowDataRef.current = arrows;
    pointDataRef.current = points;
  }, [data]);

  return (
    <div style={{ margin: "0 20px", position: "relative" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "600px",
          backgroundColor: "#222",
          border: "1px solid #444",
          display: "block",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          background: "#2d2d2d",
          border: "1px solid #555",
          padding: "6px 8px",
          fontSize: "13px",
          color: "#eee",
          visibility: "hidden",
          pointerEvents: "none",
          borderRadius: "4px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          transition: "opacity 0.1s ease-in-out",
        }}
      />
    </div>
  );
}

export default GraphCanvas;
