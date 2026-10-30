// Reads back the answers of a packet `announcement` made. It writes no compressed names, so this
// does not follow pointers.

function name(packet: Buffer, start: number): [string, number] {
  const labels: string[] = [];
  let offset = start;
  while (packet[offset] !== 0) {
    labels.push(
      packet.toString("utf8", offset + 1, offset + 1 + packet[offset]),
    );
    offset += 1 + packet[offset];
  }
  return [labels.join("."), offset + 1];
}

function strings(data: Buffer): string[] {
  const out: string[] = [];
  for (let offset = 0; offset < data.length; offset += 1 + data[offset])
    out.push(data.toString("utf8", offset + 1, offset + 1 + data[offset]));
  return out;
}

export function readAnswers(packet: Buffer) {
  const answers = [];
  let offset = 12;
  for (let i = 0; i < packet.readUInt16BE(6); i++) {
    const [owner, end] = name(packet, offset);
    const type = packet.readUInt16BE(end);
    const data = packet.subarray(
      end + 10,
      end + 10 + packet.readUInt16BE(end + 8),
    );
    answers.push({
      name: owner,
      type,
      flush: (packet.readUInt16BE(end + 2) & 0x8000) !== 0,
      ttl: packet.readUInt32BE(end + 4),
      data:
        type === 12
          ? name(data, 0)[0]
          : type === 33
            ? { port: data.readUInt16BE(4), target: name(data, 6)[0] }
            : type === 16
              ? strings(data)
              : [...data].join("."),
    });
    offset = end + 10 + data.length;
  }
  return answers;
}
