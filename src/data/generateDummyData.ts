// src/data/generateDummyData.ts

export interface EventData {
  event_type: "send_message" | "receive_message" | "state_change";
  from?: string;
  to?: string;
  message_type?: "Vote" | "BlockPart";
  height?: number;
  round?: number;
  timestamp: number;
  node?: string;
  prev_state?: string;
  next_state?: string;
}

export function generateDummyData(): EventData[] {
  const dummyData: EventData[] = [];
  const nodes = ["N0", "N1", "N2", "N3", "N4"];
  let currentTime = 1679048123401;
  const numPairs = 150;

  for (let i = 0; i < numPairs; i++) {
    const delta = Math.floor(Math.random() * 400) + 100;
    currentTime += delta;

    const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
    let toNode = nodes[Math.floor(Math.random() * nodes.length)];
    while (toNode === fromNode) {
      toNode = nodes[Math.floor(Math.random() * nodes.length)];
    }

    const msgTypes: EventData["message_type"][] = ["Vote", "BlockPart"];
    const messageType = msgTypes[Math.floor(Math.random() * msgTypes.length)];

    const height = Math.floor(Math.random() * 11) + 10;
    const round = Math.floor(Math.random() * 5) + 1;

    // send_message
    const sendEvent: EventData = {
      event_type: "send_message",
      timestamp: currentTime,
      from: fromNode,
      to: toNode,
      message_type: messageType,
      height,
      round,
    };
    dummyData.push(sendEvent);

    // receive_message
    const recvDelay = Math.floor(Math.random() * 50) + 1;
    const receiveEvent: EventData = {
      event_type: "receive_message",
      timestamp: currentTime + recvDelay,
      from: fromNode,
      to: toNode,
      message_type: messageType,
      height,
      round,
    };
    dummyData.push(receiveEvent);

    // ~1/3 chance for a state_change event
    if (Math.random() < 0.33) {
      const stateDelay = Math.floor(Math.random() * 80) + 20;
      const stateNode = nodes[Math.floor(Math.random() * nodes.length)];
      const stateOptions = [
        { prev: "Prevote", next: "Precommit" },
        { prev: "NewRound", next: "Prevote" },
        { prev: "Precommit", next: "Commit" },
      ];
      const sc = stateOptions[Math.floor(Math.random() * stateOptions.length)];
      const stateEvent: EventData = {
        event_type: "state_change",
        timestamp: currentTime + stateDelay,
        node: stateNode,
        prev_state: sc.prev,
        next_state: sc.next,
        height,
        round,
      };
      dummyData.push(stateEvent);
    }
  }
  console.log(dummyData);
  return dummyData;
}
